# train_two_tower_align.py
import json
import math
import random
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm

# -----------------------------
# Config (너 설정 고정)
# -----------------------------
LOG_PATH = "user_timestamp.json"
CLIP_VEC_JSON = "artwork_vector.json"
SASREC_CKPT = "BEST_SASRec_model.pth"
OUT_PTH = "Best_UserRecommend_model.pth"

MAX_USER_EVENTS = 200
MAXLEN = 50

HIDDEN = 512
LAYERS = 4
HEADS = 8
DROPOUT = 0.2

EPOCHS = 50
BATCH_SIZE = 512
LR = 1e-3
WEIGHT_DECAY = 1e-4

EVAL_NEG = 100
SEED = 42

# ---- MLflow ----
USE_MLFLOW = True
MLFLOW_URI = "http://127.0.0.1:8080"
MLFLOW_EXP = "two_tower_align"

# -----------------------------
# Utils
# -----------------------------
def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

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

def user_type_from_len(L: int) -> str:
    if L <= 5:
        return "cold"
    if L <= 20:
        return "normal"
    return "heavy"

def alpha_for_user_type(t: str) -> Tuple[float, float]:
    # (alpha_clip, alpha_log)
    if t == "cold":
        return 0.90, 0.10
    if t == "normal":
        return 0.70, 0.30
    return 0.40, 0.60

def hr_ndcg_at_k(ranked_items: List[int], gt: int, k: int) -> Tuple[float, float]:
    topk = ranked_items[:k]
    if gt in topk:
        rank = topk.index(gt) + 1
        return 1.0, 1.0 / math.log2(rank + 1)
    return 0.0, 0.0

def load_logs_auto(path: str) -> List[dict]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"로그 파일이 없습니다: {p.resolve()}")

    text = p.read_text(encoding="utf-8").lstrip()
    if text.startswith("["):
        return json.loads(text)

    out = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out

def build_user_sequences(logs: List[dict], artwork2idx: Dict[str, int]) -> Dict[str, List[int]]:
    by_user = defaultdict(list)
    for r in logs:
        uid = str(r.get("user_id", "")).strip()
        if not uid:
            continue
        aid = r.get("artwork_id", None)
        if aid is None:
            aid = r.get("item_id", None)
        if aid is None:
            continue
        aid = str(aid).strip()
        if aid not in artwork2idx:
            continue

        t = parse_ts(r.get("timestamp", ""))
        by_user[uid].append((t, artwork2idx[aid]))

    user_seq = {}
    for uid, arr in by_user.items():
        arr.sort(key=lambda x: x[0])
        seq = [i for _, i in arr]
        if len(seq) > MAX_USER_EVENTS:
            seq = seq[-MAX_USER_EVENTS:]
        user_seq[uid] = seq
    return user_seq

def right_align(seq_idx: List[int], maxlen: int) -> List[int]:
    seq_idx = seq_idx[-maxlen:]
    return [0] * (maxlen - len(seq_idx)) + seq_idx

def stratified_user_split(user_seq: Dict[str, List[int]], train_ratio=0.8, seed=42):
    """
    ✅ cold/normal/heavy 각각에서 8:2로 유저를 나눔 (유저 단위 split)
    """
    rng = random.Random(seed)
    buckets = {"cold": [], "normal": [], "heavy": []}

    for uid, seq in user_seq.items():
        if len(seq) < 2:
            continue
        t = user_type_from_len(len(seq))
        buckets[t].append(uid)

    train_users, val_users = set(), set()
    for t, uids in buckets.items():
        rng.shuffle(uids)
        n = len(uids)
        cut = int(n * train_ratio)
        train_users.update(uids[:cut])
        val_users.update(uids[cut:])

    train_seq = {u: user_seq[u] for u in train_users}
    val_seq = {u: user_seq[u] for u in val_users}

    stat = {
        "train": {k: sum(1 for u in train_seq if user_type_from_len(len(train_seq[u])) == k) for k in buckets},
        "val":   {k: sum(1 for u in val_seq   if user_type_from_len(len(val_seq[u]))   == k) for k in buckets},
        "total": {k: len(buckets[k]) for k in buckets},
    }
    return train_seq, val_seq, stat

def mlflow_safe_metrics(metrics: dict) -> dict:
    """
    MLflow metric name 규칙: @ 같은 문자는 불가.
    HR@10 -> HR_at_10, NDCG@20 -> NDCG_at_20
    """
    out = {}
    for k, v in metrics.items():
        kk = k.replace("@", "_at_")
        kk = kk.replace(" ", "_")
        out[kk] = float(v)
    return out

# -----------------------------
# SASRec (체크포인트 로드용)
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

def load_sasrec_ckpt(ckpt_path: str, device: str):
    ckpt = torch.load(ckpt_path, map_location=device)

    num_items = int(ckpt["num_items"])
    maxlen = int(ckpt.get("maxlen", ckpt.get("config", {}).get("maxlen", MAXLEN)))
    hidden = int(ckpt.get("hidden", ckpt.get("config", {}).get("hidden", HIDDEN)))
    layers = int(ckpt.get("layers", ckpt.get("config", {}).get("layers", LAYERS)))
    heads = int(ckpt.get("heads", ckpt.get("config", {}).get("heads", HEADS)))
    dropout = float(ckpt.get("dropout", ckpt.get("config", {}).get("dropout", DROPOUT)))

    idx2artwork = ckpt["idx2artwork"]
    artwork2idx = ckpt.get("artwork2idx", None)
    if artwork2idx is None:
        artwork2idx = {aid: i for i, aid in enumerate(idx2artwork) if i > 0}

    model = SASRec(num_items=num_items, maxlen=maxlen, hidden=hidden, layers=layers, heads=heads, dropout=dropout).to(device)
    model.load_state_dict(ckpt["state_dict"], strict=True)
    model.eval()

    for p in model.parameters():
        p.requires_grad = False

    meta = {"num_items": num_items, "maxlen": maxlen, "hidden": hidden, "layers": layers, "heads": heads, "dropout": dropout}
    return model, artwork2idx, idx2artwork, meta

# -----------------------------
# CLIP matrix loader
# -----------------------------
def load_clip_matrix(clip_vec_json: str, num_items: int, idx2artwork: List[str], device: str, dtype=torch.float16):
    with open(clip_vec_json, "r", encoding="utf-8") as f:
        vecs = json.load(f)

    dim = len(vecs[0]["artwork_vector"])
    mat = torch.zeros((num_items + 1, dim), dtype=dtype)

    m = {r["artwork_id"]: r["artwork_vector"] for r in vecs if "artwork_id" in r and "artwork_vector" in r}
    filled = 0
    for idx in range(1, num_items + 1):
        aid = idx2artwork[idx]
        v = m.get(aid, None)
        if v is None:
            continue
        if isinstance(v, list) and len(v) == dim:
            mat[idx] = torch.tensor(v, dtype=dtype)
            filled += 1

    mat = mat / (mat.norm(dim=-1, keepdim=True) + 1e-12)
    return mat.to(device), filled, dim

# -----------------------------
# Two-Tower
# -----------------------------
class TwoTowerAlign(nn.Module):
    def __init__(self, dim: int = 512, dropout: float = 0.1):
        super().__init__()
        self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))
        self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))

    def forward(self, user_vec, item_vec):
        zu = self.user_proj(user_vec)
        zi = self.item_proj(item_vec)
        zu = zu / (zu.norm(dim=-1, keepdim=True) + 1e-12)
        zi = zi / (zi.norm(dim=-1, keepdim=True) + 1e-12)
        return (zu * zi).sum(dim=-1)

# -----------------------------
# Dataset
# -----------------------------
class AlignTrainDataset(Dataset):
    def __init__(self, user_seq: Dict[str, List[int]], num_items: int, seed: int = 42):
        self.users = [u for u, s in user_seq.items() if len(s) >= 2]
        self.user_seq = user_seq
        self.num_items = num_items
        self.rng = np.random.default_rng(seed)
        self.user_hist = {u: set(user_seq[u]) for u in self.users}

    def __len__(self):
        return len(self.users)

    def _neg(self, hist: set):
        while True:
            j = int(self.rng.integers(1, self.num_items + 1))
            if j not in hist:
                return j

    def __getitem__(self, idx):
        uid = self.users[idx]
        seq = self.user_seq[uid]
        # ✅ leakage 줄이려면 마지막(gt) 제외: t in [1, len-2] (len>=3일 때만)
        if len(seq) >= 3:
            t = int(self.rng.integers(1, len(seq) - 1))
        else:
            t = 1
        inp = seq[:t]
        pos = seq[t]
        neg = self._neg(self.user_hist[uid])
        full_len = len(seq)
        return uid, inp, pos, neg, full_len

def collate_fn(batch):
    uids, inps, pos, neg, full_len = zip(*batch)
    return list(uids), list(inps), torch.tensor(pos, dtype=torch.long), torch.tensor(neg, dtype=torch.long), torch.tensor(full_len, dtype=torch.long)

# -----------------------------
# Eval
# -----------------------------
@torch.no_grad()
def evaluate(model_sas: SASRec, model_tt: TwoTowerAlign, clip_mat: torch.Tensor,
             user_seq: Dict[str, List[int]], device: str, maxlen: int, num_items: int, num_neg: int, seed: int):
    rng = np.random.default_rng(seed)
    hr = {10: [], 20: []}
    ndcg = {10: [], 20: []}

    users = [u for u, s in user_seq.items() if len(s) >= 3]
    for uid in tqdm(users, desc="eval", leave=False):
        seq = user_seq[uid]
        hist = seq[:-1]
        gt = seq[-1]
        if len(hist) < 1:
            continue

        hist_set = set(seq)
        negs = []
        while len(negs) < num_neg:
            j = int(rng.integers(1, num_items + 1))
            if j != gt and j not in hist_set:
                negs.append(j)

        cands = [gt] + negs
        cand_t = torch.tensor(cands, dtype=torch.long, device=device)

        seq_pad = torch.tensor([right_align(hist, maxlen)], dtype=torch.long, device=device)
        user_vec = model_sas.predict_last(seq_pad)  # [1,512]

        cand_clip = clip_mat[cand_t]  # [C,512]
        log_scores = model_tt(user_vec.repeat(cand_clip.size(0), 1), cand_clip)

        last_item = hist[-1]
        last_vec = clip_mat[last_item]
        clip_scores = (cand_clip * last_vec.unsqueeze(0)).sum(dim=-1)

        ut = user_type_from_len(len(seq))
        a_clip, a_log = alpha_for_user_type(ut)

        scores = a_clip * clip_scores + a_log * log_scores
        ranked = cand_t[torch.argsort(scores, descending=True)].tolist()

        for k in (10, 20):
            h, n = hr_ndcg_at_k(ranked, gt, k)
            hr[k].append(h)
            ndcg[k].append(n)

    return {
        "HR@10": float(np.mean(hr[10])) if hr[10] else 0.0,
        "NDCG@10": float(np.mean(ndcg[10])) if ndcg[10] else 0.0,
        "HR@20": float(np.mean(hr[20])) if hr[20] else 0.0,
        "NDCG@20": float(np.mean(ndcg[20])) if ndcg[20] else 0.0,
    }

# -----------------------------
# Train
# -----------------------------
def main():
    set_seed(SEED)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[System] device =", device)

    # 1) SASRec
    sas, artwork2idx, idx2artwork, sas_meta = load_sasrec_ckpt(SASREC_CKPT, device=device)
    num_items = sas_meta["num_items"]
    maxlen = sas_meta["maxlen"]
    hidden = sas_meta["hidden"]

    assert hidden == 512, f"SASRec hidden must be 512 for your setup, got {hidden}"
    assert maxlen == MAXLEN, f"MAXLEN mismatch: ckpt maxlen={maxlen}, config MAXLEN={MAXLEN}"

    # 2) CLIP
    clip_mat, filled, dim = load_clip_matrix(CLIP_VEC_JSON, num_items=num_items, idx2artwork=idx2artwork, device=device, dtype=torch.float16)
    assert dim == 512, f"CLIP dim must be 512, got {dim}"
    print(f"[CLIP] filled {filled}/{num_items} (dim={dim})")

    # 3) Logs -> sequences
    logs = load_logs_auto(LOG_PATH)
    all_user_seq = build_user_sequences(logs, artwork2idx)
    all_user_seq = {u: s for u, s in all_user_seq.items() if len(s) >= 2}

    # ✅ 4) stratified split (cold/normal/heavy 각각 8:2)
    train_user_seq, val_user_seq, stat = stratified_user_split(all_user_seq, train_ratio=0.8, seed=SEED)
    print("[Split] total:", stat["total"])
    print("[Split] train:", stat["train"])
    print("[Split] val  :", stat["val"])
    print("[Data] train users =", len(train_user_seq), "| val users =", len(val_user_seq))

    # 5) dataset/loader (train only)
    ds = AlignTrainDataset(train_user_seq, num_items=num_items, seed=SEED)
    loader = DataLoader(ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0,
                        pin_memory=(device == "cuda"), collate_fn=collate_fn, drop_last=True)

    # 6) model/opt/amp
    tt = TwoTowerAlign(dim=512, dropout=0.1).to(device)
    opt = torch.optim.AdamW(tt.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scaler = torch.amp.GradScaler('cuda', enabled=(device == "cuda"))
    bce = nn.BCEWithLogitsLoss()

    # 7) mlflow (start once!)
    use_mlflow = False
    mlflow = None
    try:
        import mlflow as _mlflow
        mlflow = _mlflow
        if USE_MLFLOW:
            mlflow.set_tracking_uri(MLFLOW_URI)
            mlflow.set_experiment(MLFLOW_EXP)
            if mlflow.active_run() is not None:
                mlflow.end_run()
            mlflow.start_run(run_name="train_two_tower_align")
            use_mlflow = True
            print(f"[MLflow] ✅ connected: {MLFLOW_URI} exp={MLFLOW_EXP}")
    except Exception as e:
        use_mlflow = False
        print(f"[MLflow] ⚠️ disabled: {e}")

    if use_mlflow:
        mlflow.log_params({
            "sasrec_ckpt": SASREC_CKPT,
            "log_path": LOG_PATH,
            "clip_vec_json": CLIP_VEC_JSON,
            "max_user_events": MAX_USER_EVENTS,
            "maxlen": MAXLEN,
            "hidden": 512,
            "epochs": EPOCHS,
            "batch_size": BATCH_SIZE,
            "lr": LR,
            "weight_decay": WEIGHT_DECAY,
            "eval_neg": EVAL_NEG,
            "clip_filled": filled,
            "split_train_ratio": 0.8,
            "split_policy": "stratified_by_user_type(cold/normal/heavy)",
        })

    best = -1.0

    for epoch in range(1, EPOCHS + 1):
        tt.train()
        losses = []

        for uids, inps, pos, neg, full_len in tqdm(loader, desc=f"epoch {epoch}", leave=False):
            seq_pad = torch.tensor([right_align(inp, MAXLEN) for inp in inps], dtype=torch.long, device=device)
            pos = pos.to(device, non_blocking=True)
            neg = neg.to(device, non_blocking=True)

            with torch.no_grad():
                user_vec = sas.predict_last(seq_pad)  # [B,512]

            pos_clip = clip_mat[pos].to(torch.float32)
            neg_clip = clip_mat[neg].to(torch.float32)

            opt.zero_grad(set_to_none=True)

            with torch.amp.autocast('cuda', enabled=(device == "cuda")):
                pos_logit = tt(user_vec, pos_clip)
                neg_logit = tt(user_vec, neg_clip)
                loss = bce(pos_logit, torch.ones_like(pos_logit)) + bce(neg_logit, torch.zeros_like(neg_logit))

            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()

            losses.append(float(loss.detach().cpu().item()))

        avg_loss = float(np.mean(losses)) if losses else 0.0

        # ✅ eval은 val 유저로만
        tt.eval()
        metrics = evaluate(
            model_sas=sas,
            model_tt=tt,
            clip_mat=clip_mat.to(torch.float32),
            user_seq=val_user_seq,
            device=device,
            maxlen=MAXLEN,
            num_items=num_items,
            num_neg=EVAL_NEG,
            seed=SEED + epoch,
        )

        print(f"[Epoch {epoch:03d}] loss={avg_loss:.4f} | "
              f"HR@10={metrics['HR@10']:.4f} HR@20={metrics['HR@20']:.4f} "
              f"NDCG@10={metrics['NDCG@10']:.4f} NDCG@20={metrics['NDCG@20']:.4f}")

        if use_mlflow:
            safe = mlflow_safe_metrics(metrics)
            safe["train_loss"] = avg_loss
            mlflow.log_metrics(safe, step=epoch)

        if metrics["NDCG@10"] > best:
            best = metrics["NDCG@10"]
            save_obj = {
                "two_tower_state_dict": tt.state_dict(),
                "sasrec_ckpt": str(Path(SASREC_CKPT).resolve()),
                "config": {
                    "max_user_events": MAX_USER_EVENTS,
                    "maxlen": MAXLEN,
                    "hidden": 512,
                    "layers": LAYERS,
                    "heads": HEADS,
                    "dropout": DROPOUT,
                    "epochs": EPOCHS,
                    "batch_size": BATCH_SIZE,
                    "lr": LR,
                    "weight_decay": WEIGHT_DECAY,
                    "eval_neg": EVAL_NEG,
                    "seed": SEED,
                    "alpha_policy": {"cold": (0.9, 0.1), "normal": (0.7, 0.3), "heavy": (0.4, 0.6)},
                    "split_policy": "stratified_user_split 8:2 by type",
                },
                "idx2artwork": idx2artwork,
            }
            torch.save(save_obj, OUT_PTH)
            print(f"✅ Saved BEST -> {OUT_PTH} (best NDCG@10={best:.4f})")
            if use_mlflow:
                mlflow.log_artifact(OUT_PTH)

    if use_mlflow:
        mlflow.end_run()

    print("[Done] best NDCG@10 =", best)

if __name__ == "__main__":
    main()
