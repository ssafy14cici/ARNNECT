from __future__ import annotations

from typing import Any, Dict
import bentoml
import numpy as np
import json
from pydantic import ValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import ServiceConfig
from app.schemas import (
    HealthResponse,
    EmbedImageRequest,
    EmbedArtworkResponse,  # 새로 만든 스키마 임포트
    ArtistInfoRequest,
    ArtistInfoResponse,
    RecommendRequest,
    RecommendResponse,
    RecommendItem,
)
from app.clip_embedder import ClipImageEmbedder
from app.chroma_store import ChromaStore
from app.mapping_store import MappingStore
from app.item_vector_table import ItemVectorTable
from app.recommender import Recommender


# -------------------------
# Auto-wrap Middleware
# -------------------------
class AutoWrapMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST" and request.headers.get("content-type") == "application/json":
            body = await request.body()
            if body:
                try:
                    data = json.loads(body)
                    if isinstance(data, dict) and "inputData" not in data:
                        wrapped = {"inputData": data}
                        request._body = json.dumps(wrapped).encode()
                except:
                    pass
        
        response = await call_next(request)
        return response


@bentoml.service(
    name="reco_service",
    resources={"cpu": "2"},
    traffic={"timeout": 300},
)
class RecoService:
    def __init__(self) -> None:
        self.cfg = ServiceConfig()

        self.mapping = MappingStore(
            piece_to_index_path=self.cfg.piece_to_index_path,
            index_to_piece_path=self.cfg.index_to_piece_path,
        )
        
        # [수정됨] ChromaDB 컬렉션 이름을 'artworkMetaData'로 설정
        self.chroma = ChromaStore(
            persist_dir=self.cfg.chroma_dir,
            collection="artworkMetaData",
        )
        
        self.artist_chroma = ChromaStore(
            persist_dir=self.cfg.chroma_dir,
            collection="artists",
        )

        item_table_path = self.cfg.artifacts_dir / "item_vectors.bin"
        self.item_table = ItemVectorTable(
            path=item_table_path,
            num_items=self.cfg.num_items,
            dim=self.cfg.d_model,
        )

        self.clip = ClipImageEmbedder(
            model_name=self.cfg.clip_model_name,
            device=self.cfg.device,
        )

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

    @bentoml.mount_asgi_app(AutoWrapMiddleware)
    def add_middleware(self):
        pass

    @bentoml.api(route="/health")
    def health(self) -> HealthResponse:
        return HealthResponse(
            ok=True,
            model_device=self.cfg.device,
            clip_device=self.cfg.device,
            num_items=self.cfg.num_items,
            chroma_collection="artworkMetaData", # 상태 확인용 정보도 업데이트
        )

    # -------------------------
    # [수정됨] /embed_artwork
    # -------------------------
    @bentoml.api(route="/embed_artwork")
    def embed_artwork(self, inputData: Dict[str, Any]) -> EmbedArtworkResponse:
        # 1. 입력 검증
        try:
            req = EmbedImageRequest.model_validate(inputData)
        except ValidationError as e:
            raise bentoml.exceptions.InvalidArgument(f"Invalid request format: {e}")

        # 2. 이미지 벡터 생성 (Numpy Array)
        try:
            vec = self.clip.embed_image_path(req.imagePath)
        except Exception as e:
            raise bentoml.exceptions.BentoMLException(f"Image load error: {e}")

        # 3. 매핑 업데이트
        try:
            idx, is_new = self.mapping.get_or_add(req.artworkId)
        except Exception as e:
            raise bentoml.exceptions.BentoMLException(f"Mapping error: {e}")

        # 4. ChromaDB 저장
        metadata = {
            "artistId": req.artistId,
            "category": req.category
        }
        try:
            # [수정] 여기서는 vec(Numpy Array)를 그대로 넘겨줍니다. 
            # ChromaStore 내부에서 알아서 변환하도록 되어 있습니다.
            self.chroma.upsert(
                artwork_id=req.artworkId,
                embedding=vec, 
                metadata=metadata,
            )
        except Exception as e:
            raise bentoml.exceptions.BentoMLException(f"Chroma upsert error: {e}")

        # 5. ItemVectorTable 업데이트
        try:
            # [수정] 여기도 Numpy Array 그대로 사용
            self.item_table.upsert(idx, vec)
        except Exception:
            pass

        # 6. 응답 반환
        return EmbedArtworkResponse(
            artworkId=req.artworkId,
            artistId=req.artistId,
            # [수정] 응답 내보낼 때만 1차원 리스트로 변환
            artworkVector=vec.reshape(-1).tolist(),
            category=req.category
        )
    
    @bentoml.api(route="/isUnknown")
    def is_unknown(self, inputData: Dict[str, Any]) -> ArtistInfoResponse:
        try:
            req = ArtistInfoRequest.model_validate(inputData)
        except (ValidationError, TypeError) as e:
            aid = inputData.get("artistId", "UNKNOWN")
            return ArtistInfoResponse(ok=False, artistId=str(aid), error=f"Bad request: {e}")

        dummy_vec = np.zeros(self.cfg.d_model, dtype=np.float32)
        metadata = {"isUnknown": req.isUnknown}

        try:
            self.artist_chroma.upsert(
                artwork_id=req.artistId,
                embedding=dummy_vec,
                metadata=metadata,
            )
        except Exception as e:
            return ArtistInfoResponse(ok=False, artistId=req.artistId, error=f"Error: {e}")

        return ArtistInfoResponse(ok=True, artistId=req.artistId)

    @bentoml.api(route="/recommend")
    def recommend(self, inputData: Dict[str, Any]) -> RecommendResponse:
        try:
            req = RecommendRequest.model_validate(inputData)
        except (ValidationError, TypeError) as e:
            mid = inputData.get("memberId", "UNKNOWN")
            return RecommendResponse(memberId=str(mid), recommends=[])

        logs_list = [{"artworkId": log.artworkId, "action": log.action} for log in req.logs]

        result = self.recommender.recommend(
            member_id=req.memberId,
            logs=logs_list,
            topk=50,
        )

        out_items = [
            RecommendItem(rank=r["rank"], artworkId=str(r["artworkId"]))
            for r in result.recommends
        ]

        return RecommendResponse(memberId=req.memberId, recommends=out_items)