import argparse
import json
import math
import os
import random
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm

# =========================
# 0) SASRec (커스텀 블록) - 너가 쓰기로 한 "1번" 구현
# =========================
class PointWiseFeedForward(nn.Module):
    def __init__(self, hidden: int, dropout: float):
        super().__init__()
        self.conv1 = nn.Conv1d(hidden, hidden, kernel_size=1)
        self.conv2 = nn.Conv1d(hidden, hidden, kernel_size=1)
        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()

    def forward(self, x):
        y = x.transpose(1, 2)           # [B, H, T]
        y = self.dropout(self.relu(self.conv1(y)))
        y = self.dropout(self.conv2(y))
        y = y.transpose(1, 2)           # [B, T, H]
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

        self.blocks = nn.ModuleList([
            SASRecBlock(hidden=hidden, heads=heads, dropout=dropout) for _ in range(layers)
        ])

        self.register_buffer("causal_mask", torch.triu(torch.ones(maxlen, maxlen, dtype=torch.bool), diagonal=1))
        self._reset_parameters()

    def _reset_parameters(self):
        nn.init.normal_(self.item_emb.weight, std=0.02)
        nn.init.normal_(self.pos_emb.weight, std=0.02)

    def forward(self, seq):
        """
        seq: [B, T] item indices (0 padding), right-aligned 권장
        return: [B, T, H]
        """
        B, T = seq.size()
        pos = torch.arange(T, device=seq.device).unsqueeze(0).expand(B, T)

        x = self.item_emb(seq) + self.pos_emb(pos)
        x = self.dropout(self.ln(x))

        attn_mask = self.causal_mask[:T, :T]
        for blk in self.blocks:
            x = blk(x, attn_mask=attn_mask)
        return x

    @torch.no_grad()
    def predict_last(self, seq):
        h = self.forward(seq)
        return h[:, -1, :]

    @torch.no_grad()
    def score_candidates(self, seq, cands):
        """
        seq: [B, T]
        cands: [B, K] or [K]
        return: [B, K]
        """
        if cands.dim() == 1:
            cands = cands.unsqueeze(0).expand(seq.size(0), -1)

        u = self.predict_last(seq)                      # [B, H]
        v = self.item_emb(cands)                        # [B, K, H]
        return (v * u.unsqueeze(1)).sum(-1)             # [B, K]


# =========================
# 1) Utils
# =========================
def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

def parse_ts(ts: str) -> int:
    """
    timestamp 문자열 -> 정렬 가능한 정수(분 단위)로 변환
    네 포맷: '2026-01-15 20:13' 가정.
    """
    if ts is None:
        return 0
    ts = ts.strip()
    # 자주 쓰는 포맷들
    fmts = ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y/%m/%d %H:%M:%S"]
    for fmt in fmts:
        try:
            dt = datetime.strptime(ts, fmt)
            return int(dt.timestamp())
        except ValueError:
            pass
    # ISO fallback
    try:
        dt = datetime.fromisoformat(ts)
        return int(dt.timestamp())
    except Exception:
        # 파싱 실패하면 입력 순서 유지용 0
        return 0

def load_logs(path: str) -> List[dict]:
    """
    JSON(list) 또는 JSONL 둘 다 읽기
    각 row는 {user_id, artwork_id, timestamp} 만 필요
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"로그 파일 없음: {p.resolve()}")

    text = p.read_text(encoding="utf-8").lstrip()
    if text.startswith("["):
        return json.loads(text)

    # JSONL
    out = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out

# =========================
# 2) Build sequences + mapping
# =========================
def build_user_sequences(
    logs: List[dict],
    max_user_events: int,
) -> Tuple[Dict[str, List[str]], List[str]]:
    """
    user_id -> [artwork_id, ...] (timestamp 기준 정렬)
    """
    by_user = defaultdict(list)
    all_artworks = set()

    for r in logs:
        uid = str(r["user_id"])
        aid = str(r["artwork_id"])
        t = parse_ts(r.get("timestamp", ""))
        by_user[uid].append((t, aid))
        all_artworks.add(aid)

    user_seq = {}
    for uid, arr in by_user.items():
        arr.sort(key=lambda x: x[0])
        seq = [aid for _, aid in arr]
        # 최대 200회 정책 적용 (최근 max_user_events만 유지)
        if len(seq) > max_user_events:
            seq = seq[-max_user_events:]
        user_seq[uid] = seq

    return user_seq, sorted(list(all_artworks))

def make_item_mapping(artworks: List[str]) -> Tuple[Dict[str, int], List[str]]:
    """
    artwork_id -> index (1..N), 0은 padding
    idx2artwork[0] = "<PAD>"
    """
    idx2 = ["<PAD>"] + artworks
    a2i = {aid: i for i, aid in enumerate(idx2) if i > 0}
    return a2i, idx2

# =========================
# 3) Dataset
# =========================
class SASRecTrainDataset(Dataset):
    """
    한 유저당 하나 샘플(전체 시퀀스) 반환:
      seq: [T] (0 padding, right-aligned)
      pos: [T] (다음 아이템)
      neg: [T] (negative item)
    """
    def __init__(self, user_train: Dict[str, List[int]], num_items: int, maxlen: int):
        self.users = list(user_train.keys())
        self.user_train = user_train
        self.num_items = num_items
        self.maxlen = maxlen

    def __len__(self):
        return len(self.users)

    def __getitem__(self, idx):
        uid = self.users[idx]
        items = self.user_train[uid]
        # items 길이는 최소 2 이상이어야 의미 있음
        seq = np.zeros((self.maxlen,), dtype=np.int64)
        pos = np.zeros((self.maxlen,), dtype=np.int64)
        neg = np.zeros((self.maxlen,), dtype=np.int64)

        nxt = items[-1]
        t = self.maxlen - 1

        item_set = set(items)
        for i in reversed(items[:-1]):
            seq[t] = i
            pos[t] = nxt

            # negative sampling
            while True:
                n = np.random.randint(1, self.num_items + 1)
                if n not in item_set:
                    break
            neg[t] = n

            nxt = i
            t -= 1
            if t < 0:
                break

        return torch.from_numpy(seq), torch.from_numpy(pos), torch.from_numpy(neg)

def split_train_valid_test(user_seq_idx: Dict[str, List[int]]):
    """
    leave-one-out split:
      train: seq[:-2]
      valid: seq[-2]
      test : seq[-1]
    """
    train = {}
    valid = {}
    test = {}
    for uid, seq in user_seq_idx.items():
        if len(seq) < 3:
            continue
        train[uid] = seq[:-2]
        valid[uid] = seq[-2]
        test[uid] = seq[-1]
    return train, valid, test

# =========================
# 4) Eval metrics (HR/NDCG)
# =========================
def hr_ndcg_at_k(ranks: List[int], k: int) -> Tuple[float, float]:
    hr = 0.0
    ndcg = 0.0
    for r in ranks:
        if r <= k:
            hr += 1.0
            ndcg += 1.0 / math.log2(r + 1)
    n = max(len(ranks), 1)
    return hr / n, ndcg / n

@torch.no_grad()
def evaluate(
    model: SASRec,
    train_seq: Dict[str, List[int]],
    holdout: Dict[str, int],
    num_items: int,
    maxlen: int,
    neg_k: int,
    device: str,
):
    """
    각 유저에 대해:
      history = train_seq[uid]
      target  = holdout[uid]
      candidates = [target] + negs
      rank 계산
    """
    model.eval()
    all_items = list(range(1, num_items + 1))
    ranks = []

    uids = list(holdout.keys())
    for uid in tqdm(uids, desc="eval", leave=False):
        hist = train_seq.get(uid, [])
        if len(hist) < 1:
            continue

        target = holdout[uid]
        seen = set(hist)
        # negative sample
        negs = []
        while len(negs) < neg_k:
            x = random.choice(all_items)
            if x != target and x not in seen:
                negs.append(x)

        cands = [target] + negs
        cands_t = torch.tensor(cands, dtype=torch.long, device=device).unsqueeze(0)  # [1, K]

        # build seq tensor (right-aligned)
        seq_cut = hist[-maxlen:]
        pad = [0] * (maxlen - len(seq_cut))
        seq_t = torch.tensor([pad + seq_cut], dtype=torch.long, device=device)        # [1, T]

        scores = model.score_candidates(seq_t, cands_t)  # [1, K]
        scores = scores.squeeze(0).detach().cpu().numpy()

        order = np.argsort(-scores)  # desc
        rank = int(np.where(order == 0)[0][0]) + 1       # target is at index 0
        ranks.append(rank)

    hr10, ndcg10 = hr_ndcg_at_k(ranks, 10)
    hr20, ndcg20 = hr_ndcg_at_k(ranks, 20)
    return {"HR@10": hr10, "NDCG@10": ndcg10, "HR@20": hr20, "NDCG@20": ndcg20}

# =========================
# 5) Training
# =========================
@dataclass
class TrainConfig:
    log_path: str
    out_pth: str
    seed: int = 42

    # data policy
    max_user_events: int = 200   # 유저당 최대 기록 정책(요청)
    maxlen: int = 50            # 모델 입력 길이(학습/추론 동일)

    # model
    hidden: int = 128
    layers: int = 2
    heads: int = 8
    dropout: float = 0.2

    # train
    epochs: int = 50
    batch_size: int = 128
    lr: float = 1e-3
    weight_decay: float = 1e-4

    # eval
    eval_neg: int = 100

def train(cfg: TrainConfig):
    set_seed(cfg.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[System] device={device}")

    # 1) load logs
    logs = load_logs(cfg.log_path)
    # required keys check
    for k in ["user_id", "artwork_id", "timestamp"]:
        if k not in logs[0]:
            raise KeyError(f"로그에 '{k}' 키가 없습니다. 현재 keys={list(logs[0].keys())}")

    # 2) build user sequences (string)
    user_seq_str, artworks = build_user_sequences(logs, max_user_events=cfg.max_user_events)

    # 3) filter users with <2
    user_seq_str = {u: s for u, s in user_seq_str.items() if len(s) >= 2}
    print(f"[Data] users(after len>=2) = {len(user_seq_str)}")

    # 4) mapping
    artwork2idx, idx2artwork = make_item_mapping(artworks)
    num_items = len(idx2artwork) - 1
    print(f"[Data] num_items={num_items} (+PAD)")

    # 5) convert sequences to idx
    user_seq_idx = {u: [artwork2idx[a] for a in s if a in artwork2idx] for u, s in user_seq_str.items()}
    user_seq_idx = {u: s for u, s in user_seq_idx.items() if len(s) >= 3}  # train/valid/test split 위해 최소 3
    print(f"[Data] users(after len>=3) = {len(user_seq_idx)}")

    train_seq, valid_item, test_item = split_train_valid_test(user_seq_idx)
    print(f"[Split] train_users={len(train_seq)} valid_users={len(valid_item)} test_users={len(test_item)}")

    # 6) dataloader
    train_dataset = SASRecTrainDataset(train_seq, num_items=num_items, maxlen=cfg.maxlen)
    train_loader = DataLoader(train_dataset, batch_size=cfg.batch_size, shuffle=True, num_workers=0, pin_memory=True)

    # 7) model
    assert cfg.hidden % cfg.heads == 0, "hidden은 heads로 나누어 떨어져야 합니다."
    model = SASRec(
        num_items=num_items,
        maxlen=cfg.maxlen,
        hidden=cfg.hidden,
        layers=cfg.layers,
        heads=cfg.heads,
        dropout=cfg.dropout,
    ).to(device)

    opt = torch.optim.AdamW(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)

    best_score = -1.0

    for epoch in range(1, cfg.epochs + 1):
        model.train()
        losses = []

        for seq, pos, neg in tqdm(train_loader, desc=f"epoch {epoch}", leave=False):
            seq = seq.to(device)
            pos = pos.to(device)
            neg = neg.to(device)

            h = model(seq)  # [B, T, H]
            pos_emb = model.item_emb(pos)  # [B, T, H]
            neg_emb = model.item_emb(neg)  # [B, T, H]

            pos_logits = (h * pos_emb).sum(-1)  # [B, T]
            neg_logits = (h * neg_emb).sum(-1)  # [B, T]

            mask = (pos > 0).float()            # [B, T]

            # BCE with logits (pos=1, neg=0)
            loss_pos = F.binary_cross_entropy_with_logits(pos_logits, torch.ones_like(pos_logits), reduction="none")
            loss_neg = F.binary_cross_entropy_with_logits(neg_logits, torch.zeros_like(neg_logits), reduction="none")

            loss = ((loss_pos + loss_neg) * mask).sum() / mask.sum().clamp(min=1.0)

            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            opt.step()

            losses.append(float(loss.detach().cpu().item()))

        # eval on valid (HR/NDCG)
        val_metrics = evaluate(
            model=model,
            train_seq={u: (train_seq[u] + [valid_item[u]])[:-1] for u in valid_item.keys()},  # history= train + valid? (leak 방지용으로는 train만 쓰기도 함)
            holdout=valid_item,
            num_items=num_items,
            maxlen=cfg.maxlen,
            neg_k=cfg.eval_neg,
            device=device,
        )

        avg_loss = float(np.mean(losses)) if losses else 0.0
        print(f"[Epoch {epoch}] loss={avg_loss:.4f} | " +
              " ".join([f"{k}={v:.4f}" for k, v in val_metrics.items()]))

        # best by HR@20 (원하면 NDCG@20로 바꿔도 됨)
        score = val_metrics["HR@20"]
        if score > best_score:
            best_score = score
            save_obj = {
                "state_dict": model.state_dict(),
                "config": asdict(cfg),
                "num_items": num_items,
                "maxlen": cfg.maxlen,
                "hidden": cfg.hidden,
                "layers": cfg.layers,
                "heads": cfg.heads,
                "dropout": cfg.dropout,
                "idx2artwork": idx2artwork,  # index -> artwork_id
                # artwork2idx는 서버에서 idx2로 재구성 가능하지만 같이 넣어도 됨
                "artwork2idx": artwork2idx,
                "best_val": {"epoch": epoch, **val_metrics},
            }
            torch.save(save_obj, cfg.out_pth)
            print(f"✅ Saved BEST checkpoint -> {cfg.out_pth} (HR@20={best_score:.4f})")

    # final test with best ckpt
    ckpt = torch.load(cfg.out_pth, map_location=device)
    model.load_state_dict(ckpt["state_dict"])
    test_metrics = evaluate(
        model=model,
        train_seq={u: train_seq[u] + [valid_item[u]] for u in test_item.keys() if u in valid_item},  # history=train+valid
        holdout=test_item,
        num_items=num_items,
        maxlen=cfg.maxlen,
        neg_k=cfg.eval_neg,
        device=device,
    )
    print("\n=== FINAL TEST ===")
    for k, v in test_metrics.items():
        print(f"{k}: {v:.4f}")
    print(f"BEST CKPT: {cfg.out_pth}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--log_path",
        default="train_user_logs.json",
        type=str,
        help="학습 로그 파일 경로 (JSON 또는 JSONL)"
    )
    ap.add_argument("--out_pth", default="BEST_SASRec_model.pth")
    ap.add_argument("--max_user_events", type=int, default=200)
    ap.add_argument("--maxlen", type=int, default=50)
    ap.add_argument("--hidden", type=int, default=128)
    ap.add_argument("--layers", type=int, default=2)
    ap.add_argument("--heads", type=int, default=8)
    ap.add_argument("--dropout", type=float, default=0.2)
    ap.add_argument("--epochs", type=int, default=50)
    ap.add_argument("--batch_size", type=int, default=128)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--weight_decay", type=float, default=1e-4)
    ap.add_argument("--eval_neg", type=int, default=100)
    args = ap.parse_args()

    # (위 라인은 실수 방지용. 아래에서 cfg를 올바르게 구성)
    cfg = TrainConfig(
        log_path=ap.parse_args().log_path,
        out_pth=ap.parse_args().out_pth,
        max_user_events=ap.parse_args().max_user_events,
        maxlen=ap.parse_args().maxlen,
        hidden=ap.parse_args().hidden,
        layers=ap.parse_args().layers,
        heads=ap.parse_args().heads,
        dropout=ap.parse_args().dropout,
        epochs=ap.parse_args().epochs,
        batch_size=ap.parse_args().batch_size,
        lr=ap.parse_args().lr,
        weight_decay=ap.parse_args().weight_decay,
        eval_neg=ap.parse_args().eval_neg,
    )

    train(cfg)

if __name__ == "__main__":
    main()
