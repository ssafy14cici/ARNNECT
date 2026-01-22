import json
import os
import random
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
from tqdm import tqdm

# ==========================================
# 1. 설정 (Config)
# ==========================================
LOG_PATH = "train_user_logs.json"         
CLIP_VEC_JSON = "artwork_vector.json"    

# 저장할 모델 파일명
SASREC_CKPT = "BEST_SASRec_model.pth"
TWOTOWER_CKPT = "Best_UserRecommend_model.pth"

MAX_LEN = 200
HIDDEN_DIM = 512
BATCH_SIZE = 64
EPOCHS = 30
LR = 0.001
SEED = 42

# ==========================================
# 2. 모델 구조 정의
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
        # LayerNorm 제거 (마지막에 F.normalize를 할 것이므로)
        self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))
        self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))

    def forward(self, user_vec, item_vec):
        zu = self.user_proj(user_vec)
        zi = self.item_proj(item_vec)
        
        # 🔥 핵심 변경: 코사인 유사도 기반 학습을 위해 벡터를 길이 1로 맞춤
        zu = F.normalize(zu, p=2, dim=-1)
        zi = F.normalize(zi, p=2, dim=-1)
        
        # 정규화된 벡터끼리의 내적 = 코사인 유사도 (-1 ~ 1 사이 값)
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
        print(f"❌ 오류: '{LOG_PATH}' 파일이 없습니다.")
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
# 4. 평가 함수 (Evaluation)
# ==========================================
def evaluate_valid(sas_model, tt_model, user_seq, all_item_vecs, maxlen=50, device='cuda'):
    """
    Validation: 각 유저의 마지막 아이템(Target)을 맞추는지 테스트 (Leave-One-Out)
    """
    sas_model.eval()
    tt_model.eval()
    
    HR_10, HR_20 = [], []
    NDCG_10, NDCG_20 = [], []
    
    # 전체 아이템 임베딩 미리 계산 (TwoTower Projection)
    with torch.no_grad():
        all_items_proj = tt_model.item_proj(all_item_vecs.to(device))  # (N_items, H)
    
    # 유저별로 평가
    # (속도를 위해 배치 단위가 아니라 단순 루프로 진행하지만, 데이터가 매우 크면 배치 처리가 필요함)
    # 여기서는 tqdm으로 진행상황 표시
    users = [u for u in user_seq.keys() if len(user_seq[u]) >= 2]
    
    # 너무 오래 걸릴 경우를 대비해 최대 1000명만 랜덤 샘플링해서 평가할 수도 있음 (현재는 전체 평가)
    # users = random.sample(users, min(len(users), 1000))

    with torch.no_grad():
        for uid in users:
            seq = user_seq[uid]
            if len(seq) > maxlen + 1: seq = seq[-(maxlen+1):]
            
            # 입력: 마지막 하나 뺀 시퀀스
            # 정답: 마지막 아이템
            input_seq = seq[:-1] 
            target_item = seq[-1]
            
            pad_len = maxlen - len(input_seq)
            input_tensor = torch.tensor([0]*pad_len + input_seq, device=device).unsqueeze(0) # (1, maxlen)
            
            # 1. User Embedding (SASRec)
            sas_out = sas_model(input_tensor) # (1, maxlen, H)
            last_emb = sas_out[:, -1, :]      # (1, H) - 시퀀스의 마지막 시점 임베딩
            
            # 2. User Projection (TwoTower)
            user_vec = tt_model.user_proj(last_emb) # (1, H)
            
            # 3. Score Calculation (Dot Product)
            # (1, H) @ (N, H).T -> (1, N)
            scores = torch.matmul(user_vec, all_items_proj.T).squeeze()
            
            # 4. 이미 본 아이템 마스킹 (선택사항, 여기서는 정답 맞추기므로 생략하거나 정답만 남김)
            # 여기서는 순수하게 모든 아이템 중 랭킹을 봅니다.
            scores[0] = -np.inf # 패딩 토큰 제외

            # 5. Ranking
            # 상위 20개만 뽑음 (속도 최적화)
            _, top_indices = torch.topk(scores, k=20)
            top_indices = top_indices.cpu().numpy()
            
            # 6. Metric Check
            # HR (Hit Rate)
            hit_10 = 1 if target_item in top_indices[:10] else 0
            hit_20 = 1 if target_item in top_indices[:20] else 0
            HR_10.append(hit_10)
            HR_20.append(hit_20)
            
            # NDCG
            ndcg_10 = 0
            ndcg_20 = 0
            
            if hit_10:
                rank = np.where(top_indices[:10] == target_item)[0][0]
                ndcg_10 = 1.0 / np.log2(rank + 2)
                
            if hit_20:
                rank = np.where(top_indices[:20] == target_item)[0][0]
                ndcg_20 = 1.0 / np.log2(rank + 2)
                
            NDCG_10.append(ndcg_10)
            NDCG_20.append(ndcg_20)
            
    return np.mean(HR_10), np.mean(HR_20), np.mean(NDCG_10), np.mean(NDCG_20)

# ==========================================
# 5. 메인 학습 루프
# ==========================================
def main():
    set_seed(SEED)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[System] 통합 학습 시작 (Device: {device})")
    
    artwork2idx, item_mat, user_seq = load_data()
    if artwork2idx is None: return

    # 🔥 [안전장치] 벡터가 혹시 0으로 가득 찼는지 확인
    if torch.all(item_mat.sum(dim=1) == 0):
        print("❌ [치명적 오류] 모든 아이템 벡터가 0입니다. CLIP JSON 파일을 확인하세요.")
        return
    
    dataset = SASRecDataset(user_seq, MAX_LEN)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    sas_model = FeatureSASRec(item_mat.to(device), hidden_dim=HIDDEN_DIM, maxlen=MAX_LEN).to(device)
    tt_model = TwoTowerAlign(dim=HIDDEN_DIM).to(device)
    
    params = list(sas_model.parameters()) + list(tt_model.parameters())
    optimizer = torch.optim.Adam(params, lr=LR)
    loss_fn = nn.CrossEntropyLoss(ignore_index=0) 

    best_hr10 = 0.0
    
    # 🔥 [설정] Temperature parameter (값이 클수록 분포가 뾰족해짐)
    # 보통 0.07로 나누거나, 10~20을 곱해줍니다. 여기선 20을 곱하겠습니다.
    logit_scale = 20.0 

    print(f">>> 총 {EPOCHS} 에폭 학습 시작 (Logit Scale: {logit_scale})...")
    
    for epoch in range(1, EPOCHS + 1):
        sas_model.train()
        tt_model.train()
        total_loss = 0
        
        pbar = tqdm(loader, desc=f"Epoch {epoch}/{EPOCHS}")
        
        for input_ids, target_ids in pbar:
            input_ids, target_ids = input_ids.to(device), target_ids.to(device)
            
            # 1. SASRec (유저 시퀀스 -> 벡터)
            sas_emb = sas_model(input_ids) # (B, S, H)
            B, S, H = sas_emb.shape
            
            # 2. TwoTower Projection & Normalization
            # (User)
            user_final = tt_model.user_proj(sas_emb.view(-1, H))
            user_final = F.normalize(user_final, p=2, dim=-1) # 정규화
            
            # (Item - All)
            all_items_vec = sas_model.item_vectors
            item_final = tt_model.item_proj(all_items_vec)
            item_final = F.normalize(item_final, p=2, dim=-1) # 정규화
            
            # 3. Logit 계산 (Cosine Similarity)
            # -1 ~ 1 사이의 값이 나옵니다.
            logits = torch.matmul(user_final, item_final.T) 
            
            # 🔥 핵심 변경: Temperature Scaling
            # 값을 키워줘서 Softmax가 확실하게 동작하게 함
            logits = logits * logit_scale 
            
            loss = loss_fn(logits, target_ids.view(-1))
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            pbar.set_postfix(loss=loss.item())

        avg_loss = total_loss / len(loader)
        
        # --- Evaluate ---
        # 
        print(f"   [Evaluating...] 검증 진행 중...")
        # 평가 함수 내부에서도 TwoTower를 쓰므로, TwoTowerAlign이 수정되었으면 평가도 자동으로 정규화 적용됨
        hr10, hr20, ndcg10, ndcg20 = evaluate_valid(sas_model, tt_model, user_seq, item_mat, MAX_LEN, device)
        
        print(f"   🚩 [Result] Loss: {avg_loss:.4f} | HR@10: {hr10:.4f} | HR@20: {hr20:.4f} | NDCG@10: {ndcg10:.4f} | NDCG@20: {ndcg20:.4f}")
        
        if hr10 > best_hr10:
            best_hr10 = hr10
            print(f"   💾 [Best!] HR@10 갱신 ({best_hr10:.4f})")
            torch.save({"state_dict": sas_model.state_dict(), "config": {"hidden": HIDDEN_DIM, "maxlen": MAX_LEN}}, SASREC_CKPT)
            torch.save({"two_tower_state_dict": tt_model.state_dict()}, TWOTOWER_CKPT)
        else:
            print(f"   (Best 유지: {best_hr10:.4f})")

if __name__ == "__main__":
    main()