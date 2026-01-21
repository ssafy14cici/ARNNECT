# infer_hybrid_9.py
import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
from tqdm import tqdm

# -----------------------------
# Paths
# -----------------------------
SASREC_CKPT = "BEST_SASRec_model.pth"
TWO_TOWER_CKPT = "BEST_UserRecommend_model.pth"
CLIP_VEC_JSON = "artwork_vector.json"

USER_LOG_JSONL = "test_user_logs.json"
OUT_JSON = "inference_out.json"

# -----------------------------
# Inference config
# -----------------------------
TOPK = 20
PRINT_TOPK = 5
MAXLEN = 50          # SASRec ckpt maxlen과 동일해야 함
CHUNK = 4096         # 전체 아이템 스코어링 chunk size (GPU/CPU 상황에 맞게 조절)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

# -----------------------------
# Weight policy
# -----------------------------
def alpha_policy(hist_len: int) -> Tuple[float, float]:
    # return (alpha_clip, alpha_log)
    if hist_len <= 1:
        return 1.0, 0.0  # ✅ len==1: 작품 임베딩 100%
    if hist_len <= 5:
        return 0.9, 0.1
    if hist_len <= 20:
        return 0.7, 0.3
    return 0.4, 0.6

def parse_ts(ts: str) -> int:
    if not ts:
        return 0
    ts = str(ts).strip()
    fmts = ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y/%m/%d %H:%M:%S"]
    for fmt in fmts:
        try:
            return int(datetime.strptime(ts, fmt).timestamp())
        except ValueError:
            pass
    try:
        return int(datetime.fromisoformat(ts).timestamp())
    except Exception:
        return 0

def right_align(seq_idx: List[int], maxlen: int) -> List[int]:
    seq_idx = seq_idx[-maxlen:]
    return [0] * (maxlen - len(seq_idx)) + seq_idx

# -----------------------------
# Models (must match training)
# -----------------------------
class PointWiseFeedForward(nn.Module):
    def __init__(self, hidden: int, dropout: float):
        super().__init__()
        self.conv1 = nn.Conv1d(hidden, hidden, kernel_size=1)
        self.conv2 = nn.Conv1d(hidden, hidden, kernel_size=1)
        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()

    def forward(self, x):
        y = x.transpose(1, 2)
        y = self.dropout(self.relu(self.conv1(y)))
        y = self.dropout(self.conv2(y))
        y = y.transpose(1, 2)
        return y

class SASRecBlock(nn.Module):
    def __init__(self, hidden: int, heads: int, dropout: float):
        super().__init__()
        self.ln1 = nn.LayerNorm(hidden, eps=1e-12)
        self.attn = nn.MultiheadAttention(embed_dim=hidden, num_heads=heads, dropout=dropout, batch_first=True)
        self.dropout = nn.Dropout(dropout)
        self.ln2 = nn.LayerNorm(hidden, eps=1e-12)
        self.ff = PointWiseFeedForward(hidden, dropout=dropout)

    def forward(self, x, attn_mask):
        h = self.ln1(x)
        attn_out, _ = self.attn(h, h, h, attn_mask=attn_mask, need_weights=False)
        x = x + self.dropout(attn_out)
        h2 = self.ln2(x)
        x = x + self.dropout(self.ff(h2))
        return x

class SASRec(nn.Module):
    def __init__(self, num_items: int, maxlen: int, hidden: int, layers: int, heads: int, dropout: float):
        super().__init__()
        self.num_items = num_items
        self.maxlen = maxlen
        self.hidden = hidden
        self.item_emb = nn.Embedding(num_items + 1, hidden, padding_idx=0)
        self.pos_emb = nn.Embedding(maxlen, hidden)
        self.dropout = nn.Dropout(dropout)
        self.ln = nn.LayerNorm(hidden, eps=1e-12)
        self.blocks = nn.ModuleList([SASRecBlock(hidden, heads, dropout) for _ in range(layers)])
        self.register_buffer("causal_mask", torch.triu(torch.ones(maxlen, maxlen, dtype=torch.bool), diagonal=1))

    def forward(self, seq):
        B, T = seq.size()
        pos = torch.arange(T, device=seq.device).unsqueeze(0).expand(B, T)
        x = self.item_emb(seq) + self.pos_emb(pos)
        x = self.dropout(self.ln(x))
        attn_mask = self.causal_mask[:T, :T]
        for blk in self.blocks:
            x = blk(x, attn_mask)
        return x

    @torch.no_grad()
    def predict_last(self, seq):
        h = self.forward(seq)
        return h[:, -1, :]

class TwoTowerAlign(nn.Module):
    def __init__(self, dim: int = 512, dropout: float = 0.1):
        super().__init__()
        self.user_proj = nn.Sequential(
            nn.Linear(dim, dim),
            nn.LayerNorm(dim),
            nn.Dropout(dropout),
        )
        self.item_proj = nn.Sequential(
            nn.Linear(dim, dim),
            nn.LayerNorm(dim),
            nn.Dropout(dropout),
        )

    def forward(self, user_vec, item_vec):
        zu = self.user_proj(user_vec)
        zi = self.item_proj(item_vec)
        zu = zu / (zu.norm(dim=-1, keepdim=True) + 1e-12)
        zi = zi / (zi.norm(dim=-1, keepdim=True) + 1e-12)
        return (zu * zi).sum(dim=-1)

# -----------------------------
# Loaders
# -----------------------------
from pathlib import Path
import json

def load_logs_auto(path: str):
    """
    - JSON array: [ {...}, {...} ]
    - JSONL: 한 줄에 {...}
    둘 다 자동으로 읽는다.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"로그 파일이 없습니다: {p.resolve()}")

    text = p.read_text(encoding="utf-8").lstrip("\ufeff").strip()
    if not text:
        return []

    # 1) JSON 배열이면 통째로 로드
    if text.startswith("["):
        obj = json.loads(text)
        if not isinstance(obj, list):
            raise ValueError("JSON array 형식이어야 합니다. (리스트)")
        return obj

    # 2) 아니면 JSONL로 처리
    out = []
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # 혹시 마지막에 쉼표가 붙어있으면 제거 (",")
            if line.endswith(","):
                line = line[:-1].rstrip()
            # 대괄호 라인 방어
            if line in ("[", "]"):
                continue
            out.append(json.loads(line))
    return out

def load_clip_matrix(clip_vec_json: str, num_items: int, idx2artwork: List[str], device: str) -> torch.Tensor:
    raw = json.loads(Path(clip_vec_json).read_text(encoding="utf-8"))
    m = {r["artwork_id"]: r["artwork_vector"] for r in raw if isinstance(r, dict) and "artwork_id" in r and "artwork_vector" in r}

    dim = 512
    mat = torch.zeros((num_items + 1, dim), dtype=torch.float16)
    filled = 0
    for i in range(1, num_items + 1):
        aid = idx2artwork[i]
        v = m.get(aid)
        if v is None:
            continue
        if isinstance(v, list) and len(v) == dim:
            mat[i] = torch.tensor(v, dtype=torch.float16)
            filled += 1

    mat = mat / (mat.norm(dim=-1, keepdim=True) + 1e-12)
    print(f"[CLIP] filled {filled}/{num_items} (dim={dim})")
    return mat.to(device)

def load_sasrec(ckpt_path: str, device: str):
    ckpt = torch.load(ckpt_path, map_location="cpu")
    num_items = int(ckpt["num_items"])
    idx2artwork = ckpt["idx2artwork"]

    # meta는 ckpt에 있을 수도/없을 수도 있어서 안전하게 처리
    cfg = ckpt.get("config", {})
    maxlen = int(ckpt.get("maxlen", cfg.get("maxlen", MAXLEN)))
    hidden = int(ckpt.get("hidden", cfg.get("hidden", 512)))
    layers = int(ckpt.get("layers", cfg.get("layers", 4)))
    heads = int(ckpt.get("heads", cfg.get("heads", 8)))
    dropout = float(ckpt.get("dropout", cfg.get("dropout", 0.2)))

    model = SASRec(num_items=num_items, maxlen=maxlen, hidden=hidden, layers=layers, heads=heads, dropout=dropout)
    model.load_state_dict(ckpt["state_dict"], strict=True)
    model.to(device).eval()
    for p in model.parameters():
        p.requires_grad = False

    # artwork2idx도 ckpt에 있으면 사용, 없으면 idx2artwork로 복원
    artwork2idx = ckpt.get("artwork2idx")
    if artwork2idx is None:
        artwork2idx = {aid: i for i, aid in enumerate(idx2artwork) if i > 0}

    meta = {"num_items": num_items, "maxlen": maxlen, "hidden": hidden, "layers": layers, "heads": heads, "dropout": dropout}
    print("[SASRec meta]", meta)
    return model, artwork2idx, idx2artwork, meta

def load_two_tower(ckpt_path: str, device: str):
    ckpt = torch.load(ckpt_path, map_location="cpu")
    sd = ckpt.get("two_tower_state_dict", ckpt.get("state_dict"))
    if sd is None:
        raise ValueError("two_tower_align.pth에서 state dict를 찾지 못했습니다. key: two_tower_state_dict / state_dict 확인")
    model = TwoTowerAlign(dim=512, dropout=0.1).to(device).eval()
    model.load_state_dict(sd, strict=True)
    for p in model.parameters():
        p.requires_grad = False
    return model

def build_user_seq(logs: List[dict], artwork2idx: Dict[str, int]) -> Dict[str, List[int]]:
    by_user = defaultdict(list)
    for r in logs:
        uid = str(r.get("user_id", "")).strip()
        aid = r.get("artwork_id") or r.get("item_id")
        if not uid or aid is None:
            continue
        aid = str(aid).strip()
        if aid not in artwork2idx:
            continue
        t = parse_ts(r.get("timestamp", ""))
        by_user[uid].append((t, artwork2idx[aid]))

    out = {}
    for uid, arr in by_user.items():
        arr.sort(key=lambda x: x[0])
        out[uid] = [i for _, i in arr]
    return out

# -----------------------------
# Inference scoring
# -----------------------------
@torch.no_grad()
def infer_one_user(
    uid: str,
    seq: List[int],
    sas: SASRec,
    tt: TwoTowerAlign,
    clip_mat: torch.Tensor,
    idx2artwork: List[str],
    device: str,
    topk: int
):
    hist_len = len(seq)
    a_clip, a_log = alpha_policy(hist_len)

    seen = set(seq)

    # ----- content profile (최근 K개 평균: cold/normal에서 "비슷한 작품" 성향 강화) -----
    K = min(10, hist_len)
    u_content = clip_mat[torch.tensor(seq[-K:], device=device)].to(torch.float32).mean(dim=0)
    u_content = u_content / (u_content.norm(dim=-1, keepdim=True) + 1e-12)

    # content scores: (N+1,512) @ (512)
    score_content = (clip_mat.to(torch.float32) @ u_content)  # [num_items+1]

    # ----- log scores (len==1이면 a_log=0 이라 자동 무시) -----
    if a_log > 0.0 and hist_len >= 2:
        seq_pad = torch.tensor([right_align(seq[:-1], sas.maxlen)], dtype=torch.long, device=device)
        u_log = sas.predict_last(seq_pad).squeeze(0)
        u_log = u_log / (u_log.norm(dim=-1, keepdim=True) + 1e-12)

        # item side precompute는 여기선 간단히 chunk로 계산
        score_log = torch.empty((clip_mat.size(0),), dtype=torch.float32, device=device)
        start = 0
        while start < clip_mat.size(0):
            end = min(start + CHUNK, clip_mat.size(0))
            items = clip_mat[start:end].to(torch.float32)
            u_rep = u_log.unsqueeze(0).expand(end - start, -1)
            score_log[start:end] = tt(u_rep, items)
            start = end
    else:
        score_log = torch.zeros_like(score_content)

    score = a_clip * score_content + a_log * score_log

    # seen 제외
    for s in seen:
        score[s] = -1e9

    # PAD(0) 제외
    score[0] = -1e9

    topv, topi = torch.topk(score, k=min(topk, score.numel()-1))
    recs = []
    for sc, ix in zip(topv.tolist(), topi.tolist()):
        recs.append({"artwork_id": idx2artwork[ix], "score": float(sc), "item_idx": int(ix)})

    return {
        "user_id": uid,
        "history_len": hist_len,
        "alpha_clip": float(a_clip),
        "alpha_log": float(a_log),
        "history_artwork_ids": [idx2artwork[i] for i in seq],
        "recommendations": recs
    }

def main():
    device = "cpu"
    print("[System] device =", device)

    sas, artwork2idx, idx2artwork, meta = load_sasrec(SASREC_CKPT, device=device)
    tt = load_two_tower(TWO_TOWER_CKPT, device=device)

    # clip_mat is aligned to idx2artwork indices
    clip_mat = load_clip_matrix(CLIP_VEC_JSON, num_items=meta["num_items"], idx2artwork=idx2artwork, device=device)

    logs = load_logs_auto(USER_LOG_JSONL)
    user_seq = build_user_seq(logs, artwork2idx)

    # 추론
    outs = []
    for uid in sorted(user_seq.keys()):
        out = infer_one_user(uid, user_seq[uid], sas, tt, clip_mat, idx2artwork, device, TOPK)
        outs.append(out)

        # 콘솔 Top5
        print(f"\n=== {uid} len={out['history_len']} | alpha_clip={out['alpha_clip']:.2f} alpha_log={out['alpha_log']:.2f} ===")
        for r in out["recommendations"][:PRINT_TOPK]:
            print(f"- {r['artwork_id']}  score={r['score']:.4f}")

    Path(OUT_JSON).write_text(json.dumps(outs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[OK] saved -> {OUT_JSON}")

if __name__ == "__main__":
    main()
