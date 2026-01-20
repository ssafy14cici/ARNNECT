import json
import random
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn


# =========================
# Config
# =========================
MODEL_PATH = Path("best_recommend_model.pth")
EMB_PATH = Path("artwork_embedding.json")                 # ✅ 학습 때 사용한 "작품 임베딩" 목록
LOG_PATH = Path("validation_dummy_user_timestamp.jsonl")  # 유저 로그
ARTWORK_META_PATH = Path("artwork_data.jsonl")            # 출력용 메타 (artist/url 등)

VECTOR_DIM = 512
MAX_SEQ_LEN = 120
NHEAD = 4
FF_DIM = 768
N_LAYERS = 2
DROPOUT = 0.1
TOPK = 20

SEED = 42
random.seed(SEED)

# 유저 그룹 기준(원하면 조정)
COLD_MAX = 5
HEAVY_MIN = 50


# =========================
# Model (학습 코드와 동일 구조)
# =========================
class TwoTowerSASRec(nn.Module):
    def __init__(self, pretrained_vecs: np.ndarray):
        super().__init__()
        self.pretrained_emb = nn.Embedding.from_pretrained(
            torch.from_numpy(pretrained_vecs).float(),
            freeze=True,
            padding_idx=0,
        )
        self.item_adapter = nn.Sequential(
            nn.Linear(VECTOR_DIM, VECTOR_DIM),
            nn.LayerNorm(VECTOR_DIM),
            nn.GELU(),
        )
        self.position_embedding = nn.Embedding(MAX_SEQ_LEN, VECTOR_DIM)

        enc_layer = nn.TransformerEncoderLayer(
            d_model=VECTOR_DIM,
            nhead=NHEAD,
            dim_feedforward=FF_DIM,
            dropout=DROPOUT,
            batch_first=True,
            norm_first=True,
        )
        self.transformer_encoder = nn.TransformerEncoder(enc_layer, num_layers=N_LAYERS)
        self.ln_f = nn.LayerNorm(VECTOR_DIM)

    def get_item_vector(self, item_indices: torch.Tensor) -> torch.Tensor:
        raw = self.pretrained_emb(item_indices)
        adapted = self.item_adapter(raw)
        return raw + adapted

    def get_user_vector(self, sequence: torch.Tensor) -> torch.Tensor:
        seq_emb = self.get_item_vector(sequence)
        positions = torch.arange(sequence.size(1), device=sequence.device).unsqueeze(0)
        x = seq_emb + self.position_embedding(positions)
        pad_mask = (sequence == 0)
        out = self.transformer_encoder(x, src_key_padding_mask=pad_mask)
        u = self.ln_f(out[:, -1, :])
        u = u / (u.norm(dim=-1, keepdim=True) + 1e-8)
        return u


# =========================
# Helpers
# =========================
def load_jsonl(path: Path):
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_item_index_from_embedding(emb_path: Path):
    """
    ✅ 가장 중요:
    학습 때 사용한 item index 기준을 "artwork_embedding.json"으로 고정.
    """
    data = json.loads(emb_path.read_text(encoding="utf-8"))

    item_to_idx = {"<PAD>": 0}
    idx_to_item = {0: "<PAD>"}
    vecs = [np.zeros((VECTOR_DIM,), dtype=np.float32)]

    for r in data:
        iid = r.get("idx") or r.get("item_id") or r.get("artwork_id")
        v = r.get("vector")
        if not iid or v is None:
            continue
        if iid in item_to_idx:
            continue

        v = np.asarray(v, dtype=np.float32)
        if v.shape[0] != VECTOR_DIM:
            continue

        new_i = len(item_to_idx)
        item_to_idx[iid] = new_i
        idx_to_item[new_i] = iid
        vecs.append(v)

    mat = np.stack(vecs, axis=0)  # (N, 512)
    return item_to_idx, idx_to_item, mat


def build_meta_lookup(meta_path: Path):
    """
    출력용: item_id -> (artist_id, artwork_url/image_path)
    meta에 없는 작품도 있을 수 있으니 fallback 고려.
    """
    rows = load_jsonl(meta_path)
    m = {}
    for r in rows:
        iid = r.get("idx") or r.get("item_id") or r.get("artwork_id")
        if not iid:
            continue
        m[iid] = r
    return m, rows


def left_pad(seq_idx, max_len):
    seq_idx = seq_idx[-max_len:]
    if len(seq_idx) < max_len:
        seq_idx = [0] * (max_len - len(seq_idx)) + seq_idx
    return seq_idx


@torch.no_grad()
def recommend_topk(model, user_seq_idx, item_vecs_torch, topk=20, device="cuda"):
    seq = torch.tensor([user_seq_idx], dtype=torch.long, device=device)  # (1,L)
    u = model.get_user_vector(seq)  # (1,D)

    scores = (u @ item_vecs_torch.t()).squeeze(0)  # (N,)
    scores[0] = -1e9  # PAD 제외

    topv, topi = torch.topk(scores, k=topk)
    return topi.cpu().tolist(), topv.cpu().tolist()


@torch.no_grad()
def hit10_leave_one_out(model, user_hist_idx, gt_idx, item_vecs_torch, device="cuda"):
    seq = torch.tensor([user_hist_idx], dtype=torch.long, device=device)
    u = model.get_user_vector(seq)
    scores = (u @ item_vecs_torch.t()).squeeze(0)
    scores[0] = -1e9

    gt_score = scores[gt_idx].item()
    rank = int((scores > gt_score).sum().item()) + 1
    hit10 = 1.0 if rank <= 10 else 0.0
    return hit10, rank


def group_users(by_user):
    cold, normal, heavy = [], [], []
    for u, ev in by_user.items():
        n = len(ev)
        if n <= COLD_MAX:
            cold.append(u)
        elif n >= HEAVY_MIN:
            heavy.append(u)
        else:
            normal.append(u)
    return cold, normal, heavy


def pick(lst, n=3):
    if len(lst) <= n:
        return lst
    return random.sample(lst, n)


# =========================
# Main
# =========================
def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[System] device={device}")

    for p in [MODEL_PATH, EMB_PATH, LOG_PATH, ARTWORK_META_PATH]:
        if not p.exists():
            raise FileNotFoundError(f"Missing file: {p}")

    # ✅ 1) item index + pretrained matrix는 embedding 파일 기준으로 생성
    item_to_idx, idx_to_item, pretrained = build_item_index_from_embedding(EMB_PATH)

    # 모델 체크포인트가 기대하는 N 확인
    ckpt = torch.load(MODEL_PATH, map_location="cpu")
    ckpt_n = ckpt["pretrained_emb.weight"].shape[0] if "pretrained_emb.weight" in ckpt else None

    print(f"[INFO] items(from embedding)={len(item_to_idx)} | pretrained_shape={pretrained.shape}")
    if ckpt_n is not None and ckpt_n != pretrained.shape[0]:
        print(f"[WARN] checkpoint expects num_items={ckpt_n}, but embedding has {pretrained.shape[0]}")
        print("       => 학습 때 사용한 artwork_embedding.json이 지금 파일과 다를 가능성이 큼.")
        print("       => 학습 당시 embedding 파일 그대로 inference 폴더에 가져와야 100% 일치합니다.")

    # ✅ 2) meta는 출력용으로만
    meta_lookup, meta_rows = build_meta_lookup(ARTWORK_META_PATH)
    print(f"[INFO] meta_rows={len(meta_rows)}")

    # ✅ 3) model 생성/로드
    model = TwoTowerSASRec(pretrained_vecs=pretrained).to(device)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device), strict=True)
    model.eval()
    print(f"[OK] loaded weight: {MODEL_PATH}")

    # ✅ 4) item vecs normalize once
    item_vecs = torch.from_numpy(pretrained).to(device)
    item_vecs = item_vecs / (item_vecs.norm(dim=1, keepdim=True) + 1e-8)
    print(f"[OK] precomputed item vecs: shape={tuple(item_vecs.shape)}")

    # ✅ 5) user logs (user_id, artwork_id, timestamp) -> item_idx 시퀀스
    rows = load_jsonl(LOG_PATH)
    print(f"[INFO] log_rows={len(rows)}")

    by_user = defaultdict(list)
    skipped = 0

    for r in rows:
        uid = r.get("user_id")
        iid = r.get("item_id") or r.get("artwork_id") or r.get("idx")
        ts = r.get("timestamp", 0)

        if not uid or not iid:
            skipped += 1
            continue
        if iid not in item_to_idx:
            # meta에는 있는데 embedding엔 없는 작품일 수 있음
            skipped += 1
            continue

        by_user[uid].append((ts, item_to_idx[iid], iid))

    for u in by_user:
        by_user[u].sort(key=lambda x: x[0])

    print(f"[INFO] users={len(by_user)} | skipped_logs={skipped}")

    cold, normal, heavy = group_users(by_user)
    picked = {
        "COLD": pick(cold, 3),
        "NORMAL": pick(normal, 3),
        "HEAVY": pick(heavy, 3),
    }
    print("[INFO] picked users:", picked)

    # ✅ 6) validate + recommend top20 출력
    for g, users in picked.items():
        if not users:
            print(f"\n[{g}] no users found (threshold too strict?)")
            continue

        print(f"\n========== [{g}] ==========")
        for uid in users:
            events = by_user[uid]
            hist = [idx for _, idx, _ in events]
            if len(hist) < 2:
                print(f"- {uid}: not enough history")
                continue

            gt_idx = hist[-1]
            seq_idx = left_pad(hist[:-1], MAX_SEQ_LEN)

            hit10, rank = hit10_leave_one_out(model, seq_idx, gt_idx, item_vecs, device=device)
            gt_item_id = idx_to_item[gt_idx]

            top_idx, top_scores = recommend_topk(model, seq_idx, item_vecs, topk=TOPK, device=device)

            print(f"\n[USER] {uid} | n_logs={len(hist)} | GT={gt_item_id} | Hit@10={int(hit10)} | GT_rank={rank}")
            print(f"[TOP{TOPK}] artwork_id | artist_id | artwork_url/image_path | score")

            for i, (it_i, sc) in enumerate(zip(top_idx, top_scores), start=1):
                item_id = idx_to_item[it_i]
                m = meta_lookup.get(item_id, {})

                artist_id = m.get("artist_id") or m.get("artist") or ""
                artwork_url = m.get("artwork_url") or m.get("url") or m.get("image_path") or ""

                print(f"{i:2d} {item_id} {artist_id} {artwork_url} {sc:.4f}")


if __name__ == "__main__":
    main()
