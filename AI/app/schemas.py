from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# --- Health ---
class HealthResponse(BaseModel):
    ok: bool
    model_device: str
    clip_device: str
    num_items: int
    chroma_collection: str

# --- Log / Recommend ---
class LogEvent(BaseModel):
    artworkId: str = Field(..., description="Artwork identifier (str).")
    action: str = Field("VIEW", description="Action type...")

class RecommendRequest(BaseModel):
    memberId: str
    logs: List[LogEvent]

class RecommendItem(BaseModel):
    rank: int
    artworkId: str

class RecommendResponse(BaseModel):
    memberId: str
    recommends: List[RecommendItem]

# --- Embed Artwork (Updated) ---
class EmbedImageRequest(BaseModel):
    artworkId: str
    artistId: str
    imagePath: str
    category: str

# [수정됨] 요청하신 출력 형식에 맞춘 응답 스키마
class EmbedArtworkResponse(BaseModel):
    artworkId: str
    artistId: str
    artworkVector: List[float]
    category: str

# --- Artist Info ---
class ArtistInfoRequest(BaseModel):
    artistId: str
    isUnknown: bool

class ArtistInfoResponse(BaseModel):
    ok: bool
    artistId: str
    error: Optional[str] = None