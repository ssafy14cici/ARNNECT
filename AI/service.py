from __future__ import annotations

import json
from typing import Any, Dict

import bentoml
from bentoml.io import JSON as BentoJSON
from pydantic import Field, ValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from PIL.Image import Image as PILImage

from app.config import ServiceConfig
from app.schemas import (
    HealthResponse,
    EmbedArtworkResponse,
    RecommendEnvelope,
    RecommendRequest,
    RecommendResponse,
    RecommendItem,
)
from app.clip_embedder import ClipImageEmbedder
from app.chroma_store import ChromaStore
from app.mapping_store import MappingStore
from app.item_vector_table import ItemVectorTable
from app.recommender import Recommender


class AutoWrapMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # ✅ recommend는 함수에서 언랩하므로 굳이 건드릴 필요 없음 (혼선 방지)
        if request.url.path == "/recommend":
            return await call_next(request)

        if request.method == "POST":
            ctype = request.headers.get("content-type", "")
            if ctype.startswith("application/json"):
                body = await request.body()
                if body:
                    try:
                        data = json.loads(body)
                        if isinstance(data, dict) and "inputData" not in data:
                            request._body = json.dumps({"inputData": data}).encode("utf-8")
                    except Exception:
                        pass
        return await call_next(request)


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
        self.chroma = ChromaStore(persist_dir=self.cfg.chroma_dir, collection="artworkMetaData")
        self.artist_chroma = ChromaStore(persist_dir=self.cfg.chroma_dir, collection="artists")

        item_table_path = self.cfg.artifacts_dir / "item_vectors.bin"
        self.item_table = ItemVectorTable(path=item_table_path, num_items=self.cfg.num_items, dim=self.cfg.d_model)

        self.clip = ClipImageEmbedder(model_name=self.cfg.clip_model_name, device=self.cfg.device)
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

    @bentoml.api(route="/health")
    def health(self) -> HealthResponse:
        return HealthResponse(
            ok=True,
            model_device=str(self.cfg.device),
            clip_device=str(self.cfg.device),
            num_items=self.cfg.num_items,
            chroma_collection="artworkMetaData",
        )

    @bentoml.api(route="/embed_artwork")
    def embed_artwork(
        self,
        image: PILImage,
        artworkId: str = Field(...),
        artistId: str = Field(...),
        category: str = Field(...),
    ) -> EmbedArtworkResponse:
        vec = self.clip.encode(image)
        idx, _is_new = self.mapping.get_or_add(artworkId)
        self.chroma.upsert(artwork_id=artworkId, embedding=vec, metadata={"artistId": artistId, "category": category})
        self.item_table.upsert(idx, vec)

        return EmbedArtworkResponse(
            artworkId=artworkId,
            artistId=artistId,
            artworkVector=vec.reshape(-1).tolist(),
            category=category,
        )

    # ✅ 핵심: BentoJSON으로 dict 입력 강제 + inputData/루트 둘 다 처리
    @bentoml.api(
        route="/recommend",
        input_spec=RecommendEnvelope,     # ✅ BentoML SDK 스타일
        output_spec=RecommendResponse,    # ✅
    )
    def recommend(self, req: RecommendEnvelope) -> RecommendResponse:
        # req.inputData는 항상 채워진 상태(validator에서 보장)
        core = req.inputData

        logs_list = [{"artworkId": log.artworkId, "action": log.action} for log in core.logs]

        result = self.recommender.recommend(
            member_id=core.memberId,
            logs=logs_list,
            topk=50,
        )

        out_items = [
            RecommendItem(rank=r["rank"], artworkId=str(r["artworkId"]))
            for r in result.recommends
        ]
        return RecommendResponse(memberId=core.memberId, recommends=out_items)


RecoService.add_asgi_middleware(AutoWrapMiddleware)
