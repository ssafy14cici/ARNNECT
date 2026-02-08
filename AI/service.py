from __future__ import annotations

import typing as t
from typing import Dict, Any
from PIL.Image import Image as PILImage

import bentoml
from pydantic import Field

from app.config import ServiceConfig
from app.schemas import (
    HealthResponse,
    EmbedArtworkResponse,
    RecommendResponse,
    RecommendItem,
    RecommendRequest,
)

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
        
        mapped_num_items = int(max(self.mapping.index_to_piece.keys(), default=0)) + 1
        self.chroma = ChromaStore(persist_dir=self.cfg.chroma_dir, collection="artworkMetaData")
        self.artist_chroma = ChromaStore(persist_dir=self.cfg.chroma_dir, collection="artistMetaData")

        print("[DEBUG_CFG] chroma_dir=", self.cfg.chroma_dir)
        print("[DEBUG_ARTWORK] count=", self.chroma.count())
        print("[DEBUG_ARTIST] count=", self.artist_chroma.count())
        
        CLIP_VECTOR_DIM = 512
        
        item_table_path = self.cfg.artifacts_dir / "item_vectors.bin"
        self.item_table = ItemVectorTable(
            path=item_table_path,
            num_items=mapped_num_items,   # cfg.num_items 말고 mapping 기반으로
            dim=CLIP_VECTOR_DIM
        )

        self.clip = ClipImageEmbedder(model_name=self.cfg.clip_model_name, device=self.cfg.device)
        
        self.recommender = Recommender(
            device=self.cfg.device,
            num_items=mapped_num_items,
            max_len=self.cfg.max_len,
            d_model=self.cfg.d_model,
            n_heads=self.cfg.n_heads,
            n_layers=self.cfg.n_layers,
            ff_dim=self.cfg.ff_dim,
            dropout=self.cfg.dropout,
            num_actions=self.cfg.num_actions,
            mapping=self.mapping,
            chroma=self.chroma,
            artist_chroma=self.artist_chroma,
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
        artworkId: int = Field(...),
        artistId: int = Field(...),
        category: int = Field(...),
    ) -> EmbedArtworkResponse:
        """
        새로운 작품을 등록하고 벡터를 저장합니다.
        입력 ID들은 Long(int) 타입입니다.
        """
        vec = self.clip.encode(image)

        # 0) mapping에 등록 (새 idx면 is_new=True)
        idx, is_new = self.mapping.get_or_add(artworkId)

        # ✅ 1) 새 작품이면 item table 용량 확보 (idx가 들어갈 수 있게)
        if is_new:
            self.item_table.ensure_capacity(idx + 1)

        # 2) 메타데이터 DB 저장 (Chroma id는 str)
        self.chroma.upsert(
            artwork_id=str(artworkId),
            embedding=vec,
            metadata={
                "artistId": artistId,
                "category": category,
            },
        )

        # ✅ 3) 벡터 테이블 저장 (idx는 내부 인덱스)
        self.item_table.upsert(idx, vec)

        # (선택) 즉시 추천 반영용 캐시 갱신 훅이 있다면 호출
        try:
            self.recommender.refresh_item_cache_if_needed()
        except Exception:
            pass

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
        # 1. 입력 데이터 변환
        # Pydantic Model이 이미 int형으로 파싱을 완료했습니다.
        logs_list = [
            {"artworkId": log.artworkId, "action": log.action} 
            for log in inputData.logs
        ]

        # 2. 추천 로직 실행
        result = self.recommender.recommend(
            member_id=inputData.memberId, # int
            logs=logs_list,
            topk=500,
        )

        # 3. 결과 포맷 변환
        out_items = [
            RecommendItem(rank=r["rank"], artworkId=r["artworkId"]) # int
            for r in result.recommends
        ]
        
        return RecommendResponse(memberId=inputData.memberId, recommends=out_items)