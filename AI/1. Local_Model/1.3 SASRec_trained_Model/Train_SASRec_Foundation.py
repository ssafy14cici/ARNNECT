import json
import os
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
from tqdm import tqdm

# ==========================================
# 1. 설정 (Config)
# ==========================================
# ✅ 사용자님 파일명으로 정확히 설정했습니다.
LOG_PATH = "train_user_logs.json"         
CLIP_VEC_JSON = "artwork_vector.json"    

# 저장할 모델 파일명 (두 개 다 새로 만듭니다)
SASREC_CKPT = "BEST_SASRec_model.pth"
TWOTOWER_CKPT = "Best_UserRecommend_model.pth"

MAX_LEN = 200
HIDDEN_DIM = 512
BATCH_SIZE = 64
EPOCHS = 30       # 확실하게 학습
LR = 0.001
SEED = 42

# ==========================================
# 2. 모델 구조 정의
# (Inference 코드와 100% 똑같은 구조로 만듭니다)
# ==========================================
class FeatureSASRec(nn.Module):
    def __init__(self, item_vectors, hidden_dim=512, n_layers=2, n_heads=4, dropout=0.1, maxlen=50):
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
            d_model=hidden_dim, nhead=n_heads, dim_feedforward=hidden_dim*4,
            dropout=dropout, batch_first=True, norm_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.ln_f = nn.LayerNorm(hidden_dim)

    def forward(self, seq_ids):
        x = self.item_vectors[seq_ids]
        x = self.proj(x)
        B, S, _ = x.shape
        positions = torch.arange(S, device=x.device).unsqueeze(0)
        x = x + self.pos_emb(positions[:, :S])
        pad_mask = (seq_ids == 0)
        causal_mask = torch.triu(torch.ones(S, S, device=x.device) * float('-inf'), diagonal=1)
        out = self.encoder(x, mask=causal_mask, src_key_padding_mask=pad_mask)
        return self.ln_f(out)

class TwoTowerAlign(nn.Module):
    def __init__(self, dim: int = 512, dropout: float = 0.1):
        super().__init__()
        self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))
        self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))

    def forward(self, user_vec, item_vec):
        zu = self.user_proj(user_vec)
        zi = self.item_proj(item_vec)
        return (zu * zi).sum(dim=-1)

# ==========================================
# 3. 데이터 로드 및 전처리
# ==========================================
def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def load_data():
    print(">>> 데이터 로딩 중...")
    if not os.path.exists(CLIP_VEC_JSON):
        print(f"❌ 오류: '{CLIP_VEC_JSON}' 파일이 없습니다.")
        return None, None, None
    
    with open(CLIP_VEC_JSON, 'r', encoding='utf-8') as f:
        vec_data = json.load(f)
    
    artwork2idx = {"<PAD>": 0}
    matrix_list = [np.zeros(512, dtype=np.float32)]
    
    for item in vec_data:
        aid = item.get("artwork_id") or item.get("item_id")
        vec = item.get("artwork_vector")
        if aid and vec:
            artwork2idx[aid] = len(artwork2idx)
            matrix_list.append(np.array(vec, dtype=np.float32))
            
    item_mat = torch.tensor(np.stack(matrix_list), dtype=torch.float32)
    # 정규화
    item_mat = item_mat / (item_mat.norm(dim=-1, keepdim=True) + 1e-12)
    
    if not os.path.exists(LOG_PATH):
        print(f"❌ 오류: '{LOG_PATH}' 파일이 없습니다. 파일명을 확인해주세요.")
        return None, None, None

    with open(LOG_PATH, 'r', encoding='utf-8') as f:
        logs = json.load(f)

    user_seq = {}
    for log in logs:
        uid = log['user_id']
        aid = log['artwork_id']
        if aid in artwork2idx:
            if uid not in user_seq: user_seq[uid] = []
            user_seq[uid].append(artwork2idx[aid])
            
    print(f"✅ 학습 데이터 준비 완료 (아이템: {len(artwork2idx)-1}개, 유저: {len(user_seq)}명)")
    return artwork2idx, item_mat, user_seq

class SASRecDataset(Dataset):
    def __init__(self, user_seq, maxlen=50):
        self.samples = []
        for seq in user_seq.values():
            if len(seq) < 2: continue
            if len(seq) > maxlen + 1: seq = seq[-(maxlen+1):]
            input_ids = seq[:-1]
            target_ids = seq[1:]
            pad_len = maxlen - len(input_ids)
            input_ids = [0] * pad_len + input_ids
            target_ids = [0] * pad_len + target_ids
            self.samples.append((torch.tensor(input_ids), torch.tensor(target_ids)))
    
    def __len__(self): return len(self.samples)
    def __getitem__(self, idx): return self.samples[idx]

# ==========================================
# 4. 메인 학습 루프 (End-to-End)
# ==========================================
def main():
    set_seed(SEED)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[System] 통합 학습 시작 (Device: {device})")
    
    artwork2idx, item_mat, user_seq = load_data()
    if artwork2idx is None: return
    
    dataset = SASRecDataset(user_seq, MAX_LEN)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    # 1. 모델 초기화 (두 모델 모두 생성)
    sas_model = FeatureSASRec(item_mat.to(device), hidden_dim=HIDDEN_DIM, maxlen=MAX_LEN).to(device)
    tt_model = TwoTowerAlign(dim=HIDDEN_DIM).to(device)
    
    # 두 모델의 파라미터를 한 번에 학습
    params = list(sas_model.parameters()) + list(tt_model.parameters())
    optimizer = torch.optim.Adam(params, lr=LR)
    loss_fn = nn.CrossEntropyLoss(ignore_index=0) 

    sas_model.train()
    tt_model.train()
    
    print(f">>> 총 {EPOCHS} 에폭 동안 'SASRec + 투타워' 동시 학습 진행...")
    
    for epoch in range(1, EPOCHS + 1):
        total_loss = 0
        pbar = tqdm(loader, desc=f"Epoch {epoch}/{EPOCHS}")
        
        for input_ids, target_ids in pbar:
            input_ids, target_ids = input_ids.to(device), target_ids.to(device)
            
            # 1. SASRec 통과 -> 유저 임베딩
            sas_emb = sas_model(input_ids) # (B, S, H)
            
            # 2. TwoTower User Projector 통과
            # (Batch*Seq, H) 형태로 변환해서 통과
            B, S, H = sas_emb.shape
            user_final = tt_model.user_proj(sas_emb.view(-1, H)) # (B*S, H)
            
            # 3. TwoTower Item Projector 통과 (전체 아이템)
            # 모든 아이템을 투타워 공간으로 보냄
            all_items_vec = sas_model.item_vectors # (N, H)
            item_final = tt_model.item_proj(all_items_vec) # (N, H)
            
            # 4. 내적 (유사도 계산)
            # (B*S, H) @ (N, H).T -> (B*S, N)
            logits = torch.matmul(user_final, item_final.T)
            
            # 5. Loss 계산
            loss = loss_fn(logits, target_ids.view(-1))
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            pbar.set_postfix(loss=loss.item())
            
        print(f"   [Epoch {epoch}] 평균 Loss: {total_loss / len(loader):.4f}")

    # ==========================================
    # 5. 저장 (두 파일 모두 생성)
    # ==========================================
    print(">>> 모델 저장 중...")
    
    # SASRec 저장
    torch.save({
        "state_dict": sas_model.state_dict(),
        "config": {"hidden": HIDDEN_DIM, "maxlen": MAX_LEN}
    }, SASREC_CKPT)
    print(f"✅ [1/2] SASRec 모델 생성 완료: {SASREC_CKPT}")
    
    # TwoTower 저장
    torch.save({
        "two_tower_state_dict": tt_model.state_dict()
    }, TWOTOWER_CKPT)
    print(f"✅ [2/2] 투타워 모델 생성 완료: {TWOTOWER_CKPT}")
    
    print("\n🎉 모든 준비가 끝났습니다! 이제 추론 코드를 실행하세요.")

if __name__ == "__main__":
    main()