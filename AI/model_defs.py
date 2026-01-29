# model_defs.py
import torch
import torch.nn as nn
import json
from dataclasses import dataclass
from typing import List, Dict, Tuple
import open_clip
from PIL import Image
import numpy as np

# 상수 정의
ACTION_SET = {"VIEW", "LIKE", "STAY", "COMMENT", "REVIEW"}
ACT2IDX = {"<PAD>": 0, "VIEW": 1, "LIKE": 2, "STAY": 3, "COMMENT": 4, "REVIEW": 5}

@dataclass
class LogCfg:
    """로그 정렬 및 필터링 설정"""
    logs_are_latest_first: bool = True
    use_timestamp_sort: bool = False

class VectorSASRec(nn.Module):
    def __init__(self, clip_dim=512, hidden_dim=512, num_actions=7, n_layers=2, n_heads=4, dropout=0.1, maxlen=200):
        super().__init__()
        self.clip_dim = int(clip_dim)
        self.hidden_dim = int(hidden_dim)
        self.maxlen = int(maxlen)
        
        self.item_in_proj = nn.Linear(self.clip_dim, self.hidden_dim, bias=False)
        self.act_emb = nn.Embedding(int(num_actions), self.hidden_dim, padding_idx=0)
        self.pos_emb = nn.Embedding(self.maxlen, self.hidden_dim)
        self.drop = nn.Dropout(float(dropout))
        
        layer = nn.TransformerEncoderLayer(
            d_model=self.hidden_dim,
            nhead=int(n_heads),
            dim_feedforward=self.hidden_dim * 4,
            dropout=float(dropout),
            activation='gelu',
            batch_first=True,
            norm_first=True
        )
        self.encoder = nn.TransformerEncoder(layer, num_layers=int(n_layers))
        
        self.out_norm = nn.LayerNorm(self.hidden_dim)

    def item_base(self, x):
        return self.item_in_proj(x)

    def forward(self, seq_item_embs, seq_act_idxs, valid_lens):
        # seq_item_embs: (B, L, clip_dim)
        # seq_act_idxs: (B, L)
        bsz, L = seq_act_idxs.shape
        
        # 1) item projection
        seq_emb = self.item_in_proj(seq_item_embs) # (B, L, H)
        
        # 2) action embedding
        act_emb = self.act_emb(seq_act_idxs)       # (B, L, H)
        x = seq_emb + act_emb
        
        # 3) positional embedding (reverse order logic as per original script)
        # positions: 0, 1, ..., L-1
        positions = torch.arange(L, device=x.device).unsqueeze(0).expand(bsz, L)
        pos_emb = self.pos_emb(positions)
        
        x = x + pos_emb
        x = self.drop(x)
        
        # 4) masking (padding mask)
        # key_padding_mask: True where padded (0)
        key_padding_mask = (seq_act_idxs == 0)
        
        # causal mask is usually not strictly needed if we only look at the last position for prediction
        # but standard SASRec uses it. Assuming the encoder handles it or we just need representation.
        # The original script didn't show explicit causal mask in __init__, defaulting to standard encoder.
        
        out = self.encoder(x, src_key_padding_mask=key_padding_mask)
        out = self.out_norm(out)
        
        # gather last valid position
        # valid_lens (B,) -> index = valid_lens - 1
        last_idxs = (valid_lens - 1).clamp(min=0).view(-1, 1, 1).expand(-1, -1, self.hidden_dim)
        user_emb = out.gather(1, last_idxs).squeeze(1) # (B, H)
        
        return user_emb

class TwoTowerAlign(nn.Module):
    def __init__(self, dim=512, dropout=0.1):
        super().__init__()
        self.user_proj = nn.Sequential(
            nn.Linear(dim, dim),
            nn.LayerNorm(dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim, dim)
        )
        self.item_proj = nn.Sequential(
            nn.Linear(dim, dim),
            nn.LayerNorm(dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim, dim)
        )
    
    def forward_user(self, x):
        return self.user_proj(x)
    
    def forward_item(self, y):
        return self.item_proj(y)

def load_item_vectors(path: str, expected_dim=512):
    """JSON 파일에서 아이템 벡터 로드"""
    print(f"Loading vectors from {path}...")
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # artwork_id 기준으로 정렬 (Deterministic 보장)
    data.sort(key=lambda x: x['artwork_id'])
    
    a2i = {} # artwork_id -> index
    i2a = {} # index -> artwork_id
    vectors = []
    
    # 0번 인덱스는 패딩용으로 예약
    a2i["<PAD>"] = 0
    i2a[0] = "<PAD>"
    vectors.append([0.0] * expected_dim)
    
    for idx, item in enumerate(data, start=1):
        aid = item['artwork_id']
        vec = item['vector']
        if len(vec) != expected_dim:
            # 차원이 안 맞으면 0으로 채우거나 에러 처리 (여기선 0 패딩 가정)
            vec = vec[:expected_dim] + [0.0]*(expected_dim - len(vec))
            
        a2i[aid] = idx
        i2a[idx] = aid
        vectors.append(vec)
    
    item_mat = torch.tensor(vectors, dtype=torch.float)
    print(f"Loaded {len(vectors)} items (including padding).")
    return item_mat, a2i, i2a

class ArtworkEmbedder:
    """
    artwork_to_embedded.py의 로직을 캡슐화한 클래스
    OpenCLIP(ViT-B-32)을 사용하여 이미지와 텍스트의 가중합 벡터를 생성합니다.
    """
    def __init__(self, device):
        print("Loading OpenCLIP model (ViT-B-32)...")
        self.device = device
        # pretrained='openai' 사용
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32', pretrained='openai', device=self.device
        )
        self.tokenizer = open_clip.get_tokenizer('ViT-B-32')
        self.model.eval()
        print("OpenCLIP model loaded.")

    def encode(self, image: Image.Image, description: str = "") -> List[float]:
        """
        이미지(PIL)와 설명(Str)을 받아 512차원 벡터 리스트를 반환
        Logic: (Image * 0.95) + (Text * 0.05)
        """
        # 1. 이미지 전처리 및 인코딩
        image_input = self.preprocess(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            image_features = self.model.encode_image(image_input)
            image_features /= image_features.norm(dim=-1, keepdim=True)

            final_vec = image_features

            # 2. 텍스트가 있으면 가중 합
            if description and description.strip():
                text_input = self.tokenizer([description]).to(self.device)
                text_features = self.model.encode_text(text_input)
                text_features /= text_features.norm(dim=-1, keepdim=True)
                
                # 기존 로직: 0.95 * Image + 0.05 * Text
                final_vec = (image_features * 0.95) + (text_features * 0.05)
                final_vec /= final_vec.norm(dim=-1, keepdim=True)
        
        return final_vec.cpu().float().numpy().flatten().tolist()