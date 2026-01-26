"""
UserRecommend_Inference_Model_v2.py

- 학습 노트북(SASRec_TwoTower_Train_v2.ipynb)의 모델/데이터 로더 규칙과
  기존 추론 스크립트(UserRecommend_Inference_Model.py)의 CLI 사용성을 합친 "검증/추론" 전용 스크립트.

핵심 수정/보강:
1) 유저 로그는 (member_id, artwork_id, timestamp/action) 형태만 사용 (벡터는 참조로만 사용)
2) artwork_vector.json에서 artwork_id에 해당하는 벡터를 lookup하여 item_mat 구성
3) 학습 코드와 동일한 _stem_id / load_item_vectors / load_user_sequences 로직 적용 (ID/순서 불일치 방지)
4) TwoTowerAlign 체크포인트 구조를 자동 감지하여 로드(Linear+Dropout vs Linear+LayerNorm+Dropout 등)
5) 로그가 "최신순(1줄=최신)"인 경우, 모델 입력용(과거->현재)으로 reverse 처리

사용 예:
  python UserRecommend_Inference_Model_v2.py --mode validate --log_path test_user_logs.json --clip_vec_json artwork_vector_post.json
  python UserRecommend_Inference_Model_v2.py --mode recommend --member_id A --log_path test_user_logs.json --clip_vec_json artwork_vector_post.json --topk 10
"""

import argparse
import json
import math
import os
import random
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from tqdm import tqdm

# -----------------------------
# Defaults
# -----------------------------
DEFAULT_LOG_PATH = "test_user_logs.json"
DEFAULT_CLIP_JSON = "artwork_vector.json"
DEFAULT_SASREC_CKPT = "BEST_SASRec_model.pth"
DEFAULT_MODEL_PTH = "Best_UserRecommend_model.pth"

DEFAULT_MAXLEN = 200
DEFAULT_HIDDEN = 512
DEFAULT_SEED = 42

# -----------------------------
# Repro
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
# IO Utils
# -----------------------------
def read_json_or_jsonl(path: str):
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Not found: {p.resolve()}")
    text = p.read_text(encoding="utf-8").strip()
    if not text:
        return []
    # JSON array
    if text.startswith("["):
        return json.loads(text)
    # JSON dict (rare, but support)
    if text.startswith("{") and "\n" not in text:
        return json.loads(text)
    # JSONL
    out = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out

def _stem_id(x) -> str:
    # "category096_0001.png" 또는 "/.../category096_0001.png" -> "category096_0001"
    return Path(str(x)).stem

# -----------------------------
# Data loaders (학습 노트북과 동일 규칙)
# -----------------------------
def load_item_vectors(vec_json_path: str, expected_dim: int = 512) -> Tuple[Dict[str, int], Dict[int, str], torch.Tensor]:
    """
    returns:
      artwork2idx: {"<PAD>":0, "category...":1, ...}
      idx2artwork: {0:"<PAD>", 1:"category...", ...}
      item_mat: (N+1, D) float32 normalized, item_mat[0]=zeros
    """
    data = read_json_or_jsonl(vec_json_path)

    artwork2idx: Dict[str, int] = {"<PAD>": 0}
    idx2artwork: Dict[int, str] = {0: "<PAD>"}
    matrix_list = [np.zeros(expected_dim, dtype=np.float32)]

    def add_one(aid, vec):
        if aid is None or vec is None:
            return
        if isinstance(vec, list) and len(vec) == expected_dim:
            aid = _stem_id(aid)  # ✅ id 규칙 통일
            if aid not in artwork2idx:
                idx = len(artwork2idx)
                artwork2idx[aid] = idx
                idx2artwork[idx] = aid
                matrix_list.append(np.array(vec, dtype=np.float32))

    if isinstance(data, dict):
        # {"id": [vec], ...}
        for aid, vec in data.items():
            add_one(aid, vec)
    elif isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            aid = item.get("artwork_id") or item.get("item_id") or item.get("id")
            vec = item.get("artwork_vector") or item.get("vector") or item.get("embedding")
            add_one(aid, vec)
    else:
        raise ValueError("Unsupported vector JSON format")

    item_mat = torch.tensor(np.stack(matrix_list), dtype=torch.float32)
    item_mat = item_mat / (item_mat.norm(dim=-1, keepdim=True) + 1e-12)
    return artwork2idx, idx2artwork, item_mat

def load_user_sequences(log_path: str, artwork2idx: Dict[str, int], logs_are_latest_first: bool = True, maxlen: int = 200) -> Dict[str, List[int]]:
    """
    유저 로그는 (member_id, artwork_id, action/timestamp)만 있으면 됨.
    - artwork_id는 stem 규칙으로 통일해서 벡터 키와 매칭
    - 로그가 최신순(1줄=가장 최신)이면 모델 입력용(과거->현재)으로 reverse
    - 결과 시퀀스는 (과거 -> 현재) 순서
    """
    logs = read_json_or_jsonl(log_path)
    if not isinstance(logs, list):
        raise ValueError("Log must be JSON array or JSONL")

    by_user: Dict[str, List[int]] = defaultdict(list)
    missed = 0
    for log in logs:
        if not isinstance(log, dict):
            continue
        uid = str(log.get("member_id") or log.get("user_id") or "").strip()
        aid = log.get("artwork_id") or log.get("item_id") or log.get("id")
        if not uid or aid is None:
            missed += 1
            continue
        aid = _stem_id(aid)
        idx = artwork2idx.get(aid)
        if idx is None:
            missed += 1
            continue
        by_user[uid].append(idx)

    # 최신순 로그면 뒤집기 (과거->현재)
    if logs_are_latest_first:
        for uid in list(by_user.keys()):
            by_user[uid] = list(reversed(by_user[uid]))

    # maxlen 컷: 과거->현재 유지하면서 뒤에서 maxlen개 남김
    res: Dict[str, List[int]] = {}
    for uid, seq in by_user.items():
        if len(seq) > maxlen:
            seq = seq[-maxlen:]
        res[uid] = seq

    print(f">>> Logs loaded. users={len(res)} missed_logs={missed}")
    return res

def right_align(seq_idx: List[int], maxlen: int) -> List[int]:
    seq_idx = seq_idx[-maxlen:]
    return [0] * (maxlen - len(seq_idx)) + seq_idx

# -----------------------------
# Model defs (학습 노트북과 동일)
# -----------------------------
class FeatureSASRec(nn.Module):
    def __init__(self, item_vectors: torch.Tensor, hidden_dim=512, n_layers=2, n_heads=4, dropout=0.1, maxlen=200):
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

    def forward(self, seq_ids: torch.Tensor):
        # seq_ids: (B, S)
        x = self.item_vectors[seq_ids]
        x = self.proj(x)

        B, S, _ = x.shape
        positions = torch.arange(S, device=x.device).unsqueeze(0)

        # 안전장치: maxlen보다 길면 자르기
        if S > self.maxlen:
            x = x[:, :self.maxlen, :]
            positions = positions[:, :self.maxlen]
            seq_ids = seq_ids[:, :self.maxlen]
            S = self.maxlen

        x = x + self.pos_emb(positions)

        pad_mask = (seq_ids == 0)

        # causal mask
        causal_mask = torch.triu(torch.ones(S, S, device=x.device) * float("-inf"), diagonal=1)
        out = self.encoder(x, mask=causal_mask, src_key_padding_mask=pad_mask)
        return self.ln_f(out)

    @torch.no_grad()
    def predict_last(self, seq_ids: torch.Tensor):
        out = self.forward(seq_ids)
        return out[:, -1, :]  # (B, H)

class TwoTowerAlign(nn.Module):
    """
    기본(학습 노트북 v2): Sequential(Linear, Dropout)
    하지만 과거 체크포인트에서 LayerNorm 등이 포함될 수 있어 자동 감지 로더를 별도로 둔다.
    """
    def __init__(self, dim: int = 512, dropout: float = 0.1, use_layernorm: bool = False):
        super().__init__()
        if use_layernorm:
            self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))
            self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))
        else:
            self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))
            self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))

    @torch.no_grad()
    def predict_user(self, user_vec: torch.Tensor):
        zu = self.user_proj(user_vec)
        return F.normalize(zu, p=2, dim=-1)

    @torch.no_grad()
    def predict_item(self, item_vec: torch.Tensor):
        zi = self.item_proj(item_vec)
        return F.normalize(zi, p=2, dim=-1)

# -----------------------------
# Checkpoint-aware loader
# -----------------------------
def _infer_twotower_variant(state_dict: Dict[str, torch.Tensor], dim: int) -> Dict[str, Any]:
    """
    state_dict 키를 보고 TwoTowerAlign의 구조를 추정한다.
    - user_proj.1.weight 가 존재하고 shape == (dim,) 이면 LayerNorm 포함일 가능성이 높음
    - 그렇지 않으면 기본 Linear+Dropout 으로 간주
    """
    # default
    use_layernorm = False

    k = "user_proj.1.weight"
    if k in state_dict:
        w = state_dict[k]
        # LayerNorm.weight는 (dim,) / Linear.weight는 (dim, dim)
        if w.ndim == 1 and w.numel() == dim:
            use_layernorm = True

    return {"use_layernorm": use_layernorm}

def load_models(args, device: str):
    print(">>> Loading Vectors...")
    artwork2idx, idx2artwork, item_mat = load_item_vectors(args.clip_vec_json, expected_dim=args.clip_dim)
    item_mat = item_mat.to(device)
    print(f"items={len(artwork2idx)-1}")
    print("item_mat:", tuple(item_mat.shape))

    # ---------- SASRec ----------
    print(f">>> Loading SASRec: {args.sasrec_ckpt}")
    sas_ckpt = torch.load(args.sasrec_ckpt, map_location=device)
    sas_state = sas_ckpt["state_dict"] if isinstance(sas_ckpt, dict) and "state_dict" in sas_ckpt else sas_ckpt
    sas_cfg = sas_ckpt.get("config", {}) if isinstance(sas_ckpt, dict) else {}

    hidden = int(sas_cfg.get("hidden", args.hidden))
    maxlen = int(sas_cfg.get("maxlen", args.maxlen))
    n_layers = int(sas_cfg.get("n_layers", args.n_layers))
    n_heads = int(sas_cfg.get("n_heads", args.n_heads))
    dropout = float(sas_cfg.get("dropout", args.dropout))

    sas_model = FeatureSASRec(item_vectors=item_mat, hidden_dim=hidden, n_layers=n_layers, n_heads=n_heads, dropout=dropout, maxlen=maxlen).to(device)

    # item_vectors는 런타임에 item_mat로 주입하므로 ckpt 로딩에서 제거(학습/추론 일치)
    sas_state = {k: v for k, v in sas_state.items() if "item_vectors" not in k}
    msg = sas_model.load_state_dict(sas_state, strict=False)
    print(f"   -> SASRec Load Result: {msg}")
    sas_model.eval()

    # ---------- TwoTower ----------
    print(f">>> Loading TwoTower: {args.model_pth}")
    saved = torch.load(args.model_pth, map_location=device)
    tt_state = saved["two_tower_state_dict"] if isinstance(saved, dict) and "two_tower_state_dict" in saved else saved
    tt_cfg = saved.get("config", {}) if isinstance(saved, dict) else {}

    tt_hidden = int(tt_cfg.get("hidden", hidden))
    tt_dropout = float(tt_cfg.get("dropout", dropout))

    variant = _infer_twotower_variant(tt_state, dim=tt_hidden)
    tt_model = TwoTowerAlign(dim=tt_hidden, dropout=tt_dropout, use_layernorm=variant["use_layernorm"]).to(device)

    # strict 로드가 실패하면 strict=False로 폴백 (추론용 안전장치)
    try:
        tt_model.load_state_dict(tt_state, strict=True)
    except RuntimeError as e:
        print("⚠️ TwoTower strict load failed. Fallback to strict=False.")
        print("   reason:", e)
        msg2 = tt_model.load_state_dict(tt_state, strict=False)
        print("   -> TwoTower Load Result:", msg2)

    tt_model.eval()

    return sas_model, tt_model, item_mat, artwork2idx, idx2artwork, maxlen

# -----------------------------
# Evaluate & Recommend
# -----------------------------
@torch.no_grad()
def validate(args, device: str):
    sas, tt, item_mat, artwork2idx, idx2artwork, maxlen = load_models(args, device)

    user_seq = load_user_sequences(args.log_path, artwork2idx, logs_are_latest_first=args.logs_latest_first, maxlen=maxlen)
    print(f">>> Validation Start (Users: {len(user_seq)})")

    # item embeddings (N, H)
    all_items_emb = tt.predict_item(item_mat)

    hits, ndcgs = [], []
    for uid, seq in tqdm(user_seq.items()):
        if len(seq) < 2:
            continue

        input_seq = seq[:-1]
        target_item = seq[-1]

        input_pad = right_align(input_seq, maxlen)
        input_tensor = torch.tensor([input_pad], device=device)

        user_sas_emb = sas.predict_last(input_tensor)
        user_final = tt.predict_user(user_sas_emb)  # (1, H)

        scores = (user_final @ all_items_emb.T).squeeze(0)  # (N,)
        # pad 제외
        scores[0] = -1e9

        # topk
        k = max(args.topk, 20)
        vals, idxs = torch.topk(scores, k=k)
        idxs = idxs.tolist()

        if target_item in idxs[:20]:
            hits.append(1)
            rank = idxs.index(target_item) + 1
            ndcgs.append(1.0 / math.log2(rank + 1))
        else:
            hits.append(0)
            ndcgs.append(0)

    hit20 = float(np.mean(hits)) if hits else 0.0
    ndcg20 = float(np.mean(ndcgs)) if ndcgs else 0.0
    print(f"✅ Result: Hit@20 = {hit20:.4f} | NDCG@20 = {ndcg20:.4f}")

@torch.no_grad()
def recommend(args, device: str):
    sas, tt, item_mat, artwork2idx, idx2artwork, maxlen = load_models(args, device)

    user_seq = load_user_sequences(args.log_path, artwork2idx, logs_are_latest_first=args.logs_latest_first, maxlen=maxlen)

    target_id = str(args.member_id).strip()
    target_seq = user_seq.get(target_id)

    # Cold start: fallback to popular
    if not target_seq or len(target_seq) == 0:
        print(f"⚠️ No history for user '{target_id}'. Falling back to Most Popular.")
        all_items = []
        for seq in user_seq.values():
            all_items.extend(seq)
        popular = Counter(all_items).most_common(args.topk)
        for rank, (idx, cnt) in enumerate(popular, 1):
            name = idx2artwork.get(idx, "Unknown")
            print(f"{rank}. {name} (count={cnt})")
        return

    # user embedding
    input_pad = right_align(target_seq, maxlen)
    input_tensor = torch.tensor([input_pad], device=device)

    user_sas_emb = sas.predict_last(input_tensor)
    user_final = tt.predict_user(user_sas_emb)

    all_items_emb = tt.predict_item(item_mat)
    scores = (user_final @ all_items_emb.T).squeeze(0)

    # seen 제거 + PAD 제거
    seen = set(target_seq)
    for idx in seen:
        scores[idx] = -1e9
    scores[0] = -1e9

    vals, idxs = torch.topk(scores, k=args.topk)

    print("\n🎁 [User Personalized Recommendation]")
    for rank, (idx, val) in enumerate(zip(idxs.tolist(), vals.tolist()), 1):
        item_id = idx2artwork.get(idx, "Unknown")
        print(f"{rank}. {item_id} (Score: {val:.4f})")

# -----------------------------
# CLI
# -----------------------------
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--mode", type=str, required=True, choices=["validate", "recommend"])
    p.add_argument("--member_id", type=str, default=None, help="추천받을 유저 ID (recommend 모드에서 필요)")
    p.add_argument("--topk", type=int, default=10)

    p.add_argument("--sasrec_ckpt", type=str, default=DEFAULT_SASREC_CKPT)
    p.add_argument("--model_pth", type=str, default=DEFAULT_MODEL_PTH)
    p.add_argument("--log_path", type=str, default=DEFAULT_LOG_PATH)
    p.add_argument("--clip_vec_json", type=str, default=DEFAULT_CLIP_JSON)

    # 고정 하이퍼파라미터(ckpt config 우선)
    p.add_argument("--maxlen", type=int, default=DEFAULT_MAXLEN)
    p.add_argument("--hidden", type=int, default=DEFAULT_HIDDEN)
    p.add_argument("--n_layers", type=int, default=2)
    p.add_argument("--n_heads", type=int, default=4)
    p.add_argument("--dropout", type=float, default=0.1)
    p.add_argument("--clip_dim", type=int, default=512)

    # 로그 정렬
    p.add_argument("--logs_latest_first", action="store_true", help="로그가 최신순(1줄=최신)일 때 켜기 (기본 True)")
    p.add_argument("--logs_oldest_first", action="store_true", help="로그가 과거->현재 순서일 때 켜기 (latest_first False)")

    p.add_argument("--seed", type=int, default=DEFAULT_SEED)
    return p.parse_args()

def main():
    args = parse_args()
    # flags resolve
    if args.logs_oldest_first:
        args.logs_latest_first = False
    else:
        # 기본: 최신순 로그로 가정 (너가 만든 로그 규칙)
        args.logs_latest_first = True

    set_seed(args.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if args.mode == "validate":
        validate(args, device)
    else:
        if not args.member_id:
            raise ValueError("--member_id is required for recommend mode")
        recommend(args, device)

if __name__ == "__main__":
    main()
