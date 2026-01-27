
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Deployment-ready recommender for VectorSASRec + TwoTowerAlign.

Key point:
- Checkpoint does NOT include item embedding table, so item count can change.
- At runtime, supply item vectors (from JSON/DB/Chroma) + user recent interactions (artwork_id sequence).

CLI example:
  python deploy_recommender_vector_sasrec.py \
      --ckpt BEST_SASRec_VectorSASRec_model.pth \
      --vectors artwork_vector.json \
      --logs test_user_logs.json \
      --member_id A \
      --topk 20

This script also supports "vector-only" mode (no checkpoint) via --vector_only.
"""

from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F


# ----------------------------
# Models
# ----------------------------
class VectorSASRec(nn.Module):
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
        return self.item_in_proj(item_vectors)

    def forward(self, item_ids: torch.Tensor, action_ids: torch.Tensor, item_vectors: torch.Tensor) -> torch.Tensor:
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
        return x

    @torch.no_grad()
    def encode_last(self, item_ids: torch.Tensor, action_ids: torch.Tensor, item_vectors: torch.Tensor) -> torch.Tensor:
        out = self.forward(item_ids, action_ids, item_vectors)
        return out[:, -1, :]


class TwoTowerAlign(nn.Module):
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
# IO / preprocessing
# ----------------------------
def _read_json_or_jsonl(path: Path) -> List[Dict[str, Any]]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []
    if text[0] == "[":
        return json.loads(text)
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def load_item_vectors(vec_path: Path, expected_dim: int = 512) -> Tuple[torch.Tensor, Dict[str, int], Dict[int, str]]:
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
    return {"<PAD>": 0, "VIEW": 1, "LIKE": 2, "STAY": 3, "COMMENT": 4, "REVIEW": 5}


def user_sequence_from_logs(
    logs: List[Dict[str, Any]],
    member_id: str,
    artwork2idx: Dict[str, int],
    act2idx: Dict[str, int],
    maxlen: int,
) -> Tuple[torch.Tensor, torch.Tensor, List[int]]:
    # collect events
    seq = []
    for r in logs:
        uid = str(r.get("member_id") or r.get("user_id") or r.get("uid") or r.get("memberId"))
        if uid != str(member_id):
            continue
        aid = r.get("artwork_id") or r.get("item_id") or r.get("artworkId")
        if aid is None:
            continue
        aid = str(aid)
        idx = artwork2idx.get(aid, 0)
        if idx == 0:
            continue
        act = str(r.get("action_type") or r.get("action") or "VIEW").upper()
        aidx = act2idx.get(act, act2idx["VIEW"])
        ts = r.get("timestamp")
        seq.append((ts, idx, aidx))

    if not seq:
        # empty user -> all PAD
        return (
            torch.zeros((1, maxlen), dtype=torch.long),
            torch.zeros((1, maxlen), dtype=torch.long),
            [],
        )

    if any(ts is not None for ts, _, _ in seq):
        seq.sort(key=lambda x: "" if x[0] is None else str(x[0]))

    idxs = [i for _, i, _ in seq]
    acts = [a for _, _, a in seq]

    hist = idxs[-maxlen:]
    hist_acts = acts[-maxlen:]

    pad_n = maxlen - len(hist)
    hist = ([0] * pad_n) + hist
    hist_acts = ([0] * pad_n) + hist_acts

    return (
        torch.tensor(hist, dtype=torch.long).unsqueeze(0),
        torch.tensor(hist_acts, dtype=torch.long).unsqueeze(0),
        idxs,  # raw history indices (no pad)
    )


# ----------------------------
# Recommender
# ----------------------------
class Recommender:
    def __init__(
        self,
        ckpt_path: Optional[Path],
        vectors_path: Path,
        device: str = "cpu",
        vector_only: bool = False,
    ):
        self.device = torch.device(device)
        self.vector_only = bool(vector_only)

        # load ckpt (optional)
        self.cfg = {}
        self.sas = None
        self.tt = None
        if ckpt_path and not self.vector_only:
            ckpt = torch.load(str(ckpt_path), map_location="cpu")
            if "state_dict" in ckpt:
                sas_sd = ckpt["state_dict"]
                tt_sd = ckpt.get("two_tower_state_dict", {})
                self.cfg = ckpt.get("config", {})
            else:
                sas_sd, tt_sd, self.cfg = ckpt, {}, {}
            self.clip_dim = int(self.cfg.get("clip_dim", 512))
            self.hidden_dim = int(self.cfg.get("hidden", self.cfg.get("hidden_dim", 512)))
            self.maxlen = int(self.cfg.get("maxlen", 200))
            self.num_actions = int(self.cfg.get("num_actions", 6))
            self.n_layers = int(self.cfg.get("n_layers", 2))
            self.n_heads = int(self.cfg.get("n_heads", 4))
            self.dropout = float(self.cfg.get("dropout", 0.1))

            self.sas = VectorSASRec(
                clip_dim=self.clip_dim,
                hidden_dim=self.hidden_dim,
                num_actions=self.num_actions,
                n_layers=self.n_layers,
                n_heads=self.n_heads,
                dropout=self.dropout,
                maxlen=self.maxlen,
            ).to(self.device)

            self.tt = TwoTowerAlign(dim=self.hidden_dim, dropout=self.dropout).to(self.device)

            self.sas.load_state_dict(sas_sd, strict=False)
            if tt_sd:
                self.tt.load_state_dict(tt_sd, strict=False)

            self.sas.eval()
            self.tt.eval()
        else:
            # vector-only defaults
            self.clip_dim = 512
            self.hidden_dim = 512
            self.maxlen = 200

        # load vectors
        self.item_mat, self.artwork2idx, self.idx2artwork = load_item_vectors(vectors_path, expected_dim=self.clip_dim)
        self.item_mat = self.item_mat.to(self.device)

        # precompute item_final for fast scoring if model mode
        self._item_final = None
        if self.sas and self.tt:
            with torch.no_grad():
                item_hidden = self.sas.item_base(self.item_mat)
                item_final = self.tt.item_proj(item_hidden)
                self._item_final = F.normalize(item_final, dim=-1)

        self.act2idx = default_action_vocab()

    @torch.no_grad()
    def recommend_from_sequence(
        self,
        item_ids_1xS: torch.Tensor,
        action_ids_1xS: torch.Tensor,
        seen: List[int],
        topk: int = 20,
    ) -> List[Tuple[str, float]]:
        if self.vector_only or (self.sas is None) or (self.tt is None):
            # vector-only: user vector = mean of seen item vectors
            if not seen:
                return []
            vecs = self.item_mat[torch.tensor(list(set(seen)), device=self.device)]
            user_vec = F.normalize(vecs.mean(dim=0, keepdim=True), dim=-1)
            item_vec = F.normalize(self.item_mat, dim=-1)
            scores = (user_vec @ item_vec.t()).squeeze(0)
        else:
            user_last = self.sas.encode_last(item_ids_1xS.to(self.device), action_ids_1xS.to(self.device), self.item_mat)
            user_final = F.normalize(self.tt.user_proj(user_last), dim=-1)
            scores = (user_final @ self._item_final.t()).squeeze(0)

        # exclude PAD
        scores[0] = -1e9
        # exclude seen
        if seen:
            idxs = torch.tensor(list(set(seen)), device=self.device, dtype=torch.long)
            scores[idxs] = -1e9

        topk = int(topk)
        topk_scores, topk_idx = torch.topk(scores, k=min(topk, scores.numel()-1))
        out = []
        for s, idx in zip(topk_scores.tolist(), topk_idx.tolist()):
            aid = self.idx2artwork.get(int(idx))
            if aid and aid != "<PAD>":
                out.append((aid, float(s)))
        return out

    def recommend_from_logs(
        self,
        logs: List[Dict[str, Any]],
        member_id: str,
        topk: int = 20,
    ) -> List[Tuple[str, float]]:
        items, acts, raw_seen = user_sequence_from_logs(
            logs=logs,
            member_id=member_id,
            artwork2idx=self.artwork2idx,
            act2idx=self.act2idx,
            maxlen=self.maxlen,
        )
        seen = [i for i in raw_seen if i != 0]
        return self.recommend_from_sequence(items, acts, seen=seen, topk=topk)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--ckpt", type=str, default=None, help="VectorSASRec checkpoint .pth (optional if --vector_only).")
    p.add_argument("--vectors", type=str, required=True, help="Artwork vectors json.")
    p.add_argument("--logs", type=str, required=True, help="User logs json/jsonl for building a user sequence.")
    p.add_argument("--member_id", type=str, required=True, help="Target member_id to recommend for.")
    p.add_argument("--topk", type=int, default=20)
    p.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    p.add_argument("--vector_only", action="store_true", help="Ignore checkpoint; use pure vector similarity.")
    args = p.parse_args()

    ckpt_path = Path(args.ckpt) if args.ckpt else None
    rec = Recommender(
        ckpt_path=ckpt_path,
        vectors_path=Path(args.vectors),
        device=args.device,
        vector_only=args.vector_only,
    )

    logs = _read_json_or_jsonl(Path(args.logs))
    out = rec.recommend_from_logs(logs, member_id=args.member_id, topk=args.topk)

    print(f">>> recommended top{args.topk} for member_id={args.member_id}")
    for i, (aid, score) in enumerate(out, 1):
        print(f"{i:02d}. {aid}\t{score:.6f}")


if __name__ == "__main__":
    main()
