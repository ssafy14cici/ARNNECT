import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm


# =========================
# 1) Config (VRAM 6GB급 안전 설정)
# =========================
@dataclass
class Config:
    BASE_DIR: Path = Path(".")
    ITEM_FILE: Path = Path("artwork_embedding.json")
    USER_FILE: Path = Path("user_timestamp.jsonl")
    SAVE_PATH: Path = Path("best_recommend_model.pth")

    # Model
    VECTOR_DIM: int = 512
    MAX_SEQ_LEN: int = 120          # 200 -> 120 (VRAM 절약)
    NHEAD: int = 4
    FF_DIM: int = 768               # 1024 -> 768 (VRAM 절약)
    N_LAYERS: int = 2
    DROPOUT: float = 0.1

    # Train
    EPOCHS: int = 30
    LR: float = 5e-4
    WEIGHT_DECAY: float = 0.01

    # VRAM 6GB: batch 줄이고 grad_accum으로 “효과적 배치” 확보
    BATCH_SIZE: int = 24            # 64 -> 24
    GRAD_ACCUM_STEPS: int = 2       # effective batch = 48
    AMP: bool = True

    # Metrics
    K_LIST: Tuple[int, ...] = (5, 10, 20)
    SEED: int = 42

    # Split
    VAL_RATIO: float = 0.15

    @property
    def device(self) -> str:
        return "cuda" if torch.cuda.is_available() else "cpu"


cfg = Config()
print(f"[System] device={cfg.device}")


# =========================
# 2) Utils: load json/jsonl safely
# =========================
def load_json_or_jsonl(path: Path) -> List[dict]:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []

    # If it's a JSON array
    if text[0] == "[":
        return json.loads(text)

    # Else JSONL
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


set_seed(cfg.SEED)


# =========================
# 3) Data prepare
#   - item_id -> idx (int)
#   - user -> sequence (time-sorted)
#   - (seq, target) pairs
# =========================
def build_item_index(item_path: Path) -> Tuple[Dict[str, int], Dict[int, str], np.ndarray]:
    item_data = load_json_or_jsonl(item_path)

    item_to_idx = {"<PAD>": 0}
    idx_to_item = {0: "<PAD>"}
    vectors = [np.zeros(cfg.VECTOR_DIM, dtype=np.float32)]

    for it in item_data:
        iid = it.get("idx") or it.get("item_id")
        vec = it.get("vector")
        if iid is None or vec is None:
            continue
        if iid in item_to_idx:
            continue
        v = np.asarray(vec, dtype=np.float32)
        if v.shape[0] != cfg.VECTOR_DIM:
            continue
        new_idx = len(item_to_idx)
        item_to_idx[iid] = new_idx
        idx_to_item[new_idx] = iid
        vectors.append(v)

    return item_to_idx, idx_to_item, np.stack(vectors, axis=0)


def build_sequences(user_path: Path, item_to_idx: Dict[str, int]) -> Tuple[List[List[int]], List[int]]:
    logs = load_json_or_jsonl(user_path)

    # 가능한 필드명들 대응 (user_id/item_id/timestamp)
    # timestamp가 있으면 user별로 timestamp 기준 정렬.
    by_user: Dict[str, List[Tuple[Optional[float], int]]] = {}

    for r in logs:
        uid = r.get("user_id") or r.get("uid") or r.get("user")
        iid = r.get("item_id") or r.get("idx") or r.get("item")
        ts = r.get("timestamp") or r.get("ts")

        if uid is None or iid is None:
            continue
        if iid not in item_to_idx:
            continue

        it_idx = item_to_idx[iid]
        try:
            ts_val = float(ts) if ts is not None else None
        except:
            ts_val = None

        by_user.setdefault(uid, []).append((ts_val, it_idx))

    sequences: List[List[int]] = []
    targets: List[int] = []

    for uid, events in by_user.items():
        # timestamp 있으면 정렬, 없으면 입력 순서 유지
        if any(t is not None for t, _ in events):
            events.sort(key=lambda x: (x[0] is None, x[0]))
        history = [it for _, it in events]

        if len(history) < 2:
            continue

        seq = history[:-1]
        tgt = history[-1]

        if len(seq) > cfg.MAX_SEQ_LEN:
            seq = seq[-cfg.MAX_SEQ_LEN:]

        sequences.append(seq)
        targets.append(tgt)

    return sequences, targets


class RecDataset(Dataset):
    def __init__(self, sequences: List[List[int]], targets: List[int]):
        self.seqs = sequences
        self.tgts = targets

    def __len__(self):
        return len(self.seqs)

    def __getitem__(self, idx):
        seq = self.seqs[idx]
        tgt = self.tgts[idx]

        pad_len = cfg.MAX_SEQ_LEN - len(seq)
        if pad_len > 0:
            seq = [0] * pad_len + seq  # left padding

        return torch.tensor(seq, dtype=torch.long), torch.tensor(tgt, dtype=torch.long)


def train_val_split(seqs, tgts, val_ratio=0.15, seed=42):
    n = len(seqs)
    indices = list(range(n))
    rng = random.Random(seed)
    rng.shuffle(indices)
    val_n = int(n * val_ratio)
    val_idx = set(indices[:val_n])
    train_seqs, train_tgts, val_seqs, val_tgts = [], [], [], []
    for i in range(n):
        if i in val_idx:
            val_seqs.append(seqs[i])
            val_tgts.append(tgts[i])
        else:
            train_seqs.append(seqs[i])
            train_tgts.append(tgts[i])
    return train_seqs, train_tgts, val_seqs, val_tgts


# =========================
# 4) Model: TwoTowerSASRec (in-batch negative)
# =========================
class TwoTowerSASRec(nn.Module):
    def __init__(self, num_items: int, pretrained_vecs: np.ndarray):
        super().__init__()

        self.pretrained_emb = nn.Embedding.from_pretrained(
            torch.from_numpy(pretrained_vecs).float(),
            freeze=True,
            padding_idx=0,
        )

        self.item_adapter = nn.Sequential(
            nn.Linear(cfg.VECTOR_DIM, cfg.VECTOR_DIM),
            nn.LayerNorm(cfg.VECTOR_DIM),
            nn.GELU(),
        )

        self.position_embedding = nn.Embedding(cfg.MAX_SEQ_LEN, cfg.VECTOR_DIM)

        enc_layer = nn.TransformerEncoderLayer(
            d_model=cfg.VECTOR_DIM,
            nhead=cfg.NHEAD,
            dim_feedforward=cfg.FF_DIM,
            dropout=cfg.DROPOUT,
            batch_first=True,
            norm_first=True,
        )
        self.transformer_encoder = nn.TransformerEncoder(enc_layer, num_layers=cfg.N_LAYERS)
        self.ln_f = nn.LayerNorm(cfg.VECTOR_DIM)

    def get_item_vector(self, item_indices: torch.Tensor) -> torch.Tensor:
        raw = self.pretrained_emb(item_indices)
        adapted = self.item_adapter(raw)
        return raw + adapted

    def get_user_vector(self, sequence: torch.Tensor) -> torch.Tensor:
        # sequence: (B, L)
        seq_emb = self.get_item_vector(sequence)  # (B, L, D)

        positions = torch.arange(sequence.size(1), device=sequence.device).unsqueeze(0)
        x = seq_emb + self.position_embedding(positions)

        pad_mask = (sequence == 0)  # (B, L)
        out = self.transformer_encoder(x, src_key_padding_mask=pad_mask)

        # 마지막 토큰 위치 벡터 (left padding이므로 "마지막"은 실제 마지막 시점)
        return self.ln_f(out[:, -1, :])  # (B, D)

    def forward(self, sequence: torch.Tensor, target_item_ids: torch.Tensor) -> torch.Tensor:
        # target_item_ids: (B,)
        u = self.get_user_vector(sequence)                 # (B, D)
        v = self.get_item_vector(target_item_ids)          # (B, D)

        u = u / (u.norm(dim=-1, keepdim=True) + 1e-8)
        v = v / (v.norm(dim=-1, keepdim=True) + 1e-8)

        # in-batch negatives
        logits = torch.matmul(u, v.t()) * 10.0             # (B, B)
        return logits


# =========================
# 5) Metrics: HR/Hit@K, NDCG@K, MRR@K (in-batch setting)
# =========================
@torch.no_grad()
def compute_metrics_inbatch(logits: torch.Tensor, k_list=(10,)) -> Dict[str, float]:
    """
    logits: (B, B) where correct label for row i is column i.
    """
    B = logits.size(0)
    # ranks: 1..B (1 is best)
    # sort descending, find position of diagonal
    sorted_idx = torch.argsort(logits, dim=1, descending=True)  # (B, B)
    targets = torch.arange(B, device=logits.device).unsqueeze(1)  # (B,1)
    # position where sorted_idx == target
    hits_matrix = (sorted_idx == targets)  # (B,B) boolean
    # argmax gives index position (0-based) because there is exactly one True per row
    pos0 = torch.argmax(hits_matrix.to(torch.int64), dim=1)  # (B,)
    ranks = pos0 + 1  # (B,) 1-based

    out = {}
    for k in k_list:
        hit = (ranks <= k).float().mean().item()
        ndcg = ((ranks <= k).float() * (1.0 / torch.log2(ranks.float() + 1.0))).mean().item()
        mrr = ((ranks <= k).float() * (1.0 / ranks.float())).mean().item()
        out[f"Hit@{k}"] = hit
        out[f"NDCG@{k}"] = ndcg
        out[f"MRR@{k}"] = mrr
    return out


# =========================
# 6) Train loop (best by HR@10)
# =========================
def main():
    cfg.ITEM_FILE = cfg.BASE_DIR / cfg.ITEM_FILE
    cfg.USER_FILE = cfg.BASE_DIR / cfg.USER_FILE
    cfg.SAVE_PATH = cfg.BASE_DIR / cfg.SAVE_PATH

    item_to_idx, idx_to_item, pretrained = build_item_index(cfg.ITEM_FILE)
    seqs, tgts = build_sequences(cfg.USER_FILE, item_to_idx)

    print(f"[Data] items={len(item_to_idx)} | sequences={len(seqs)}")
    if len(seqs) == 0:
        raise RuntimeError("No training sequences. Check USER_FILE or item_id mapping.")

    tr_seqs, tr_tgts, va_seqs, va_tgts = train_val_split(seqs, tgts, cfg.VAL_RATIO, cfg.SEED)

    train_loader = DataLoader(RecDataset(tr_seqs, tr_tgts), batch_size=cfg.BATCH_SIZE, shuffle=True, drop_last=True)
    val_loader = DataLoader(RecDataset(va_seqs, va_tgts), batch_size=cfg.BATCH_SIZE, shuffle=False, drop_last=True)

    model = TwoTowerSASRec(num_items=len(item_to_idx), pretrained_vecs=pretrained).to(cfg.device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=cfg.LR, weight_decay=cfg.WEIGHT_DECAY)

    scaler = torch.cuda.amp.GradScaler(enabled=(cfg.AMP and cfg.device == "cuda"))

    best_hr10 = -1.0

    print(f"[Train] epochs={cfg.EPOCHS} | batch={cfg.BATCH_SIZE} | grad_accum={cfg.GRAD_ACCUM_STEPS} | amp={cfg.AMP}")

    for epoch in range(1, cfg.EPOCHS + 1):
        model.train()
        total_loss = 0.0
        step = 0
        optimizer.zero_grad(set_to_none=True)

        pbar = tqdm(train_loader, desc=f"Epoch {epoch}", leave=False)
        for batch_seq, batch_tgt in pbar:
            batch_seq = batch_seq.to(cfg.device)
            batch_tgt = batch_tgt.to(cfg.device)

            with torch.cuda.amp.autocast(enabled=(cfg.AMP and cfg.device == "cuda")):
                logits = model(batch_seq, batch_tgt)
                labels = torch.arange(logits.size(0), device=cfg.device)
                loss = criterion(logits, labels)
                loss = loss / cfg.GRAD_ACCUM_STEPS

            scaler.scale(loss).backward()

            if (step + 1) % cfg.GRAD_ACCUM_STEPS == 0:
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)

            total_loss += loss.item() * cfg.GRAD_ACCUM_STEPS
            step += 1
            pbar.set_postfix(loss=f"{total_loss/step:.4f}")

        avg_loss = total_loss / max(1, step)

        # ----- Validation -----
        model.eval()
        agg = {f"Hit@{k}": 0.0 for k in cfg.K_LIST}
        agg.update({f"NDCG@{k}": 0.0 for k in cfg.K_LIST})
        agg.update({f"MRR@{k}": 0.0 for k in cfg.K_LIST})
        n_batches = 0

        with torch.no_grad():
            for v_seq, v_tgt in val_loader:
                v_seq = v_seq.to(cfg.device)
                v_tgt = v_tgt.to(cfg.device)

                with torch.cuda.amp.autocast(enabled=(cfg.AMP and cfg.device == "cuda")):
                    v_logits = model(v_seq, v_tgt)

                m = compute_metrics_inbatch(v_logits, cfg.K_LIST)
                for k, v in m.items():
                    agg[k] += v
                n_batches += 1

        if n_batches > 0:
            for k in list(agg.keys()):
                agg[k] /= n_batches

        hr10 = agg.get("Hit@10", 0.0)

        # Print one-line summary (보기 좋게)
        msg = [f"[epoch {epoch}] loss={avg_loss:.4f}"]
        for k in cfg.K_LIST:
            msg.append(f"Hit@{k}={agg[f'Hit@{k}']:.4f}")
        for k in cfg.K_LIST:
            msg.append(f"NDCG@{k}={agg[f'NDCG@{k}']:.4f}")
        for k in cfg.K_LIST:
            msg.append(f"MRR@{k}={agg[f'MRR@{k}']:.4f}")
        print(" | ".join(msg))

        # best by HR@10
        if hr10 > best_hr10:
            best_hr10 = hr10
            torch.save(model.state_dict(), cfg.SAVE_PATH)
            print(f"  🌟 Best saved: {cfg.SAVE_PATH} (best Hit@10={best_hr10:.4f})")

    print(f"[Done] best Hit@10={best_hr10:.4f} | saved={cfg.SAVE_PATH}")


if __name__ == "__main__":
    main()
