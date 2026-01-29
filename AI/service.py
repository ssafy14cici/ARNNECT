import bentoml
import torch
import torch.nn.functional as F
import numpy as np
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from PIL import Image

# model_defs.py 에서 정의한 클래스들 임포트
from model_defs import VectorSASRec, TwoTowerAlign, ACT2IDX, ACTION_SET, load_item_vectors, ArtworkEmbedder

# 경로 설정
DATA_PATH = Path("data/artwork_vector.json")
SAS_CKPT = Path("checkpoints/BEST_SASRec_model.pth")
TT_CKPT = Path("checkpoints/BEST_BestRecommend_model.pth")

# --- 입력 데이터 정의 (Pydantic) ---

# 1. 추천 API용 입력 정의
class LogItem(BaseModel):
    artwork_id: str
    timestamp: str

class UserInput(BaseModel):
    member_id: str
    timestamp: List[LogItem]

# 2. [수정] 임베딩 API용 입력 정의 (이미지 경로를 문자열로 받음)
class EmbedInput(BaseModel):
    image_path: str               # 이미지 파일의 절대 경로 또는 상대 경로
    description: Optional[str] = "" # (선택) 텍스트 설명

# --------------------------------

@bentoml.service(
    resources={"cpu": "2"},
    traffic={"timeout": 60}
)
class RecommenderService:
    def __init__(self):
        # 1. 디바이스 설정
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Service running on: {self.device}")

        # 2. 아이템 벡터 로드
        self.item_mat, self.a2i, self.i2a = load_item_vectors(DATA_PATH, expected_dim=512)
        self.item_mat = self.item_mat.to(self.device)

        # 3. 추천 모델 초기화 (num_actions=7)
        self.sas_model = VectorSASRec(
            clip_dim=512, hidden_dim=512, num_actions=7, 
            n_layers=2, n_heads=4, dropout=0.1, maxlen=200
        ).to(self.device)
        self.tt_model = TwoTowerAlign(dim=512, dropout=0.1).to(self.device)

        # 4. 체크포인트 로드
        print("Loading checkpoints...")
        sas_sd = torch.load(SAS_CKPT, map_location=self.device)
        if "state_dict" in sas_sd: sas_sd = sas_sd["state_dict"]
        self.sas_model.load_state_dict(sas_sd, strict=False)

        tt_sd = torch.load(TT_CKPT, map_location=self.device)
        if "two_tower_state_dict" in tt_sd: tt_sd = tt_sd["two_tower_state_dict"]
        self.tt_model.load_state_dict(tt_sd, strict=False)

        self.sas_model.eval()
        self.tt_model.eval()

        # 5. 아이템 임베딩 미리 계산
        with torch.no_grad():
            item_base_emb = self.sas_model.item_base(self.item_mat)
            self.item_final = F.normalize(self.tt_model.item_proj(item_base_emb), dim=-1)

        # 6. Artwork Embedder (OpenCLIP) 초기화
        self.embedder = ArtworkEmbedder(self.device)
        
        print("All models initialized successfully.")

    @bentoml.api
    def recommend(self, input_data: UserInput) -> Dict[str, Any]:
        """추천 API"""
        user_log = input_data.model_dump()
        maxlen = 200
        member_id = user_log.get("member_id", "unknown")
        actions = user_log.get("timestamp", [])

        seq_items = []
        seq_acts = []
        valid_cnt = 0

        for act in actions:
            aid = act.get("artwork_id")
            atype = act.get("timestamp")
            
            if aid not in self.a2i: continue
            if atype not in ACTION_SET: continue
                
            idx = self.a2i[aid]
            aidx = ACT2IDX[atype]
            
            seq_items.append(self.item_mat[idx])
            seq_acts.append(aidx)
            valid_cnt += 1
            if valid_cnt >= maxlen: break
        
        if valid_cnt == 0:
            return {"member_id": member_id, "recommendations": []}

        seq_items_tensor = torch.stack(seq_items).unsqueeze(0).to(self.device)
        seq_acts_tensor = torch.tensor(seq_acts, dtype=torch.long).unsqueeze(0).to(self.device)
        valid_len_tensor = torch.tensor([valid_cnt], dtype=torch.long).to(self.device)

        with torch.no_grad():
            user_emb = self.sas_model(seq_items_tensor, seq_acts_tensor, valid_len_tensor)
            user_final = self.tt_model.user_proj(user_emb)
            user_final = F.normalize(user_final, dim=-1)
            scores = (user_final @ self.item_final.t()).squeeze(0)
            
            k = 10
            topk_scores, topk_indices = torch.topk(scores, k=k)
            topk_indices = topk_indices.cpu().numpy()
            topk_scores = topk_scores.cpu().numpy()

        results = []
        for rank, idx in enumerate(topk_indices):
            if idx == 0: continue
            results.append({
                "rank": rank + 1,
                "artwork_id": self.i2a[idx],
                "score": float(topk_scores[rank])
            })

        return {"member_id": member_id, "recommendations": results}

    @bentoml.api
    def embed_artwork(self, input_data: EmbedInput) -> Dict[str, Any]:
        """
        이미지 파일 경로를 입력받아 벡터를 반환하는 API
        description은 선택사항.
        """
        image_path = input_data.image_path
        description = input_data.description
        
        # 1. 파일 존재 여부 확인
        if not os.path.exists(image_path):
            # BentoML 예외 처리 또는 딕셔너리 반환
            return {"error": f"File not found: {image_path}"}
        
        try:
            # 2. 이미지 로드 (PIL)
            image = Image.open(image_path).convert("RGB")
        except Exception as e:
            return {"error": f"Failed to open image: {str(e)}"}
            
        # 3. 임베딩 생성
        vector = self.embedder.encode(image, description)
        
        return {
            "image_path": image_path,
            "vector": vector,
            "dim": len(vector)
        }