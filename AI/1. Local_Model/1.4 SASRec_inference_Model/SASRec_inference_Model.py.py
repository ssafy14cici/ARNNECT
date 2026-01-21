import argparse
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn


# =========================
# SASRec (학습과 동일 구현이어야 함)
# =========================
class PointWiseFeedForward(nn.Module):
    def __init__(self, hidden: int, dropout: float):
        super().__init__()
        self.conv1 = nn.Conv1d(hidden, hidden, kernel_size=1)
        self.conv2 = nn.Conv1d(hidden, hidden, kernel_size=1)
        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()

    def forward(self, x):
        y = x.transpose(1, 2)  # [B, H, T]
        y = self.dropout(self.relu(self.conv1(y)))
        y = self.dropout(self.conv2(y))
        y = y.transpose(1, 2)  # [B, T, H]
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

        self.blocks = nn.ModuleList([SASRecBlock(hidden=hidden, heads=heads, dropout=dropout) for _ in range(layers)])
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


# =========================
# Utils
# =========================
def parse_ts(ts: str) -> int:
    """
    정렬용 timestamp 파싱. 실패하면 0 처리(입력 순서에 덜 의존하도록).
    """
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


def load_logs_auto(path: str):
    """
    JSON(list) or JSONL 지원.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"입력 로그 파일을 찾을 수 없습니다: {p.resolve()}")

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


def build_user_sequences(logs, max_user_events: int):
    """
    user_id -> (timestamp 정렬된) artwork_id 시퀀스
    """
    by_user = defaultdict(list)

    for r in logs:
        uid = str(r.get("user_id", "")).strip()
        if not uid:
            continue

        # artwork_id 우선, 없으면 item_id를 artwork_id로 취급
        aid = r.get("artwork_id", None)
        if aid is None:
            aid = r.get("item_id", None)
        if aid is None:
            continue
        aid = str(aid).strip()

        t = parse_ts(r.get("timestamp", ""))
        by_user[uid].append((t, aid))

    user_seq = {}
    for uid, arr in by_user.items():
        arr.sort(key=lambda x: x[0])
        seq = [aid for _, aid in arr]
        # 유저당 최대 기록 정책(최근 max_user_events개만)
        if len(seq) > max_user_events:
            seq = seq[-max_user_events:]
        user_seq[uid] = seq

    return user_seq


def right_align(seq_idx, maxlen: int):
    seq_idx = seq_idx[-maxlen:]
    return [0] * (maxlen - len(seq_idx)) + seq_idx


@torch.no_grad()
def recommend_topk_for_user(model: SASRec, seq_artworks, artwork2idx, idx2artwork, maxlen, topk, device):
    # 시퀀스를 index로 변환 (매핑 없는 건 스킵)
    seq_idx = [artwork2idx[a] for a in seq_artworks if a in artwork2idx]
    if len(seq_idx) < 1:
        return []

    seq_t = torch.tensor([right_align(seq_idx, maxlen)], dtype=torch.long, device=device)  # [1, T]
    user_vec = model.predict_last(seq_t).squeeze(0)  # [H]

    # 전체 아이템 점수 계산: (num_items+1, H) @ (H) -> (num_items+1)
    item_mat = model.item_emb.weight  # [N+1, H]
    scores = torch.matmul(item_mat, user_vec).detach().cpu().numpy()

    # PAD(0) + 이미 본 아이템 제외
    scores[0] = -1e18
    seen = set(seq_idx)
    for s in seen:
        if 0 <= s < len(scores):
            scores[s] = -1e18

    top_idx = np.argsort(-scores)[:topk]
    recs = []
    for rank, idx in enumerate(top_idx, 1):
        recs.append({
            "rank": rank,
            "artwork_id": idx2artwork[idx],
            "score": float(scores[idx]),
        })
    return recs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="user_logs.json", help="입력 로그 파일 (JSON list 또는 JSONL)")
    ap.add_argument("--output", default="user_inf_logs.json", help="출력 추천 결과 JSON")
    ap.add_argument("--ckpt", default="BEST_SASRec_model.pth", help="학습된 SASRec 체크포인트(.pth)")
    ap.add_argument("--topk", type=int, default=5, help="유저별 추천 상위 K")
    ap.add_argument("--max_user_events", type=int, default=200, help="유저당 최대 로그 사용 개수(최근 N개)")
    ap.add_argument("--print_limit", type=int, default=10, help="콘솔에 출력할 유저 수 제한(0이면 전부)")
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 1) Load checkpoint
    ckpt_path = Path(args.ckpt)
    if not ckpt_path.exists():
        raise FileNotFoundError(f"체크포인트(.pth) 파일이 없습니다: {ckpt_path.resolve()}")

    ckpt = torch.load(ckpt_path, map_location=device)
    num_items = int(ckpt["num_items"])
    maxlen = int(ckpt.get("maxlen", ckpt.get("config", {}).get("maxlen", 50)))
    hidden = int(ckpt.get("hidden", ckpt.get("config", {}).get("hidden", 128)))
    layers = int(ckpt.get("layers", ckpt.get("config", {}).get("layers", 2)))
    heads = int(ckpt.get("heads", ckpt.get("config", {}).get("heads", 8)))
    dropout = float(ckpt.get("dropout", ckpt.get("config", {}).get("dropout", 0.2)))

    idx2artwork = ckpt["idx2artwork"]
    artwork2idx = ckpt.get("artwork2idx", None)
    if artwork2idx is None:
        artwork2idx = {aid: i for i, aid in enumerate(idx2artwork) if i > 0}

    model = SASRec(num_items=num_items, maxlen=maxlen, hidden=hidden, layers=layers, heads=heads, dropout=dropout).to(device)
    model.load_state_dict(ckpt["state_dict"], strict=True)
    model.eval()

    # 2) Load logs
    logs = load_logs_auto(args.input)
    user_seq = build_user_sequences(logs, max_user_events=args.max_user_events)

    # 3) Recommend for each user
    out = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "input_file": str(Path(args.input).resolve()),
        "ckpt_file": str(ckpt_path.resolve()),
        "topk": args.topk,
        "model_config": {
            "num_items": num_items,
            "maxlen": maxlen,
            "hidden": hidden,
            "layers": layers,
            "heads": heads,
            "dropout": dropout,
        },
        "results": []
    }

    uids = sorted(user_seq.keys())
    for uid in uids:
        recs = recommend_topk_for_user(
            model=model,
            seq_artworks=user_seq[uid],
            artwork2idx=artwork2idx,
            idx2artwork=idx2artwork,
            maxlen=maxlen,
            topk=args.topk,
            device=device,
        )
        out["results"].append({
            "user_id": uid,
            "history_len": len(user_seq[uid]),
            "recommendations": recs
        })

    # 4) Save output JSON
    out_path = Path(args.output)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved: {out_path.resolve()}")
    print(f"- users: {len(uids)}")
    print(f"- topk: {args.topk}")

    # 5) Print realtime-like preview
    print_limit = args.print_limit
    if print_limit != 0:
        uids_to_print = uids[:min(print_limit, len(uids))]
    else:
        uids_to_print = uids

    print("\n===== Realtime Preview (Top-5) =====")
    for uid in uids_to_print:
        recs = next((r["recommendations"] for r in out["results"] if r["user_id"] == uid), [])
        print(f"\n[User {uid}]")
        if not recs:
            print("  (no recommendation: history missing or mapping missing)")
            continue
        for rr in recs:
            print(f"  {rr['rank']}. {rr['artwork_id']}  (score={rr['score']:.4f})")


if __name__ == "__main__":
    main()
