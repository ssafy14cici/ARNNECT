import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import pandas as pd
import numpy as np
import json
import io
from pathlib import Path

# ==========================================
# 1. 모델 및 데이터셋 정의
# ==========================================
class SASRecModel(nn.Module):
    def __init__(self, item_count, embed_dim, max_seq_len):
        super().__init__()
        self.item_embedding = nn.Embedding(item_count + 1, embed_dim, padding_idx=0)
        self.pos_embedding = nn.Embedding(max_seq_len, embed_dim)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=8, dim_feedforward=embed_dim*4, dropout=0.2, batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=2)

    def forward(self, seq):
        positions = torch.arange(seq.shape[1], device=seq.device).unsqueeze(0)
        x = self.item_embedding(seq) + self.pos_embedding(positions)
        # Causal Mask (미래 정보 차단)
        mask = torch.triu(torch.ones(seq.shape[1], seq.shape[1], device=seq.device), diagonal=1).bool()
        return self.transformer(x, mask=mask)

class SASRecDataset(Dataset):
    def __init__(self, user_train, item_count, max_seq_len):
        self.user_ids = list(user_train.keys())
        self.user_train = user_train
        self.item_count = item_count
        self.max_seq_len = max_seq_len

    def __len__(self):
        return len(self.user_ids)

    def __getitem__(self, index):
        user_id = self.user_ids[index]
        items = self.user_train[user_id]
        seq = np.zeros([self.max_seq_len], dtype=np.int32)
        pos = np.zeros([self.max_seq_len], dtype=np.int32)
        neg = np.zeros([self.max_seq_len], dtype=np.int32)
        
        # 시퀀스 생성 로직
        nxt = items[-1]
        idx = self.max_seq_len - 1
        for i in reversed(items[:-1]):
            seq[idx] = i
            pos[idx] = nxt
            while True:
                neg_id = np.random.randint(1, self.item_count + 1)
                if neg_id not in items: break
            neg[idx] = neg_id
            nxt = i
            idx -= 1
            if idx == -1: break
        return torch.LongTensor(seq), torch.LongTensor(pos), torch.LongTensor(neg)

# ==========================================
# 2. 정확도(Accuracy) 측정 함수
# ==========================================
def evaluate_accuracy(model, user_train, item_count, device, top_k=10):
    model.eval()
    hits = 0
    total = 0
    # 평가 속도를 위해 유저 중 1000명 무작위 샘플링 검증
    sample_users = random.sample(list(user_train.keys()), min(1000, len(user_train)))
    
    with torch.no_grad():
        for uid in sample_users:
            items = user_train[uid]
            if len(items) < 2: continue
            
            seq = np.zeros([50], dtype=np.int32)
            seq[-len(items[:-1]):] = items[:-1][-50:]
            target = items[-1]
            
            seq_tensor = torch.LongTensor([seq]).to(device)
            output = model(seq_tensor)[:, -1, :] # 유저 취향 벡터
            
            # 모든 아이템과의 유사도(내적) 계산
            item_embs = model.item_embedding.weight[1:] 
            scores = torch.matmul(output, item_embs.T) # [1, item_count]
            
            top_indices = torch.topk(scores, top_k).indices[0].cpu().numpy() + 1
            if target in top_indices:
                hits += 1
            total += 1
    return hits / total if total > 0 else 0

# ==========================================
# 3. 메인 학습 루프 (수정된 로드 방식 포함)
# ==========================================
import random

def train():
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"📡 현재 디바이스: {DEVICE}")

    # --- [수정] 데이터 로드 방식 변경 (ValueError 방지) ---
    print("📂 데이터 로드 중 (train_user_logs.json)...")
    data = []
    with open("train_user_logs.json", "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    df = pd.DataFrame(data)
    # ---------------------------------------------------

    # 아이템 매핑
    item_ids = df['item_id'].unique()
    item_map = {aid: i + 1 for i, aid in enumerate(item_ids)}
    item_count = len(item_map)
    
    user_train = {}
    for uid, group in df.groupby('user_id'):
        user_train[uid] = [item_map[aid] for aid in group['item_id'].tolist()]

    model = SASRecModel(item_count, 512, 50).to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    dataset = SASRecDataset(user_train, item_count, 50)
    dataloader = DataLoader(dataset, batch_size=128, shuffle=True)

    best_acc = 0.0
    print(f"🚀 학습 시작 (아이템 수: {item_count})")

    for epoch in range(1, 51): # Epoch 50
        model.train()
        epoch_loss = 0
        for seq, pos, neg in dataloader:
            seq, pos, neg = seq.to(DEVICE), pos.to(DEVICE), neg.to(DEVICE)
            optimizer.zero_grad()
            
            output = model(seq)
            pos_emb = model.item_embedding(pos)
            neg_emb = model.item_embedding(neg)
            
            pos_logits = (output * pos_emb).sum(dim=-1)
            neg_logits = (output * neg_emb).sum(dim=-1)
            
            istarget = (pos > 0).float()
            loss = - (torch.log(torch.sigmoid(pos_logits) + 1e-24) * istarget +
                      torch.log(1 - torch.sigmoid(neg_logits) + 1e-24) * istarget).sum() / istarget.sum()
            
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        # 5회마다 정확도 측정 및 최고 모델 저장
        if epoch % 5 == 0 or epoch == 1:
            acc = evaluate_accuracy(model, user_train, item_count, DEVICE)
            avg_loss = epoch_loss / len(dataloader)
            print(f"🚩 Epoch {epoch:2d}/50 | Loss: {avg_loss:.4f} | Accuracy(HR@10): {acc:.4f}")
            
            if acc >= best_acc:
                best_acc = acc
                torch.save(model.state_dict(), "BEST_SASRec_model.pth")
                print(f"✨ 최고 정확도 갱신 ({acc:.4f}), 모델 저장 완료!")

    print(f"\n✅ 학습 완료! 최상위 정확도: {best_acc:.4f}")

if __name__ == "__main__":
    train()