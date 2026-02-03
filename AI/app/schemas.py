# app/schemas.py
from __future__ import annotations
from typing import List, Optional, Any
from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------
# ✅ 1. Health Check 응답 스펙 (누락되었던 부분 추가)
# ---------------------------------------------------------
class HealthResponse(BaseModel):
    ok: bool
    model_device: str
    clip_device: str
    num_items: int
    chroma_collection: str

# ---------------------------------------------------------
# ✅ 2. Embed Artwork 응답 스펙 (누락되었던 부분 추가)
# ---------------------------------------------------------
class EmbedArtworkResponse(BaseModel):
    artworkId: str
    artistId: str
    artworkVector: List[float] # 벡터는 float 리스트
    category: str

# ---------------------------------------------------------
# 3. 추천 로직 관련 스펙
# ---------------------------------------------------------
class LogEvent(BaseModel):
    artworkId: str = Field(..., description="Artwork identifier")
    action: str = Field("VIEW", description="Action type (VIEW, LIKE, etc.)")

class RecommendRequest(BaseModel):
    memberId: str
    logs: List[LogEvent]

class RecommendItem(BaseModel):
    rank: int
    artworkId: str

class RecommendResponse(BaseModel):
    memberId: str
    recommends: List[RecommendItem]

# ✅ 4. 유연한 입력을 위한 Envelope (Wrapper)
# inputData로 감싸져 오거나, memberId/logs가 바로 오거나 둘 다 처리
class RecommendEnvelope(BaseModel):
    # Case A: { "inputData": { "memberId": "...", "logs": [...] } }
    inputData: Optional[RecommendRequest] = None

    # Case B: { "memberId": "...", "logs": [...] }
    memberId: Optional[str] = None
    logs: Optional[List[LogEvent]] = None

    @model_validator(mode="after")
    def _normalize(self):
        # 이미 inputData 형태로 잘 들어왔으면 패스
        if self.inputData is not None:
            return self

        # 루트 레벨(Flat)로 들어왔다면 inputData 구조로 변환하여 내부적으로 통일
        if self.memberId is not None and self.logs is not None:
            self.inputData = RecommendRequest(memberId=self.memberId, logs=self.logs)
            return self

        # 둘 다 아니면 에러
        raise ValueError("Request body must contain either 'inputData' or ('memberId' and 'logs').")