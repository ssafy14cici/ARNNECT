# app/schemas.py
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator

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

# ✅ 추가: inputData 래핑/비래핑 둘 다 받는 입력 스펙
class RecommendEnvelope(BaseModel):
    # 1) 래핑된 형태
    inputData: Optional[RecommendRequest] = None

    # 2) 루트 형태
    memberId: Optional[str] = None
    logs: Optional[List[LogEvent]] = None

    @model_validator(mode="after")
    def _normalize(self):
        # inputData가 이미 있으면 OK
        if self.inputData is not None:
            return self

        # 루트 형태로 들어온 경우 -> inputData로 변환
        if self.memberId is not None and self.logs is not None:
            self.inputData = RecommendRequest(memberId=self.memberId, logs=self.logs)
            return self

        # 둘 다 아니면 입력 불완전
        raise ValueError("Either inputData or (memberId and logs) must be provided.")
