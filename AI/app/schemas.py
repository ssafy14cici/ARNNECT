# app/schemas.py
from __future__ import annotations
from typing import List, Optional, Any
from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------
# API 1: Health Check
# ---------------------------------------------------------
class HealthResponse(BaseModel):
    ok: bool
    model_device: str
    clip_device: str
    num_items: int
    chroma_collection: str

# ---------------------------------------------------------
# API 2: Embed Artwork Response
# ---------------------------------------------------------
class EmbedArtworkResponse(BaseModel):
    # [수정] String -> int (Long)
    artworkId: int
    artistId: int
    category: int
    artworkVector: List[float]

# ---------------------------------------------------------
# 3. 추천 로직 관련 스펙
# ---------------------------------------------------------
class LogEvent(BaseModel):
    # [수정] String -> int
    artworkId: int = Field(..., description="Artwork identifier (Long/Int)")
    action: str = Field("VIEW", description="Action type (VIEW, LIKE, etc.)")

class RecommendRequest(BaseModel):
    # [수정] String -> int
    memberId: int
    logs: List[LogEvent]

class RecommendItem(BaseModel):
    rank: int
    # [수정] String -> int
    artworkId: int

class RecommendResponse(BaseModel):
    # [수정] String -> int
    memberId: int
    recommends: List[RecommendItem]

# 4. 유연한 입력을 위한 Envelope
class RecommendEnvelope(BaseModel):
    inputData: Optional[RecommendRequest] = None
    
    # [수정] String -> int
    memberId: Optional[int] = None
    logs: Optional[List[LogEvent]] = None

    @model_validator(mode="after")
    def _normalize(self):
        if self.inputData is not None:
            return self

        if self.memberId is not None and self.logs is not None:
            self.inputData = RecommendRequest(memberId=self.memberId, logs=self.logs)
            return self

        raise ValueError("Request body must contain either 'inputData' or ('memberId' and 'logs').")