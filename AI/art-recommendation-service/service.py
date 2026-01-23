import sys
import os
import bentoml
from PIL import Image
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field # [추가됨] 입력 검증용

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.CLiP_embedded import ArtworkEmbedder
from src.Recommend import ArtRecommender

# [추가됨] 입력 데이터 형식을 미리 정의합니다.
class RecommendRequest(BaseModel):
    member_id: Optional[str] = None
    history: Optional[List[str]] = None
    topk: int = 10

@bentoml.service(
    name="art_recommender_service",
    traffic={"timeout": 60}
)
class ArtService:
    def __init__(self):
        print("[Service] Initializing models...")
        self.embedder = ArtworkEmbedder()
        self.recommender = ArtRecommender()
        print("[Service] Models loaded successfully.")

    @bentoml.api
    def embed_artwork(self, img: Image.Image) -> Dict[str, List[float]]:
        vector = self.embedder.encode_image(img)
        return {"vector": vector}

    # [수정됨] Pydantic 모델(RecommendRequest)을 인자로 받습니다.
    # [수정됨] Pydantic 모델 대신, 인자를 직접 나열합니다.
    # 이렇게 하면 JSON을 {"input_data": ...} 로 감쌀 필요가 없어집니다.
    @bentoml.api
    def recommend(
        self, 
        member_id: Optional[str] = None, 
        history: Optional[List[str]] = None, 
        topk: int = 10
    ) -> Dict[str, Any]:
        
        # 추천 엔진 실행
        results, status, history_len = self.recommender.recommend(
            member_id=member_id, 
            history_list=history, 
            topk=topk
        )
        
        return {
            "member_id": member_id if member_id else "anonymous",
            "recommendations": results,
            "debug_info": {
                "status": status,
                "history_found_length": history_len
            }
        }