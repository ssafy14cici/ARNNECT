from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


def _causal_mask(seq_len: int, device: torch.device) -> torch.Tensor:
    # 미래 정보를 참조하지 못하게 마스킹 (Triangular Mask)
    mask = torch.triu(torch.ones(seq_len, seq_len, device=device), diagonal=1).bool()
    return mask


class TransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int, ff_dim: int, dropout: float):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, n_heads, dropout=dropout, batch_first=True)
        self.ln1 = nn.LayerNorm(d_model)
        # 학습 코드 구조에 맞춰 Sequential 사용
        self.ff = nn.Sequential(
            nn.Linear(d_model, ff_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(ff_dim, d_model),
            nn.Dropout(dropout),
        )
        self.ln2 = nn.LayerNorm(d_model)

    def forward(self, x: torch.Tensor, key_padding_mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        L = x.size(1)
        attn_mask = _causal_mask(L, x.device)
        attn_out, _ = self.attn(
            x, x, x,
            attn_mask=attn_mask,
            key_padding_mask=key_padding_mask,
            need_weights=False,
        )
        x = self.ln1(x + attn_out)
        x = self.ln2(x + self.ff(x))
        return x


class VectorSASRec(nn.Module):
    def __init__(
        self,
        num_items: int,
        d_model: int = 512,
        n_heads: int = 8,
        n_layers: int = 2,
        ff_dim: int = 2048,
        dropout: float = 0.1,
        max_len: int = 200,
        num_actions: int = 8,
        item_vec_dim: int = 512,
        pad_idx: int = 0,
    ):
        super().__init__()
        self.num_items = int(num_items)
        self.d_model = int(d_model)
        self.max_len = int(max_len)
        self.pad_idx = int(pad_idx)
        self.item_vec_dim = int(item_vec_dim)

        # [핵심 1] 학습 코드와 동일하게 bias=False 설정
        # (학습된 체크포인트에 bias가 없으므로 서버 코드도 맞춰줍니다)
        self.item_proj = nn.Linear(item_vec_dim, d_model, bias=False)
        
        self.pos_emb = nn.Embedding(max_len, d_model)
        self.act_emb = nn.Embedding(num_actions, d_model) if num_actions > 0 else None

        self.drop = nn.Dropout(dropout)
        
        # Transformer Blocks
        self.blocks = nn.ModuleList([TransformerBlock(d_model, n_heads, ff_dim, dropout) for _ in range(n_layers)])
        
        # [핵심 2] 학습 코드에 없는 LayerNorm 제거
        self.ln_out = None 

    def forward(
        self,
        seq_item_idx: torch.Tensor,
        item_vec_table: torch.Tensor,  # <--- [중요] 외부에서 벡터 테이블을 받습니다!
        seq_action_id: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        
        # 1. 시퀀스 길이 체크
        B, L = seq_item_idx.shape
        if L > self.max_len:
            raise ValueError(f"seq length {L} > max_len {self.max_len}")

        # 2. 패딩 마스크 생성
        key_padding_mask = (seq_item_idx == self.pad_idx)

        # 3. [벡터 룩업 로직] ID 임베딩 대신, '이미지 벡터'를 테이블에서 가져옵니다.
        # 학습 코드의 F.embedding(..., item_vec_table) 로직과 완벽히 동일합니다.
        item_vecs = F.embedding(seq_item_idx.clamp(min=0, max=item_vec_table.size(0)-1), item_vec_table)
        
        # 4. 차원 변환 (512 -> d_model)
        x = self.item_proj(item_vecs)

        # 5. 위치 정보(Position) 추가
        pos = torch.arange(L, device=seq_item_idx.device).unsqueeze(0).expand(B, L)
        x = x + self.pos_emb(pos)

        # 6. 행동 정보(Action) 추가 (있으면)
        if self.act_emb is not None and seq_action_id is not None:
            x = x + self.act_emb(seq_action_id.clamp(min=0, max=self.act_emb.num_embeddings-1))

        # 7. 트랜스포머 통과
        x = self.drop(x)
        for blk in self.blocks:
            x = blk(x, key_padding_mask=key_padding_mask)
        
        # (ln_out 제거됨)
        
        # 8. 유저 벡터 추출 (마지막 시점)
        lengths = (~key_padding_mask).long().sum(dim=1)
        last_idx = torch.clamp(lengths - 1, min=0)
        user = x[torch.arange(B, device=x.device), last_idx]
        
        return x, user


class TwoTowerAlign(nn.Module):
    def __init__(self, d_in: int = 512, d_hidden: int = 512, out_dim: int = 512, dropout: float = 0.1):
        super().__init__()
        self.user_mlp = nn.Sequential(
            nn.Linear(d_in, d_hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_hidden, out_dim),
        )
        self.item_mlp = nn.Sequential(
            nn.Linear(d_in, d_hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_hidden, out_dim),
        )
        self.logit_scale = nn.Parameter(torch.tensor(0.0))

    def forward(self, user_vec: torch.Tensor, item_vecs: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        u = self.user_mlp(user_vec)
        v = self.item_mlp(item_vecs)
        u = F.normalize(u, dim=-1)
        v = F.normalize(v, dim=-1)
        return u, v

    def score(self, user_vec: torch.Tensor, item_vecs: torch.Tensor) -> torch.Tensor:
        u, v = self(user_vec, item_vecs)
        scale = self.logit_scale.exp().clamp(1e-3, 100.0)
        if v.dim() == 2:
            return scale * (u @ v.t())
        else:
            return scale * (u.unsqueeze(1) * v).sum(dim=-1)