# app/recommender.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import numpy as np
import torch
import torch.nn.functional as F

from .mapping_store import MappingStore
from .chroma_store import ChromaStore
from .item_vector_table import ItemVectorTable
from .models.loader import load_models

# ✅ 노트북 설정과 동일한 Action Mapping
ACTION2ID = {
    "PAD": 0,
    "VIEW": 1,
    "STAY": 2,
    "LIKE": 3,
    "COMMENT": 4,
    "REVIEW_WRITE": 5,
    "SELECT": 6,
    "OTHER": 7,
}

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
        self.device = torch.device(device)
        self.max_len = max_len
        self.mapping = mapping
        self.chroma = chroma
        self.item_table = item_table

        # 1. 모델 로드 (loader.py 사용)
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

        # 2. 아이템 벡터(CLIP Raw) GPU 캐싱
        # (매 요청마다 디스크/CPU에서 복사하지 않고 GPU 메모리에 상주)
        print("⚡ [Recommender] Caching Item Vectors to GPU...")
        item_vec_np = self.item_table.as_numpy().astype(np.float32, copy=False)
        self.all_item_vecs = torch.from_numpy(item_vec_np).to(self.device, non_blocking=True)
        
        # 3. TwoTower Item Projection 미리 계산 (Inference 속도 최적화)
        # 노트북 로직: base_items = sas_model.item_base(all) -> proj = tt.item_proj(base) -> norm
        self.cached_item_proj = None
        self._precompute_item_embeddings()

    def _precompute_item_embeddings(self):
        """TwoTower의 Item Tower를 미리 통과시켜 둡니다 (속도 향상)"""
        if self.models.sasrec is None or self.models.twotower is None:
            print("⚠️ Models not loaded, skipping precompute.")
            return

        with torch.no_grad():
            # SASRec 내부 Projection (clip -> hidden)
            base_items = self.models.sasrec.item_base(self.all_item_vecs)
            
            # TwoTower Projection (hidden -> hidden)
            proj_items = self.models.twotower.item_proj(base_items)
            
            # Normalize (Cosine Similarity를 위한 정규화)
            self.cached_item_proj = F.normalize(proj_items, p=2, dim=-1)
            
        print(f"✅ [Recommender] Item Embeddings Precomputed! Shape: {self.cached_item_proj.shape}")

    def recommend(self, member_id: str, logs: List[Dict[str, str]], topk: int = 20) -> RecommendResult:
        """
        SASRec + TwoTower Dot Product 기반 추천
        """
        # 모델이 로드되지 않았으면 빈 결과 반환
        if self.cached_item_proj is None:
            return RecommendResult(member_id=member_id, recommends=[])

        # 1. 로그 전처리 (ID 매핑)
        item_ids = []
        act_ids = []
        
        # 최신 로그 기준 max_len 만큼 자르기
        # (입력 logs가 시간 순서대로 정렬되어 있다고 가정)
        valid_logs = logs[-self.max_len:] 
        
        for ev in valid_logs:
            aid = ev.get("artworkId")
            if not aid: continue
            
            idx = self.mapping.get(aid)
            if idx is None: continue # 학습 데이터에 없던 새로운 아이템은 건너뜀 (혹은 PAD 처리)
            
            # Action 매핑
            raw_act = ev.get("action", "VIEW").upper()
            if raw_act == "REVIEW": raw_act = "REVIEW_WRITE"
            act_idx = ACTION2ID.get(raw_act, 1) # Default: VIEW

            item_ids.append(idx)
            act_ids.append(act_idx)

        # 유효한 로그가 하나도 없으면 빈 결과
        if not item_ids:
            return RecommendResult(member_id=member_id, recommends=[])

        # 2. 텐서 변환 (Batch Size = 1)
        # 학습 코드와 동일하게 max_len에 맞춰 0(PAD) 채우기 (Left Padding)
        seq_len = len(item_ids)
        pad_len = self.max_len - seq_len
        
        # list concatenation
        input_items = [0] * pad_len + item_ids
        input_acts  = [0] * pad_len + act_ids

        input_items_t = torch.tensor([input_items], dtype=torch.long, device=self.device)
        input_acts_t  = torch.tensor([input_acts], dtype=torch.long, device=self.device)

        # 3. 모델 추론 (User Vector 생성)
        with torch.no_grad():
            # SASRec Forward
            # [중요] 전체 아이템 벡터 테이블(self.all_item_vecs)을 함께 넘겨줍니다.
            sas_out = self.models.sasrec(input_items_t, input_acts_t, self.all_item_vecs)
            
            # 마지막 시점(Last Token)의 히든 스테이트 추출
            last_emb = sas_out[:, -1, :]  # (1, hidden_dim)

            # TwoTower User Projection
            user_vec = self.models.twotower.user_proj(last_emb)
            user_vec = F.normalize(user_vec, p=2, dim=-1) # (1, hidden_dim)

            # 4. 전체 아이템과 유사도 계산 (Matrix Multiplication)
            # user_vec(1, H) @ item_proj.T(H, N) -> scores(1, N)
            scores = torch.matmul(user_vec, self.cached_item_proj.T)
            
            # (옵션) 이미 본 아이템 필터링하려면 여기서 scores[0, input_items] = -inf 처리 가능
            
            # 5. Top-K 추출
            vals, inds = torch.topk(scores, k=topk)
            
            # 결과 변환 (Tensor -> List)
            inds_np = inds[0].cpu().numpy()
            
            recommends = []
            rank = 1
            for idx in inds_np:
                if idx == 0: continue # PAD 인덱스는 추천에서 제외
                
                # mapping store에서 인덱스 -> artworkId 변환
                real_id = self.mapping.index_to_piece.get(int(idx))
                if real_id:
                    recommends.append({"rank": rank, "artworkId": real_id})
                    rank += 1

        return RecommendResult(member_id=member_id, recommends=recommends)