"""
=============================================================================
[UserRecommend_Inference_Model.py] - MAXLEN=200 Fix Version
=============================================================================
"""

import json
import math
import os
import random
import argparse
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import numpy as np
import torch
import torch.nn as nn
from tqdm import tqdm

# -----------------------------
# Config (기본값)
# -----------------------------
DEFAULT_LOG_PATH = "test_user_logs.json"
DEFAULT_CLIP_JSON = "artwork_vector.json"
DEFAULT_SASREC_CKPT = "BEST_SASRec_model.pth"
DEFAULT_MODEL_PTH = "Best_UserRecommend_model.pth"

# ✅ [중요] 학습 코드와 동일하게 200으로 설정
MAXLEN = 200  
HIDDEN = 512
SEED = 42

# -----------------------------
# [NEW] 난수 고정 함수
# -----------------------------
def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    print(f"[System] Random Seed fixed to {seed}")

# -----------------------------
# Model Classes
# -----------------------------
class FeatureSASRec(nn.Module):
    def __init__(self, item_vectors: torch.Tensor, hidden_dim=512, n_layers=2, n_heads=4, dropout=0.1, maxlen=50):
        super().__init__()
        self.register_buffer("item_vectors", item_vectors)
        self.hidden_dim = hidden_dim
        self.maxlen = maxlen

        self.proj = nn.Sequential(
            nn.Linear(item_vectors.size(1), hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU()
        )
        self.pos_emb = nn.Embedding(maxlen, hidden_dim)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=n_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=dropout,
            batch_first=True,
            norm_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.ln_f = nn.LayerNorm(hidden_dim)

    def forward(self, seq_ids):
        x = self.item_vectors[seq_ids]
        x = self.proj(x)
        
        B, S, _ = x.shape
        positions = torch.arange(S, device=x.device).unsqueeze(0)
        
        # 시퀀스가 모델 maxlen보다 길 경우 자르기 (안전장치)
        if S > self.maxlen:
            x = x[:, :self.maxlen, :]
            S = self.maxlen
            positions = positions[:, :S]
            
        x = x + self.pos_emb(positions)
        pad_mask = (seq_ids == 0)
        
        # pad_mask도 길이 맞춤
        if pad_mask.size(1) > self.maxlen:
            pad_mask = pad_mask[:, :self.maxlen]

        out = self.encoder(x, src_key_padding_mask=pad_mask)
        return self.ln_f(out)

    @torch.no_grad()
    def predict_last(self, seq_ids):
        out = self.forward(seq_ids)
        return out[:, -1, :]

class TwoTowerAlign(nn.Module):
    def __init__(self, dim: int = 512, dropout: float = 0.1):
        super().__init__()
        # ✅ 학습 코드와 동일하게 LayerNorm 제거
        self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))
        self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))

    def forward(self, user_vec, item_vec):
        zu = self.user_proj(user_vec)
        zi = self.item_proj(item_vec)
        return (zu * zi).sum(dim=-1)

    @torch.no_grad()
    def predict_user(self, user_vec):
        zu = self.user_proj(user_vec)
        # 학습 때 F.normalize를 썼으므로 추론 때도 정규화 유지 (기존 코드 유지)
        return zu / (zu.norm(dim=-1, keepdim=True) + 1e-12)

    @torch.no_grad()
    def predict_item(self, item_vec):
        zi = self.item_proj(item_vec)
        return zi / (zi.norm(dim=-1, keepdim=True) + 1e-12)

# -----------------------------
# Utils
# -----------------------------
def load_clip_matrix_full(clip_vec_json: str, clip_dim=512):
    path = Path(clip_vec_json)
    if not path.exists():
        raise FileNotFoundError(f"{clip_vec_json} not found.")
    
    text = path.read_text(encoding="utf-8").strip()
    if text.startswith("["):
        data = json.loads(text)
    else:
        data = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip(): data.append(json.loads(line))

    id2vec = {}
    keys_id = ["artwork_id", "idx", "item_id", "id"]
    keys_vec = ["artwork_vector", "vector", "embedding", "clip_vector"]

    for item in data:
        aid = None
        for k in keys_id:
            if k in item: aid = str(item[k]); break
        vec = None
        for k in keys_vec:
            if k in item: vec = item[k]; break
        
        if aid and vec and len(vec) == clip_dim:
            id2vec[aid] = vec

    artwork2idx = {"<PAD>": 0}
    idx2artwork = {0: "<PAD>"}
    matrix_list = [np.zeros(clip_dim, dtype=np.float32)]

    for aid, vec in id2vec.items():
        curr_idx = len(artwork2idx)
        artwork2idx[aid] = curr_idx
        idx2artwork[curr_idx] = aid
        matrix_list.append(np.array(vec, dtype=np.float32))

    item_mat = torch.tensor(np.stack(matrix_list), dtype=torch.float32)
    item_mat = item_mat / (item_mat.norm(dim=-1, keepdim=True) + 1e-12)
    return artwork2idx, idx2artwork, item_mat

def load_logs_auto(path: str) -> List[dict]:
    p = Path(path)
    if not p.exists(): return []
    text = p.read_text(encoding="utf-8").strip()
    if text.startswith("["): return json.loads(text)
    out = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip(): out.append(json.loads(line))
    return out

def build_user_sequences(logs: List[dict], artwork2idx: Dict[str, int]) -> Dict[str, List[int]]:
    by_user = defaultdict(list)
    for r in logs:
        uid = str(r.get("user_id") or r.get("member_id") or "").strip()
        aid = str(r.get("artwork_id") or r.get("item_id") or "").strip()
        if not uid or not aid: continue
        if aid in artwork2idx:
            by_user[uid].append(artwork2idx[aid])
    
    res = {}
    for u, seq in by_user.items():
        if len(seq) > MAXLEN: seq = seq[-MAXLEN:] # 여기도 MAXLEN 사용
        res[u] = seq
    return res

def right_align(seq_idx: List[int], maxlen: int) -> List[int]:
    seq_idx = seq_idx[-maxlen:]
    return [0] * (maxlen - len(seq_idx)) + seq_idx

# -----------------------------
# Main Functions
# -----------------------------
def load_models(args, device):
    print(">>> Loading Vectors...")
    artwork2idx, idx2artwork, item_mat = load_clip_matrix_full(args.clip_vec_json)
    item_mat = item_mat.to(device)
    
    print(f">>> Loading SASRec: {args.sasrec_ckpt}")
    
    # ✅ [수정완료] MAXLEN을 명시적으로 전달! (이게 없으면 기본값 50이 들어감)
    sas_model = FeatureSASRec(item_mat, hidden_dim=HIDDEN, maxlen=MAXLEN).to(device)
    
    try:
        ckpt = torch.load(args.sasrec_ckpt, map_location=device)
        state_dict = ckpt['state_dict'] if 'state_dict' in ckpt else ckpt
        new_state = {k: v for k, v in state_dict.items() if "item_vectors" not in k}
        
        msg = sas_model.load_state_dict(new_state, strict=False)
        print(f"   -> SASRec Load Result: {msg}") 
        
    except Exception as e:
        print(f"⚠️ SASRec 로드 에러: {e}")
        print("   -> 초기화된 상태(Random Weights)로 진행합니다.")
    sas_model.eval()

    print(f">>> Loading TwoTower: {args.model_pth}")
    tt_model = TwoTowerAlign(dim=HIDDEN).to(device)
    
    if os.path.exists(args.model_pth):
        saved = torch.load(args.model_pth, map_location=device)
        if "two_tower_state_dict" in saved:
            tt_model.load_state_dict(saved["two_tower_state_dict"])
        else:
            tt_model.load_state_dict(saved)
    else:
        print("⚠️ TwoTower 모델 파일이 없습니다. 학습되지 않은 상태입니다.")
        
    tt_model.eval()

    return sas_model, tt_model, item_mat, artwork2idx, idx2artwork

def validate(args, device):
    sas, tt, item_mat, artwork2idx, _, = load_models(args, device)
    logs = load_logs_auto(args.log_path)
    user_seq = build_user_sequences(logs, artwork2idx)
    
    print(f">>> Validation Start (Users: {len(user_seq)})")
    
    hits, ndcgs = [], []
    all_items_vec = item_mat  
    with torch.no_grad():
        all_items_emb = tt.predict_item(all_items_vec) 

    for uid, seq in tqdm(user_seq.items()):
        if len(seq) < 2: continue
        
        input_seq = seq[:-1]
        target_item = seq[-1]
        
        input_pad = right_align(input_seq, MAXLEN)
        input_tensor = torch.tensor([input_pad], device=device)
        
        with torch.no_grad():
            user_sas_emb = sas.predict_last(input_tensor)
            user_final_emb = tt.predict_user(user_sas_emb)
            
            scores = (user_final_emb @ all_items_emb.T).squeeze()
            topk_vals, topk_idx = torch.topk(scores, k=20)
            topk_idx = topk_idx.tolist()
            
            if target_item in topk_idx:
                hits.append(1)
                rank = topk_idx.index(target_item) + 1
                ndcgs.append(1 / math.log2(rank + 1))
            else:
                hits.append(0)
                ndcgs.append(0)

    print(f"✅ Result: Hit@20 = {np.mean(hits):.4f} | NDCG@20 = {np.mean(ndcgs):.4f}")

def recommend(args, device):
    # 1. 모델 로드
    sas, tt, item_mat, artwork2idx, idx2artwork = load_models(args, device)
    
    # 2. 로그 파일 로드
    logs = load_logs_auto(args.log_path)
    user_seq = build_user_sequences(logs, artwork2idx)
    
    # -------------------------------------------------------------
    # 🔍 [디버깅] 파일에 들어있는 실제 ID 확인하기
    # -------------------------------------------------------------
    all_user_ids = list(user_seq.keys())
    print(f"\n" + "="*60)
    print(f"📂 로드된 파일: {args.log_path}")
    print(f"👥 총 유저 수: {len(all_user_ids)}명")
    print(f"👀 유저 ID 샘플 (앞에서 5개): {all_user_ids[:5]}")
    print("="*60 + "\n")
    # -------------------------------------------------------------

    target_id = str(args.member_id).strip()
    target_seq = user_seq.get(target_id)

    # 기록이 없거나 유저를 못 찾은 경우
    if not target_seq:
        print(f"⚠️ 경고: 입력하신 ID '{target_id}'를 찾을 수 없습니다.")
        print(f"   (위의 '유저 ID 샘플'을 보고 정확한 ID를 다시 입력해주세요.)")
        
        # [Cold Start] 인기 추천 로직 실행
        print(f"\n👉 대신 '{target_id}'님을 위한 인기(Most Popular) 작품을 추천합니다.")
        
        all_items = []
        for seq in user_seq.values():
            all_items.extend(seq)
        
        from collections import Counter
        popular_items = Counter(all_items).most_common(args.topk)
        
        for rank, (idx, count) in enumerate(popular_items, 1):
            item_name = idx2artwork.get(idx, "Unknown")
            print(f"{rank}. {item_name} (조회수: {count})")
        return

    # 정상적인 개인화 추천
    print(f">>> 🔮 '{target_id}'님을 위한 개인화 추천 진행")
    
    input_pad = right_align(target_seq, MAXLEN)
    input_tensor = torch.tensor([input_pad], device=device)
    
    with torch.no_grad():
        user_sas_emb = sas.predict_last(input_tensor)
        user_final_emb = tt.predict_user(user_sas_emb)
        all_items_emb = tt.predict_item(item_mat)
        
        scores = (user_final_emb @ all_items_emb.T).squeeze()
        
        if len(target_seq) > 0:
            scores[target_seq] = -9999
        scores[0] = -9999 

        vals, indices = torch.topk(scores, k=args.topk)
        
    print("\n🎁 [User Personalized Recommendation]")
    for rank, idx in enumerate(indices.tolist(), 1):
        item_id = idx2artwork.get(idx, "Unknown")
        print(f"{rank}. {item_id} (Score: {vals[rank-1]:.4f})")

if __name__ == "__main__":
    set_seed(SEED)
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", type=str, required=True, choices=["validate", "recommend"])
    parser.add_argument("--member_id", type=str, help="추천받을 유저 ID")
    parser.add_argument("--topk", type=int, default=10)
    
    parser.add_argument("--sasrec_ckpt", type=str, default=DEFAULT_SASREC_CKPT)
    parser.add_argument("--model_pth", type=str, default=DEFAULT_MODEL_PTH)
    parser.add_argument("--log_path", type=str, default=DEFAULT_LOG_PATH)
    parser.add_argument("--clip_vec_json", type=str, default=DEFAULT_CLIP_JSON)
    
    args = parser.parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    if args.mode == "validate":
        validate(args, device)
    elif args.mode == "recommend":
        if not args.member_id:
            print("❌ --member_id 를 입력해주세요.")
        else:
            recommend(args, device)