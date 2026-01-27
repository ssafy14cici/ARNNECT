
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Offline evaluation for VectorSASRec + TwoTowerAlign (runtime item vectors; num_items can change).
- Input logs: JSON list or JSONL with fields at least:
  { "member_id": "...", "artwork_id": "...", "timestamp": "...", "action_type": "VIEW" }
  timestamp can be missing; order will follow file order if absent.
- Input vectors: JSON list/dict containing artwork_id + vector (512d).
- Checkpoint: .pth saved from training (state_dict, two_tower_state_dict, config).

Metrics:
- HR@K, NDCG@K, MRR@K
"""

from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F


# ----------------------------
# Models
# ----------------------------
class VectorSASRec(nn.Module):
    """
    SASRec variant that does NOT keep a trainable item embedding table.
    It consumes runtime item vectors via F.embedding(item_ids, item_vectors).
    """
    def __init__(
        self,
        clip_dim: int = 512,
        hidden_dim: int = 512,
        num_actions: int = 10,
        n_layers: int = 2,
        n_heads: int = 4,
        dropout: float = 0.1,
        maxlen: int = 200,
    ):
        super().__init__()
        self.clip_dim = int(clip_dim)
        self.hidden_dim = int(hidden_dim)
        self.maxlen = int(maxlen)

        self.item_in_proj = nn.Linear(self.clip_dim, self.hidden_dim, bias=False)
        self.act_emb = nn.Embedding(int(num_actions), self.hidden_dim, padding_idx=0)
        self.pos_emb = nn.Embedding(self.maxlen, self.hidden_dim)
        self.dropout = nn.Dropout(float(dropout))

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=self.hidden_dim,
            nhead=int(n_heads),
            dim_feedforward=4 * self.hidden_dim,
            dropout=float(dropout),
            batch_first=True,
            activation="gelu",
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=int(n_layers))

    def item_base(self, item_vectors: torch.Tensor) -> torch.Tensor:
        """Project raw item vectors to hidden space: (N, clip_dim) -> (N, hidden_dim)."""
        return self.item_in_proj(item_vectors)

    def forward(self, item_ids: torch.Tensor, action_ids: torch.Tensor, item_vectors: torch.Tensor) -> torch.Tensor:
        """
        item_ids: (B,S) int64
        action_ids: (B,S) int64
        item_vectors: (N, clip_dim) float32, item_vectors[0] should be zeros for PAD
        """
        if item_ids.dim() != 2:
            raise ValueError(f"item_ids must be (B,S). Got {tuple(item_ids.shape)}")
        B, S = item_ids.shape

        if S > self.maxlen:
            item_ids = item_ids[:, -self.maxlen:]
            action_ids = action_ids[:, -self.maxlen:]
            B, S = item_ids.shape

        v = F.embedding(item_ids, item_vectors)              # (B,S,clip_dim)
        x = self.item_in_proj(v) + self.act_emb(action_ids)  # (B,S,hidden_dim)

        pos = torch.arange(S, device=item_ids.device).unsqueeze(0).expand(B, S)
        x = x + self.pos_emb(pos)
        x = self.dropout(x)

        pad_mask = (item_ids == 0)
        x = self.encoder(x, src_key_padding_mask=pad_mask)
        return x  # (B,S,hidden_dim)

    @torch.no_grad()
    def encode_last(self, item_ids: torch.Tensor, action_ids: torch.Tensor, item_vectors: torch.Tensor) -> torch.Tensor:
        out = self.forward(item_ids, action_ids, item_vectors)
        return out[:, -1, :]  # (B,hidden_dim)


class TwoTowerAlign(nn.Module):
    """Simple two-tower projection: hidden_dim -> hidden_dim (can be changed)."""
    def __init__(self, dim: int = 512, dropout: float = 0.1):
        super().__init__()
        d = int(dim)
        self.user = nn.Sequential(
            nn.LayerNorm(d),
            nn.Dropout(float(dropout)),
            nn.Linear(d, d, bias=False),
        )
        self.item = nn.Sequential(
            nn.LayerNorm(d),
            nn.Dropout(float(dropout)),
            nn.Linear(d, d, bias=False),
        )

    def user_proj(self, x: torch.Tensor) -> torch.Tensor:
        return self.user(x)

    def item_proj(self, x: torch.Tensor) -> torch.Tensor:
        return self.item(x)


# ----------------------------
# IO helpers
# ----------------------------
def _read_json_or_jsonl(path: Path) -> List[Dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    text = text.strip()
    if not text:
        return []
    if text[0] == "[":
        return json.loads(text)
    # jsonl
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def load_item_vectors(vec_path: Path, expected_dim: int = 512) -> Tuple[torch.Tensor, Dict[str, int], Dict[int, str]]:
    """
    Returns:
      item_mat: (N+1, D) float32 with PAD row 0 = zeros
      artwork2idx, idx2artwork (idx starts at 1)
    Accepts either:
      - list of {"artwork_id":..., "vector":[...]}
      - dict {artwork_id: [vector]}
      - list of [vector] with separate ids not supported (needs artwork_id)
    """
    obj = json.loads(vec_path.read_text(encoding="utf-8"))

    artwork2idx: Dict[str, int] = {"<PAD>": 0}
    idx2artwork: Dict[int, str] = {0: "<PAD>"}
    vectors: List[List[float]] = [[0.0] * expected_dim]

    def add(aid: str, vec: List[float]):
        if aid in artwork2idx:
            return
        if vec is None:
            return
        if len(vec) != expected_dim:
            raise ValueError(f"Vector dim mismatch for {aid}: got {len(vec)}, expected {expected_dim}")
        idx = len(vectors)
        artwork2idx[aid] = idx
        idx2artwork[idx] = aid
        vectors.append(vec)

    if isinstance(obj, dict):
        for aid, vec in obj.items():
            add(str(aid), vec)
    elif isinstance(obj, list):
        for it in obj:
            if isinstance(it, dict):
                aid = it.get("artwork_id") or it.get("id") or it.get("artworkId") or it.get("artworkID")
                vec = it.get("vector") or it.get("embedding") or it.get("vec")
                if aid is None or vec is None:
                    continue
                add(str(aid), vec)
            else:
                raise ValueError("Vector JSON list items must be dicts containing artwork_id and vector.")
    else:
        raise ValueError("Unsupported vector JSON format.")

    item_mat = torch.tensor(vectors, dtype=torch.float32)
    return item_mat, artwork2idx, idx2artwork


def default_action_vocab() -> Dict[str, int]:
    # PAD=0 is required
    return {
        "<PAD>": 0,
        "VIEW": 1,
        "LIKE": 2,
        "STAY": 3,
        "COMMENT": 4,
        "REVIEW": 5,
    }


def build_user_sequences(
    logs: List[Dict[str, Any]],
    artwork2idx: Dict[str, int],
    act2idx: Dict[str, int],
    maxlen: int,
) -> Tuple[List[torch.Tensor], List[torch.Tensor], List[int], List[List[int]]]:
    """
    For each user with >=2 interactions:
      input sequence = last maxlen-1 items
      target = last item
    Returns lists aligned by user:
      in_items (B,S), in_acts (B,S), targets (B,), histories(list of idx)
    """
    # group
    by_user: Dict[str, List[Tuple[Optional[str], int, int]]] = {}
    for r in logs:
        uid = str(r.get("member_id") or r.get("user_id") or r.get("uid") or r.get("memberId"))
        aid = r.get("artwork_id") or r.get("item_id") or r.get("artworkId")
        if aid is None:
            continue
        aid = str(aid)
        idx = artwork2idx.get(aid, 0)
        if idx == 0:
            continue
        act = str(r.get("action_type") or r.get("action") or "VIEW").upper()
        aidx = act2idx.get(act, act2idx.get("VIEW", 1))
        ts = r.get("timestamp")  # may be str
        by_user.setdefault(uid, []).append((ts, idx, aidx))

    # sort by timestamp if available (simple lexicographic for ISO-like strings)
    users = []
    for uid, seq in by_user.items():
        if any(ts is not None for ts, _, _ in seq):
            seq.sort(key=lambda x: "" if x[0] is None else str(x[0]))
        # else keep original order
        if len(seq) >= 2:
            users.append((uid, seq))

    in_items, in_acts, targets, histories = [], [], [], []
    S = maxlen
    for uid, seq in users:
        idxs = [i for _, i, _ in seq]
        acts = [a for _, _, a in seq]
        tgt = idxs[-1]
        hist = idxs[:-1]

        # build input of length S (pad left)
        x_items = hist[-S:]
        x_acts = acts[:-1][-S:]

        # left pad
        pad_n = S - len(x_items)
        x_items = ([0] * pad_n) + x_items
        x_acts = ([0] * pad_n) + x_acts

        in_items.append(torch.tensor(x_items, dtype=torch.long))
        in_acts.append(torch.tensor(x_acts, dtype=torch.long))
        targets.append(int(tgt))
        histories.append(hist)

    return in_items, in_acts, targets, histories


# ----------------------------
# Metrics
# ----------------------------
def _dcg(rank: int) -> float:
    return 1.0 / math.log2(rank + 2.0)  # rank starts at 0


def compute_metrics_at_k(ranks: List[int], k: int) -> Dict[str, float]:
    """
    ranks: list where each element is 0-based rank position of the true item in the recommendation list,
           or -1 if not in topK.
    """
    n = len(ranks)
    if n == 0:
        return {"HR": 0.0, "NDCG": 0.0, "MRR": 0.0}

    hr = sum(1 for r in ranks if 0 <= r < k) / n
    ndcg = sum(_dcg(r) if 0 <= r < k else 0.0 for r in ranks) / n
    mrr = sum(1.0 / (r + 1.0) if 0 <= r < k else 0.0 for r in ranks) / n
    return {"HR": hr, "NDCG": ndcg, "MRR": mrr}


# ----------------------------
# Main evaluate
# ----------------------------
@torch.no_grad()
def evaluate(
    sas: VectorSASRec,
    tt: TwoTowerAlign,
    item_mat: torch.Tensor,
    in_items: List[torch.Tensor],
    in_acts: List[torch.Tensor],
    targets: List[int],
    histories: List[List[int]],
    ks: List[int],
    batch_size: int,
    device: torch.device,
) -> Dict[int, Dict[str, float]]:
    sas.eval()
    tt.eval()

    item_mat = item_mat.to(device)
    item_hidden = sas.item_base(item_mat)          # (N,hidden)
    item_final = tt.item_proj(item_hidden)         # (N,hidden)
    item_final = F.normalize(item_final, dim=-1)

    max_k = max(ks)
    ranks_at_k: Dict[int, List[int]] = {k: [] for k in ks}

    n = len(targets)
    for st in range(0, n, batch_size):
        ed = min(n, st + batch_size)
        b_items = torch.stack(in_items[st:ed]).to(device)
        b_acts = torch.stack(in_acts[st:ed]).to(device)
        b_targets = torch.tensor(targets[st:ed], dtype=torch.long, device=device)

        user_last = sas.encode_last(b_items, b_acts, item_mat)
        user_final = tt.user_proj(user_last)
        user_final = F.normalize(user_final, dim=-1)

        scores = user_final @ item_final.t()  # (B,N)

        # exclude PAD
        scores[:, 0] = -1e9

        # exclude history items
        for bi, hist in enumerate(histories[st:ed]):
            if hist:
                idxs = torch.tensor(list(set(hist)), device=device, dtype=torch.long)
                scores[bi, idxs] = -1e9

        topk_scores, topk_idx = torch.topk(scores, k=max_k, dim=-1)

        for bi in range(ed - st):
            tgt = int(b_targets[bi].item())
            rec_list = topk_idx[bi].tolist()
            try:
                r = rec_list.index(tgt)
            except ValueError:
                r = -1
            for k in ks:
                ranks_at_k[k].append(r)

    return {k: compute_metrics_at_k(ranks_at_k[k], k) for k in ks}


def load_checkpoint(ckpt_path: Path, device: torch.device):
    ckpt = torch.load(str(ckpt_path), map_location="cpu")
    if "state_dict" in ckpt:
        sas_sd = ckpt["state_dict"]
        tt_sd = ckpt.get("two_tower_state_dict", {})
        cfg = ckpt.get("config", {})
    else:
        # raw state dict
        sas_sd = ckpt
        tt_sd = {}
        cfg = {}

    return sas_sd, tt_sd, cfg


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--logs", type=str, required=True, help="Path to test/valid user logs (json or jsonl).")
    p.add_argument("--vectors", type=str, required=True, help="Path to artwork vectors json.")
    p.add_argument("--ckpt", type=str, required=True, help="Path to trained checkpoint .pth")
    p.add_argument("--k", type=str, default="10,20,50", help="Comma separated K values.")
    p.add_argument("--maxlen", type=int, default=None, help="Override maxlen (otherwise ckpt config).")
    p.add_argument("--clip_dim", type=int, default=None, help="Override clip_dim (otherwise ckpt config).")
    p.add_argument("--hidden_dim", type=int, default=None, help="Override hidden_dim (otherwise ckpt config).")
    p.add_argument("--num_actions", type=int, default=None, help="Override num_actions (otherwise ckpt config).")
    p.add_argument("--layers", type=int, default=None, help="Override n_layers (otherwise ckpt config).")
    p.add_argument("--heads", type=int, default=None, help="Override n_heads (otherwise ckpt config).")
    p.add_argument("--dropout", type=float, default=None, help="Override dropout (otherwise ckpt config).")
    p.add_argument("--batch_size", type=int, default=256)
    p.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    args = p.parse_args()

    device = torch.device(args.device)

    sas_sd, tt_sd, cfg = load_checkpoint(Path(args.ckpt), device=device)

    # config
    clip_dim = int(args.clip_dim or cfg.get("clip_dim", 512))
    hidden_dim = int(args.hidden_dim or cfg.get("hidden", cfg.get("hidden_dim", 512)))
    maxlen = int(args.maxlen or cfg.get("maxlen", 200))
    num_actions = int(args.num_actions or cfg.get("num_actions", 6))
    n_layers = int(args.layers or cfg.get("n_layers", 2))
    n_heads = int(args.heads or cfg.get("n_heads", 4))
    dropout = float(args.dropout if args.dropout is not None else cfg.get("dropout", 0.1))

    # load vectors
    item_mat, artwork2idx, idx2artwork = load_item_vectors(Path(args.vectors), expected_dim=clip_dim)
    print(f">>> vectors loaded: items={len(artwork2idx)-1}, item_mat={tuple(item_mat.shape)}")

    # load logs
    logs = _read_json_or_jsonl(Path(args.logs))
    print(f">>> logs loaded: rows={len(logs)}")

    act2idx = default_action_vocab()
    in_items, in_acts, targets, histories = build_user_sequences(logs, artwork2idx, act2idx, maxlen=maxlen)
    print(f">>> users for eval: {len(targets)}")

    sas = VectorSASRec(
        clip_dim=clip_dim,
        hidden_dim=hidden_dim,
        num_actions=num_actions,
        n_layers=n_layers,
        n_heads=n_heads,
        dropout=dropout,
        maxlen=maxlen,
    ).to(device)

    tt = TwoTowerAlign(dim=hidden_dim, dropout=dropout).to(device)

    # load weights
    missing, unexpected = sas.load_state_dict(sas_sd, strict=False)
    if missing:
        print("[SAS] missing keys:", missing)
    if unexpected:
        print("[SAS] unexpected keys:", unexpected)

    if tt_sd:
        missing2, unexpected2 = tt.load_state_dict(tt_sd, strict=False)
        if missing2:
            print("[TT] missing keys:", missing2)
        if unexpected2:
            print("[TT] unexpected keys:", unexpected2)

    ks = [int(x) for x in args.k.split(",") if x.strip()]
    res = evaluate(
        sas=sas,
        tt=tt,
        item_mat=item_mat,
        in_items=in_items,
        in_acts=in_acts,
        targets=targets,
        histories=histories,
        ks=ks,
        batch_size=int(args.batch_size),
        device=device,
    )

    print("\n=== Results ===")
    for k in ks:
        m = res[k]
        print(f"K={k:3d} | HR={m['HR']:.4f} | NDCG={m['NDCG']:.4f} | MRR={m['MRR']:.4f}")


if __name__ == "__main__":
    main()
