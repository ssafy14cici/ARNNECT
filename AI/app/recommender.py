# app/recommender.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import numpy as np
import torch

from .mapping_store import MappingStore
from .chroma_store import ChromaStore
from .item_vector_table import ItemVectorTable
from .models.loader import load_models

ACTION2ID = {
    "PAD": 0,
    "VIEW": 1,
    "STAY": 2,
    "LIKE": 3,
    "COMMENT": 4,
    "REVIEW": 5,
    "OTHER": 6,
}

def _pad_left(seq: List[int], max_len: int, pad: int = 0) -> List[int]:
    if len(seq) >= max_len:
        return seq[-max_len:]
    return [pad] * (max_len - len(seq)) + seq

@dataclass
class RecommendResult:
    member_id: str
    recommends: List[Dict[str, Any]]

class Recommender:
    def __init__(
        self,
        *,
        device: str,
        num_items: int,
        max_len: int,
        d_model: int,
        n_heads: int,
        n_layers: int,
        ff_dim: int,
        dropout: float,
        num_actions: int,
        mapping: MappingStore,
        chroma: ChromaStore,
        item_table: ItemVectorTable,
        sasrec_ckpt_path,
        twotower_ckpt_path,
    ):
        self.device = torch.device(device)   # ✅ torch.device로 고정
        self.max_len = max_len
        self.d_model = d_model
        self.mapping = mapping
        self.chroma = chroma
        self.item_table = item_table

        self.models = load_models(
            sasrec_ckpt=sasrec_ckpt_path,
            twotower_ckpt=twotower_ckpt_path,
            device=str(self.device),
            num_items=num_items,
            max_len=max_len,
            d_model=d_model,
            n_heads=n_heads,
            n_layers=n_layers,
            ff_dim=ff_dim,
            dropout=dropout,
            num_actions=num_actions,
            item_vec_dim=item_table.dim,
        )

        # ✅ 혹시 load_models가 내부에서 .to(device) 안 했을 경우 대비 강제 이동
        if getattr(self.models, "sasrec", None) is not None:
            self.models.sasrec = self.models.sasrec.to(self.device).eval()
        if getattr(self.models, "twotower", None) is not None:
            self.models.twotower = self.models.twotower.to(self.device).eval()

        # ✅ item vectors를 GPU에 1회만 올려 캐시 (요청마다 복사 방지)
        item_vec_np = self.item_table.as_numpy().astype(np.float32, copy=False)
        self.item_vec = torch.from_numpy(item_vec_np).to(self.device, non_blocking=True)

        print(f"✅ [Recommender] init done. device={self.device}, item_vec={tuple(self.item_vec.shape)}")

    def _user_vector_from_logs_vector_only(self, logs: List[Dict[str, str]]) -> Optional[np.ndarray]:
        vecs = []
        weights = []
        for i, ev in enumerate(logs[-self.max_len:]):
            aid = ev["artworkId"]
            idx = self.mapping.get(aid)
            if idx is None:
                continue
            v = self.item_table.get(idx)
            if not np.isfinite(v).all():
                continue
            w = 1.0 + 0.05 * i
            vecs.append(v)
            weights.append(w)

        if not vecs:
            return None

        V = np.stack(vecs, axis=0)
        w = np.array(weights, dtype=np.float32).reshape(-1, 1)
        u = (V * w).sum(axis=0) / (w.sum() + 1e-8)
        u = u.astype(np.float32)
        u /= (np.linalg.norm(u) + 1e-12)
        return u

    def _user_vector_from_logs_sasrec(self, logs: List[Dict[str, str]]) -> Optional[np.ndarray]:
        if getattr(self.models, "sasrec", None) is None:
            return None

        item_ids = []
        act_ids = []
        for ev in logs[-self.max_len:]:
            idx = self.mapping.get(ev["artworkId"])
            if idx is None:
                continue
            item_ids.append(idx)
            act_ids.append(ACTION2ID.get(ev.get("action", "VIEW"), 1))

        if not item_ids:
            return None

        item_ids = _pad_left(item_ids, self.max_len, pad=0)
        act_ids = _pad_left(act_ids, self.max_len, pad=0)

        seq_item = torch.tensor([item_ids], dtype=torch.long, device=self.device)
        seq_act = torch.tensor([act_ids], dtype=torch.long, device=self.device)

        with torch.no_grad():
            _, user = self.models.sasrec(seq_item, self.item_vec, seq_act)

            if getattr(self.models, "twotower", None) is not None:
                user, _ = self.models.twotower(user, user.new_zeros((1, self.d_model)))

            user_vec = user[0].detach().float().cpu().numpy().astype(np.float32)

        user_vec /= (np.linalg.norm(user_vec) + 1e-12)
        return user_vec

    def recommend(self, member_id: str, logs: List[Dict[str, str]], topk: int = 20) -> RecommendResult:
        u = self._user_vector_from_logs_sasrec(logs)
        if u is None:
            u = self._user_vector_from_logs_vector_only(logs)
        if u is None:
            return RecommendResult(member_id=member_id, recommends=[])

        res = self.chroma.query(u, topk=topk)
        recommends = [{"rank": r, "artworkId": art_id} for r, art_id in enumerate(res.ids, start=1)]
        return RecommendResult(member_id=member_id, recommends=recommends)
