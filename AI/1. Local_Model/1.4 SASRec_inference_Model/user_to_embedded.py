import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import json
from pathlib import Path
from tqdm.notebook import tqdm

# ==========================================
# 1. SASRec 모델 정의 (Key 매핑 대응)
# ==========================================
class UserEmbeddingSASRec(nn.Module):
    def __init__(self, item_count, embed_dim, max_seq_len, num_heads, num_layers, dropout):
        super(UserEmbeddingSASRec, self).__init__()
        self.item_embedding = nn.Embedding(item_count + 1, embed_dim, padding_idx=0)
        self.pos_embedding = nn.Embedding(max_seq_len, embed_dim)
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, 
            nhead=num_heads, 
            dim_feedforward=embed_dim * 4, 
            dropout=dropout,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.max_seq_len = max_seq_len

    def forward(self, seq_ids):
        seq_len = seq_ids.shape[1]
        positions = torch.arange(seq_len, device=seq_ids.device).unsqueeze(0)
        x = self.item_embedding(seq_ids) + self.pos_embedding(positions)
        mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool().to(seq_ids.device)
        output = self.transformer_encoder(x, mask=mask)
        return output[:, -1, :] 

# ==========================================
# 2. 메인 추론 및 JSON 저장 로직
# ==========================================
def main():
    # --- [설정] ---
    LOG_FILE = "user_logs.json"
    MODEL_PATH = "best_sasrec_model.pth"
    OUTPUT_FILE = "user_predictions1.json"
    
    MAX_SEQ_LEN = 200 
    EMBED_DIM = 512
    TRAINED_ITEM_COUNT = 30000 # 모델 가중치 규격에 맞춤
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # --- [데이터 로드] ---
    if not Path(LOG_FILE).exists():
        print(f"❌ {LOG_FILE} 파일이 없습니다.")
        return

    with open(LOG_FILE, "r", encoding="utf-8") as f:
        log_data = json.load(f)
    
    df = pd.DataFrame(log_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(['user_id', 'timestamp'])

    # 아이템 ID 매핑 (로그에 있는 실제 ID -> 인덱스)
    unique_items = sorted(df['artwork_id'].unique())
    item_to_idx = {item_id: idx + 1 for idx, item_id in enumerate(unique_items)}
    idx_to_item = {idx: item_id for item_id, idx in item_to_idx.items()}

    # --- [모델 로드 및 가중치 이름 치환] ---
    model = UserEmbeddingSASRec(
        item_count=TRAINED_ITEM_COUNT, 
        embed_dim=EMBED_DIM, 
        max_seq_len=MAX_SEQ_LEN,
        num_heads=8,
        num_layers=2,
        dropout=0.1
    ).to(device)

    if Path(MODEL_PATH).exists():
        state_dict = torch.load(MODEL_PATH, map_location=device)
        # transformer -> transformer_encoder 키 변환
        new_state_dict = {k.replace("transformer.", "transformer_encoder."): v for k, v in state_dict.items()}
        model.load_state_dict(new_state_dict)
        print(f"✅ 모델 가중치 로드 완료.")
    
    model.eval()

    # --- [유저별 예측 수행] ---
    inference_results = []
    
    for user_id, group in df.groupby('user_id'):
        # 시퀀스 생성
        item_indices = [item_to_idx[aid] for aid in group['artwork_id'].tolist()]
        if len(item_indices) > MAX_SEQ_LEN:
            seq = item_indices[-MAX_SEQ_LEN:]
        else:
            seq = [0] * (MAX_SEQ_LEN - len(item_indices)) + item_indices
        
        seq_tensor = torch.LongTensor([seq]).to(device)
        
        with torch.no_grad():
            user_vector = model(seq_tensor) 
            item_embeds = model.item_embedding.weight 
            
            # 모든 아이템 점수 계산
            scores = torch.matmul(user_vector, item_embeds.T).squeeze(0) 
            
            # 현재 로그에 존재하는 아이템 범위 내에서 점수 추출 (Filter)
            valid_indices = list(item_to_idx.values())
            valid_scores = scores[valid_indices]
            
            # 상위 5개 추출
            top_k = min(5, len(valid_indices))
            top_values, top_rel_indices = torch.topk(valid_scores, top_k)
            
            # 결과물 구성
            predicted_items = [idx_to_item[valid_indices[i]] for i in top_rel_indices]
            
            inference_results.append({
                "user_id": user_id,
                "history_count": len(item_indices),
                "last_item": group['artwork_id'].iloc[-1],
                "predicted_top_5": predicted_items,
                "timestamp_at_inference": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M")
            })

    # --- [JSON 파일 저장] ---
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(inference_results, f, indent=4, ensure_ascii=False)
    
    print(f"✅ 추론 결과가 '{OUTPUT_FILE}'에 저장되었습니다.")
    
    # 샘플 출력
    print("\n[추론 결과 샘플]")
    print(json.dumps(inference_results[0], indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()