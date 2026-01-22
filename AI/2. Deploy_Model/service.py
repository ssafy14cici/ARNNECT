import bentoml
import torch
import json
import numpy as np
from pathlib import Path
from collections import defaultdict
from model_defs import FeatureSASRec, TwoTowerAlign

# -------------------------------------
# 설정
# -------------------------------------
MAXLEN = 50
HIDDEN = 512
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# -------------------------------------
# 데이터 로드 헬퍼 함수
# -------------------------------------
def load_clip_matrix(clip_vec_json):
    with open(clip_vec_json, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    id2vec = {}
    for item in data:
        aid = item.get("artwork_id") or item.get("item_id")
        vec = item.get("artwork_vector")
        if aid and vec:
            id2vec[aid] = vec

    artwork2idx = {"<PAD>": 0}
    idx2artwork = {0: "<PAD>"}
    matrix_list = [np.zeros(512, dtype=np.float32)]

    for aid, vec in id2vec.items():
        curr_idx = len(artwork2idx)
        artwork2idx[aid] = curr_idx
        idx2artwork[curr_idx] = aid
        matrix_list.append(np.array(vec, dtype=np.float32))

    item_mat = torch.tensor(np.stack(matrix_list), dtype=torch.float32)
    # 정규화
    item_mat = item_mat / (item_mat.norm(dim=-1, keepdim=True) + 1e-12)
    return artwork2idx, idx2artwork, item_mat

def load_logs(log_path, artwork2idx):
    user_seq = defaultdict(list)
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            logs = json.load(f)
        for r in logs:
            uid = r.get("user_id")
            aid = r.get("artwork_id")
            if uid and aid and aid in artwork2idx:
                user_seq[uid].append(artwork2idx[aid])
    except Exception as e:
        print(f"Warning: Failed to load logs ({e}). Starting empty.")
    return user_seq

# -------------------------------------
# BentoML 서비스 정의
# -------------------------------------
@bentoml.service(
    name="artwork_recommender",
    resources={"gpu": 1} if torch.cuda.is_available() else None
)
class ArtRecommender:
    def __init__(self):
        # 1. Load Data
        print(">>> Loading Data...")
        self.artwork2idx, self.idx2artwork, self.item_mat = load_clip_matrix("data/artwork_vector.json")
        self.item_mat = self.item_mat.to(DEVICE)
        
        # 2. Load Models
        print(">>> Loading Models...")
        self.sas_model = FeatureSASRec(self.item_mat, hidden_dim=HIDDEN).to(DEVICE)
        self.tt_model = TwoTowerAlign(dim=HIDDEN).to(DEVICE)

        # Load Weights (가중치 로드 시 strict=False 주의, 학습된 파일 사용 권장)
        sas_ckpt = torch.load("checkpoints/BEST_SASRec_model.pth", map_location=DEVICE)
        # 키 불일치 방지 로직 (FeatureSASRec 구조에 맞춤)
        sas_state = sas_ckpt['state_dict'] if 'state_dict' in sas_ckpt else sas_ckpt
        new_sas_state = {k: v for k, v in sas_state.items() if "item_vectors" not in k}
        self.sas_model.load_state_dict(new_sas_state, strict=False)
        self.sas_model.eval()

        tt_ckpt = torch.load("checkpoints/Best_UserRecommend_model.pth", map_location=DEVICE)
        tt_state = tt_ckpt["two_tower_state_dict"] if "two_tower_state_dict" in tt_ckpt else tt_ckpt
        self.tt_model.load_state_dict(tt_state)
        self.tt_model.eval()

        # 3. Load Logs (메모리에 캐싱)
        self.user_seq = load_logs("data/test_user_logs.json", self.artwork2idx)
        
        # 4. 아이템 임베딩 미리 계산 (속도 최적화)
        with torch.no_grad():
            self.all_items_emb = self.tt_model.predict_item(self.item_mat)

    @bentoml.api
    def recommend(self, user_id: str, topk: int = 5) -> dict:
        """
        API 입력 예시: {"user_id": "user_heavy_3", "topk": 5}
        """
        if user_id not in self.user_seq:
            # 신규 유저 또는 로그 없음 -> 인기순 또는 랜덤 (여기선 간단히 빈 리스트 반환 처리)
            return {"user_id": user_id, "recommendations": [], "message": "No history found"}

        # 유저 히스토리 가져오기
        seq = self.user_seq[user_id]
        if len(seq) > MAXLEN: seq = seq[-MAXLEN:]
        
        # 패딩
        pad_len = MAXLEN - len(seq)
        input_ids = [0] * pad_len + seq
        input_tensor = torch.tensor([input_ids], device=DEVICE)

        # 추론
        with torch.no_grad():
            user_sas_emb = self.sas_model.predict_last(input_tensor)
            user_final_emb = self.tt_model.predict_user(user_sas_emb)
            
            # 점수 계산 (내적)
            scores = (user_final_emb @ self.all_items_emb.T).squeeze()
            
            # 이미 본 것 마스킹
            scores[seq] = -9999
            scores[0] = -9999

            # Top K
            vals, indices = torch.topk(scores, k=topk)
        
        # 결과 변환
        results = []
        for rank, idx in enumerate(indices.tolist(), 1):
            item_id = self.idx2artwork.get(idx, "Unknown")
            results.append({
                "rank": rank,
                "artwork_id": item_id,
                "score": float(vals[rank-1])
            })

        return {"user_id": user_id, "recommendations": results}