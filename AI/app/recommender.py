from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch

from .mapping_store import MappingStore
from .chroma_store import ChromaStore
from .item_vector_table import ItemVectorTable
from .models.loader import load_models

# If your action set differs, change here.
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
        self.device = device
        self.max_len = max_len
        self.d_model = d_model
        self.mapping = mapping
        self.chroma = chroma
        self.item_table = item_table

        self.models = load_models(
            sasrec_ckpt=sasrec_ckpt_path,
            twotower_ckpt=twotower_ckpt_path,
            device=device,
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

    def _user_vector_from_logs_vector_only(self, logs: List[Dict[str, str]]) -> Optional[np.ndarray]:
        # Weighted average of recent item vectors from item_table (fallback)
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
            # simple recency weight
            w = 1.0 + 0.05 * i
            vecs.append(v)
            weights.append(w)
        if not vecs:
            return None
        V = np.stack(vecs, axis=0)
        w = np.array(weights, dtype=np.float32).reshape(-1, 1)
        u = (V * w).sum(axis=0) / (w.sum() + 1e-8)
        # normalize
        u = u.astype(np.float32)
        u /= (np.linalg.norm(u) + 1e-12)
        return u

    def _user_vector_from_logs_sasrec(self, logs: List[Dict[str, str]]) -> Optional[np.ndarray]:
        if self.models.sasrec is None:
            return None

        item_ids = []
        act_ids = []
        
        # [디버그 1] 입력 로그가 잘 매핑되는지 확인
        print(f"🔍 [Reco Debug] 입력 로그 수: {len(logs)}")
        for ev in logs[-self.max_len:]:
            idx = self.mapping.get(ev["artworkId"])
            if idx is None:
                # print(f"   -> Unknown ID: {ev['artworkId']}") # 너무 많이 뜨면 주석 처리
                continue
            item_ids.append(idx)
            act_ids.append(ACTION2ID.get(ev.get("action", "VIEW"), 1))

        if not item_ids:
            print("⚠️ [Reco Debug] 유효한 아이템이 없음 (전부 Unknown이거나 로그 없음)")
            return None

        item_ids = _pad_left(item_ids, self.max_len, pad=0)
        act_ids = _pad_left(act_ids, self.max_len, pad=0)
        
        # [디버그 2] 모델에 들어가는 입력 ID 확인 (모두 0이면 안됨)
        # print(f"   -> Input Item IDs (Last 5): {item_ids[-5:]}")

        seq_item = torch.tensor([item_ids], dtype=torch.long, device=self.device)
        seq_act = torch.tensor([act_ids], dtype=torch.long, device=self.device)

        item_vec_np = self.item_table.as_numpy()
        item_vec = torch.from_numpy(item_vec_np).to(self.device)

        with torch.no_grad():
            # SASRec 통과
            _, user = self.models.sasrec(seq_item, item_vec, seq_act)
            
            # [디버그 3] SASRec 직후 벡터 값 확인 (분산이 있어야 함)
            sasrec_out = user[0, :5].cpu().numpy()
            # print(f"   -> SASRec Output (Top 5 dim): {sasrec_out}")

            # TwoTower 통과
            if self.models.twotower is not None:
                user, _ = self.models.twotower(user, user.new_zeros((1, self.d_model)))
                
                # [디버그 4] TwoTower 통과 후 값 확인
                tt_out = user[0, :5].cpu().numpy()
                # print(f"   -> TwoTower Output (Top 5 dim): {tt_out}")
                
            user_vec = user[0].detach().float().cpu().numpy().astype(np.float32)

        user_vec /= (np.linalg.norm(user_vec) + 1e-12)
        return user_vec

    def recommend(self, member_id: str, logs: List[Dict[str, str]], topk: int = 20) -> RecommendResult:
        # Prefer SASRec if model loaded
        u = self._user_vector_from_logs_sasrec(logs)
        if u is None:
            u = self._user_vector_from_logs_vector_only(logs)
        if u is None:
            return RecommendResult(member_id=member_id, recommends=[])

        res = self.chroma.query(u, topk=topk)
        recommends = []
        for rank, art_id in enumerate(res.ids, start=1):
            recommends.append({"rank": rank, "artworkId": art_id})
        return RecommendResult(member_id=member_id, recommends=recommends)
