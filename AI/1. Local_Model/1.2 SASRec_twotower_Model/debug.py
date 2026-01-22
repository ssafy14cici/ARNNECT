import torch
import torch.nn.functional as F
import numpy as np
import json
import random
from torch.utils.data import DataLoader
from train_user_logs import FeatureSASRec, TwoTowerAlign, load_data, SASRecDataset, MAX_LEN, HIDDEN_DIM

# 저장된 모델 불러오기
MODEL_PATH = "BEST_SASRec_model.pth"
TOWER_PATH = "Best_UserRecommend_model.pth"

def debug_predictions():
    print(">>> [디버깅] 모델 상태 점검 시작...")
    
    # 1. 데이터 로드
    artwork2idx, item_mat, user_seq = load_data()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # 2. 모델 로드
    sas_model = FeatureSASRec(item_mat.to(device), hidden_dim=HIDDEN_DIM, maxlen=MAX_LEN).to(device)
    tt_model = TwoTowerAlign(dim=HIDDEN_DIM).to(device)
    
    try:
        sas_checkpoint = torch.load(MODEL_PATH)
        sas_model.load_state_dict(sas_checkpoint['state_dict'])
        
        tt_checkpoint = torch.load(TOWER_PATH)
        tt_model.load_state_dict(tt_checkpoint['two_tower_state_dict'])
        print("✅ 모델 가중치 로드 성공")
    except Exception as e:
        print(f"❌ 모델 로드 실패: {e}")
        return

    sas_model.eval()
    tt_model.eval()
    
    # 3. 아이템 전체 임베딩 미리 계산
    print(">>> 아이템 임베딩 계산 중...")
    with torch.no_grad():
        all_items_vec = sas_model.item_vectors
        item_final = tt_model.item_proj(all_items_vec)
        item_final = F.normalize(item_final, p=2, dim=-1) # 정규화

    # 4. 랜덤 유저 5명 뽑아서 뭘 추천하는지 뜯어보기
    sample_users = random.sample(list(user_seq.keys()), 5)
    
    idx2artwork = {v: k for k, v in artwork2idx.items()} # ID 역추적용

    print("\n" + "="*60)
    print(f"🕵️‍♂️ [추천 패턴 분석] 과연 모델은 무엇을 추천하고 있을까?")
    print("="*60)

    for uid in sample_users:
        seq = user_seq[uid]
        if len(seq) < 2: continue
        
        input_seq = seq[:-1]
        target_item_idx = seq[-1]
        
        # 모델 예측
        with torch.no_grad():
            pad_len = MAX_LEN - len(input_seq)
            if pad_len < 0: input_seq = input_seq[-MAX_LEN:]
            else: input_seq = [0]*pad_len + input_seq
            
            input_tensor = torch.tensor(input_seq, device=device).unsqueeze(0)
            
            sas_emb = sas_model(input_tensor)
            last_emb = sas_emb[:, -1, :]
            
            user_vec = tt_model.user_proj(last_emb)
            user_vec = F.normalize(user_vec, p=2, dim=-1)
            
            # 점수 계산
            scores = torch.matmul(user_vec, item_final.T).squeeze()
            scores[0] = -np.inf # 패딩 제외
            
            # Top 10 추출
            top_scores, top_indices = torch.topk(scores, k=10)
            top_indices = top_indices.cpu().numpy()
            
        print(f"\n👤 User ID: {uid}")
        print(f"   🎯 정답 아이템: {idx2artwork.get(target_item_idx, '???')} (Index: {target_item_idx})")
        print(f"   🤖 모델 추천 Top 5 Indices: {top_indices[:5]}")
        print(f"   🖼️  모델 추천 Top 5 ID: {[idx2artwork.get(i, '?') for i in top_indices[:5]]}")
        print(f"   📊  Top 1 Score: {top_scores[0]:.4f}")

if __name__ == "__main__":
    # train_user_logs.py 파일이 있는 곳에서 실행해야 import가 됩니다.
    debug_predictions()