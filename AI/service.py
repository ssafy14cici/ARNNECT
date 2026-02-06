from __future__ import annotations

import typing as t
from typing import Dict, Any
from PIL.Image import Image as PILImage

import bentoml
from pydantic import Field

# 설정 및 스키마 임포트
from app.config import ServiceConfig
from app.schemas import (
    HealthResponse,
    EmbedArtworkResponse,
    RecommendResponse,
    RecommendItem,
    RecommendRequest,
)

# 내부 모듈 임포트
from app.clip_embedder import ClipImageEmbedder
from app.chroma_store import ChromaStore
from app.mapping_store import MappingStore
from app.item_vector_table import ItemVectorTable
from app.recommender import Recommender


@bentoml.service(
    name="reco_service",
    resources={"cpu": "2", "gpu": 1},
    traffic={"timeout": 300},
)
class RecoService:
    def __init__(self) -> None:
        self.cfg = ServiceConfig()
        
        self.mapping = MappingStore(
            piece_to_index_path=self.cfg.piece_to_index_path,
            index_to_piece_path=self.cfg.index_to_piece_path,
        )
        
        # 메타데이터 저장용 ChromaDB
        self.chroma = ChromaStore(persist_dir=self.cfg.chroma_dir, collection="artworkMetaData")
        self.artist_chroma = ChromaStore(persist_dir=self.cfg.chroma_dir, collection="artists")

        # [🚨 핵심 수정] 
        # ItemVectorTable의 차원은 SASRec의 d_model(가변)이 아니라, 
        # CLIP 모델의 출력 차원인 512(고정)로 설정해야 안전합니다.
        CLIP_VECTOR_DIM = 512
        
        item_table_path = self.cfg.artifacts_dir / "item_vectors.bin"
        self.item_table = ItemVectorTable(
            path=item_table_path, 
            num_items=self.cfg.num_items, 
            dim=CLIP_VECTOR_DIM  # 기존 self.cfg.d_model -> 512로 변경
        )

        self.clip = ClipImageEmbedder(model_name=self.cfg.clip_model_name, device=self.cfg.device)
        
        # Recommender 초기화
        self.recommender = Recommender(
            device=self.cfg.device,
            num_items=self.cfg.num_items,
            max_len=self.cfg.max_len,
            d_model=self.cfg.d_model,
            n_heads=self.cfg.n_heads,
            n_layers=self.cfg.n_layers,
            ff_dim=self.cfg.ff_dim,
            dropout=self.cfg.dropout,
            num_actions=self.cfg.num_actions,
            mapping=self.mapping,
            chroma=self.chroma,
            item_table=self.item_table,
            sasrec_ckpt_path=self.cfg.sasrec_ckpt,
            twotower_ckpt_path=self.cfg.twotower_ckpt,
        )

    # -------------------------------------------------------
    # API 1: Health Check
    # -------------------------------------------------------
    @bentoml.api(route="/health")
    def health(self) -> HealthResponse:
        return HealthResponse(
            ok=True,
            model_device=str(self.cfg.device),
            clip_device=str(self.cfg.device),
            num_items=self.cfg.num_items,
            chroma_collection="artworkMetaData",
        )

    # -------------------------------------------------------
    # API 2: Artwork Embedding
    # -------------------------------------------------------
    @bentoml.api(route="/embed_artwork")
    def embed_artwork(
        self,
        image: PILImage,
        artworkId: str = Field(...),
        artistId: str = Field(...),
        category: str = Field(...),
    ) -> EmbedArtworkResponse:
        """
        새로운 작품을 등록하고 벡터를 저장합니다.
        (주의: 추천 시스템의 GPU 캐시에는 서비스 재시작 후에 반영될 수 있습니다)
        """
        vec = self.clip.encode(image)
        
        idx, _is_new = self.mapping.get_or_add(artworkId)
        
        # 1. 메타데이터 DB 저장
        self.chroma.upsert(
            artwork_id=artworkId, 
            embedding=vec, 
            metadata={"artistId": artistId, "category": category}
        )
        
        # 2. 벡터 테이블 저장
        self.item_table.upsert(idx, vec)

        return EmbedArtworkResponse(
            artworkId=artworkId,
            artistId=artistId,
            artworkVector=vec.reshape(-1).tolist(),
            category=category,
        )

    # -------------------------------------------------------
    # API 3: Recommend
    # -------------------------------------------------------
    @bentoml.api(route="/recommend")
    def recommend(self, inputData: RecommendRequest) -> RecommendResponse:
        """
        유저 로그 기반 추천 API
        """
        # 1. 입력 데이터 변환 (Pydantic Model -> List[Dict])
        logs_list = [
            {"artworkId": log.artworkId, "action": log.action} 
            for log in inputData.logs
        ]

        # 2. 추천 로직 실행 (Recommender 위임)
        result = self.recommender.recommend(
            member_id=inputData.memberId,
            logs=logs_list,
            topk=50,
        )

        # 3. 결과 포맷 변환 (Dict -> Pydantic Model)
        out_items = [
            RecommendItem(rank=r["rank"], artworkId=str(r["artworkId"]))
            for r in result.recommends
        ]
        
        return RecommendResponse(memberId=inputData.memberId, recommends=out_items)