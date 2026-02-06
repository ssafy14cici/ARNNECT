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
        clip_dim: int,
        hidden_dim: int,
        num_actions: int,
        n_layers: int = 2,
        n_heads: int = 4,
        dropout: float = 0.1,
        maxlen: int = 200,
        # 아래는 호환성을 위해 남겨둠 (loader에서 사용)
        num_items: int = 0, 
        item_vec_dim: int = 512, 
    ):
        super().__init__()
        # 노트북 변수명에 맞춤
        self.clip_dim = clip_dim
        self.hidden_dim = hidden_dim
        self.maxlen = maxlen

        # ✅ item vector(clip_dim) -> hidden_dim projection (trainable)
        # 기존: item_proj -> 변경: item_in_proj (노트북 Cell 4 일치)
        self.item_in_proj = nn.Linear(clip_dim, hidden_dim, bias=False)

        # ✅ action / position embedding
        self.act_emb = nn.Embedding(num_actions, hidden_dim, padding_idx=0)
        self.pos_emb = nn.Embedding(maxlen, hidden_dim)
        self.dropout = nn.Dropout(dropout)

        # ✅ nn.TransformerEncoder 사용 (노트북 일치)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=n_heads,
            dim_feedforward=4 * hidden_dim,
            dropout=dropout,
            batch_first=True,
            activation="gelu",
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

    def item_base(self, item_vectors: torch.Tensor) -> torch.Tensor:
        """(N, clip_dim) -> (N, hidden_dim)"""
        return self.item_in_proj(item_vectors)

    def forward(self, item_ids: torch.Tensor, action_ids: torch.Tensor, item_vectors: torch.Tensor):
        """
        item_ids: (B,S)
        action_ids: (B,S)
        item_vectors: (N, clip_dim) -> 외부에서 주입
        """
        B, S = item_ids.shape
        
        # ✅ 런타임 item_vectors에서 lookup (F.embedding 사용)
        # item_ids 범위를 clamp하여 안전하게 조회
        safe_ids = item_ids.clamp(min=0, max=item_vectors.size(0)-1)
        v = F.embedding(safe_ids, item_vectors)      # (B,S,clip_dim)
        
        x = self.item_in_proj(v) + self.act_emb(action_ids)  # (B,S,hidden_dim)

        pos = torch.arange(S, device=item_ids.device).unsqueeze(0).expand(B, S)
        x = x + self.pos_emb(pos)
        x = self.dropout(x)

        pad_mask = (item_ids == 0)
        x = self.encoder(x, src_key_padding_mask=pad_mask)
        return x

class TwoTowerAlign(nn.Module):
    def __init__(self, dim=512, dropout=0.1):
        super().__init__()
        # 노트북 Cell 4 일치
        self.user_proj = nn.Sequential(
            nn.Linear(dim, dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim, dim),
        )
        self.item_proj = nn.Sequential(
            nn.Linear(dim, dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim, dim),
        )

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