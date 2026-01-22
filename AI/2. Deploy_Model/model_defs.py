import torch
import torch.nn as nn

class FeatureSASRec(nn.Module):
    def __init__(self, item_vectors: torch.Tensor, hidden_dim=512, n_layers=8, n_heads=4, dropout=0.1, maxlen=50):
        super().__init__()
        self.register_buffer("item_vectors", item_vectors)
        self.hidden_dim = hidden_dim
        self.maxlen = maxlen

        self.proj = nn.Sequential(
            nn.Linear(item_vectors.size(1), hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU()
        )
        self.pos_emb = nn.Embedding(maxlen, hidden_dim)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=n_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=dropout,
            batch_first=True,
            norm_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.ln_f = nn.LayerNorm(hidden_dim)

    def forward(self, seq_ids):
        x = self.item_vectors[seq_ids]
        x = self.proj(x)
        B, S, _ = x.shape
        positions = torch.arange(S, device=x.device).unsqueeze(0)
        if S > self.maxlen:
            positions = positions[:, :self.maxlen]
            x = x[:, :self.maxlen, :]
        x = x + self.pos_emb(positions)
        pad_mask = (seq_ids == 0)
        out = self.encoder(x, src_key_padding_mask=pad_mask)
        return self.ln_f(out)

    @torch.no_grad()
    def predict_last(self, seq_ids):
        out = self.forward(seq_ids)
        return out[:, -1, :]

class TwoTowerAlign(nn.Module):
    def __init__(self, dim: int = 512, dropout: float = 0.1):
        super().__init__()
        self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))
        self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))

    def forward(self, user_vec, item_vec):
        zu = self.user_proj(user_vec)
        zi = self.item_proj(item_vec)
        return (zu * zi).sum(dim=-1)

    @torch.no_grad()
    def predict_user(self, user_vec):
        zu = self.user_proj(user_vec)
        return zu / (zu.norm(dim=-1, keepdim=True) + 1e-12)

    @torch.no_grad()
    def predict_item(self, item_vec):
        zi = self.item_proj(item_vec)
        return zi / (zi.norm(dim=-1, keepdim=True) + 1e-12)