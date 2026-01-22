# UserRecommend_Train_Model.py (Revised)
import json
import math
import random
from collections import defaultdict
from datetime import datetime
from pathlib import Path, PosixPath
from typing import Dict, Tuple, Any, Optional, List, Union

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm

# -----------------------------
# Config
# -----------------------------
LOG_PATH = "user_timestamp.json"     # 유저 로그 데이터
CLIP_VEC_JSON = "artwork_vector.json" # 이미지 벡터 데이터
SASREC_CKPT = "BEST_SASRec_model.pth" # 노트북에서 학습된 체크포인트
OUT_PTH = "Best_UserRecommend_model.pth" # 결과 저장 경로

# SASRec 학습시 설정과 맞춰야 함 (노트북 CFG 참조)
# 만약 체크포인트 안에 config가 있다면 그것을 우선순위로 덮어씁니다.
MAX_USER_EVENTS = 200
MAXLEN = 50       
HIDDEN = 512      # D_MODEL
LAYERS = 8        # N_LAYERS (노트북 기준 8)
HEADS = 4         # N_HEADS (노트북 기준 4)
DROPOUT = 0.1     # DROPOUT

# Two Tower 학습 설정
EPOCHS = 50
BATCH_SIZE = 512
LR = 1e-3
WEIGHT_DECAY = 1e-4
EVAL_NEG = 100
SEED = 42

# -----------------------------
# Utils
# -----------------------------
def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

def parse_ts(ts: Any) -> int:
    if not ts: return 0
    s = str(ts).strip()
    # 이미 timestamp 숫자형인 경우
    if s.replace('.','',1).isdigit():
        return int(float(s))
    
    fmts = ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y/%m/%d %H:%M:%S"]
    for fmt in fmts:
        try:
            return int(datetime.strptime(s, fmt).timestamp())
        except ValueError:
            pass
    return 0

def user_type_from_len(L: int) -> str:
    if L <= 5: return "cold"
    if L <= 20: return "normal"
    return "heavy"

def alpha_for_user_type(t: str) -> Tuple[float, float]:
    # (alpha_clip, alpha_log)
    if t == "cold": return 0.90, 0.10
    if t == "normal": return 0.70, 0.30
    return 0.40, 0.60

def hr_ndcg_at_k(ranked_items: List[int], gt: int, k: int) -> Tuple[float, float]:
    topk = ranked_items[:k]
    if gt in topk:
        rank = topk.index(gt) + 1
        return 1.0, 1.0 / math.log2(rank + 1)
    return 0.0, 0.0

def load_logs_auto(path: str) -> List[dict]:
    p = Path(path)
    if not p.exists():
        # 파일이 없으면 빈 리스트 반환하거나 에러 처리
        print(f"Warning: {path} not found.")
        return []
    
    text = p.read_text(encoding="utf-8").strip()
    if not text: return []
    if text.startswith("["):
        return json.loads(text)
    
    # JSONL 처리
    out = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except:
                    pass
    return out

def build_user_sequences(logs: List[dict], artwork2idx: Dict[str, int]) -> Dict[str, List[int]]:
    by_user = defaultdict(list)
    for r in logs:
        uid = str(r.get("user_id") or r.get("member_id") or "").strip()
        if not uid: continue
        
        aid = r.get("artwork_id") or r.get("item_id")
        if aid is None: continue
        aid = str(aid).strip()
        
        if aid not in artwork2idx:
            continue

        t = parse_ts(r.get("timestamp"))
        by_user[uid].append((t, artwork2idx[aid]))

    user_seq = {}
    for uid, arr in by_user.items():
        # 시간순 정렬
        arr.sort(key=lambda x: x[0])
        seq = [i for _, i in arr]
        # Max Length 자르기
        if len(seq) > MAX_USER_EVENTS:
            seq = seq[-MAX_USER_EVENTS:]
        user_seq[uid] = seq
    return user_seq

def right_align(seq_idx: List[int], maxlen: int) -> List[int]:
    seq_idx = seq_idx[-maxlen:]
    return [0] * (maxlen - len(seq_idx)) + seq_idx

def stratified_user_split(user_seq: Dict[str, List[int]], train_ratio=0.8, seed=42):
    rng = random.Random(seed)
    buckets = {"cold": [], "normal": [], "heavy": []}

    for uid, seq in user_seq.items():
        if len(seq) < 2: continue
        t = user_type_from_len(len(seq))
        buckets[t].append(uid)

    train_users, val_users = set(), set()
    for t, uids in buckets.items():
        rng.shuffle(uids)
        n = len(uids)
        cut = int(n * train_ratio)
        train_users.update(uids[:cut])
        val_users.update(uids[cut:])

    train_seq = {u: user_seq[u] for u in train_users}
    val_seq = {u: user_seq[u] for u in val_users}
    
    stat = {
        "train": {k: sum(1 for u in train_seq if user_type_from_len(len(train_seq[u])) == k) for k in buckets},
        "val":   {k: sum(1 for u in val_seq   if user_type_from_len(len(val_seq[u]))   == k) for k in buckets},
        "total": {k: len(buckets[k]) for k in buckets},
    }
    return train_seq, val_seq, stat

# -----------------------------
# CLIP Matrix Loader
# -----------------------------
def load_clip_matrix_full(clip_vec_json: str, clip_dim=512):
    """
    artwork_vector.json을 읽어서:
    1. artwork2idx, idx2artwork 생성
    2. item_mat (Tensor) 생성
    Returns: artwork2idx, idx2artwork, item_mat
    """
    path = Path(clip_vec_json)
    if not path.exists():
        raise FileNotFoundError(f"{clip_vec_json} not found.")
        
    text = path.read_text(encoding="utf-8").strip()
    if text.startswith("["):
        data = json.loads(text)
    else:
        # jsonl
        data = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip(): data.append(json.loads(line))

    # ID -> Vector 맵핑
    id2vec = {}
    valid_cnt = 0
    
    # 키 이름 유연하게 처리
    keys_id = ["artwork_id", "idx", "item_id", "id"]
    keys_vec = ["artwork_vector", "vector", "embedding", "clip_vector"]

    for item in data:
        aid = None
        for k in keys_id:
            if k in item: 
                aid = str(item[k])
                break
        
        vec = None
        for k in keys_vec:
            if k in item:
                vec = item[k]
                break
        
        if aid and vec and len(vec) == clip_dim:
            id2vec[aid] = vec
            valid_cnt += 1

    # 인덱싱 (0은 Padding)
    artwork2idx = {"<PAD>": 0}
    idx2artwork = {0: "<PAD>"}
    matrix_list = [np.zeros(clip_dim, dtype=np.float32)] # 0번 인덱스

    for aid, vec in id2vec.items():
        curr_idx = len(artwork2idx)
        artwork2idx[aid] = curr_idx
        idx2artwork[curr_idx] = aid
        matrix_list.append(np.array(vec, dtype=np.float32))

    # Tensor 변환
    item_mat = torch.tensor(np.stack(matrix_list), dtype=torch.float32)
    # 정규화 (Cosine Similarity용)
    item_mat = item_mat / (item_mat.norm(dim=-1, keepdim=True) + 1e-12)

    print(f"[CLIP] Loaded {valid_cnt} items. Matrix shape: {item_mat.shape}")
    return artwork2idx, idx2artwork, item_mat


# -----------------------------
# ✅ FeatureSASRec (Modified for Script)
# -----------------------------
class FeatureSASRec(nn.Module):
    """
    노트북의 모델 구조와 동일하게 맞춤.
    ID Embedding 대신 item_vectors(CLIP)를 입력으로 받음.
    """
    def __init__(self, item_vectors: torch.Tensor, hidden_dim=512, n_layers=8, n_heads=4, dropout=0.1, maxlen=50):
        super().__init__()
        # item_vectors는 버퍼로 등록 (저장/로드 시 포함되지만 학습되진 않음 - 필요시 제외 가능)
        self.register_buffer("item_vectors", item_vectors)
        
        self.hidden_dim = hidden_dim
        self.maxlen = maxlen

        # 1. Projection Layer (512 -> hidden_dim)
        # 노트북: Linear -> LayerNorm -> GELU
        self.proj = nn.Sequential(
            nn.Linear(item_vectors.size(1), hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU()
        )

        # 2. Positional Embedding
        self.pos_emb = nn.Embedding(maxlen, hidden_dim)

        # 3. Transformer Encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=n_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=dropout,
            batch_first=True,
            norm_first=True # 노트북 설정 따름
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        # 4. Final LayerNorm
        self.ln_f = nn.LayerNorm(hidden_dim)

    def forward(self, seq_ids):
        # seq_ids: (Batch, Seq_Len)
        
        # Vector Lookup
        x = self.item_vectors[seq_ids] # (B, S, 512)
        x = self.proj(x)               # (B, S, Hidden)

        # Positional Encoding
        B, S, _ = x.shape
        positions = torch.arange(S, device=x.device).unsqueeze(0)
        # maxlen보다 길면 자름 (안전장치)
        if S > self.maxlen:
            positions = positions[:, :self.maxlen]
            x = x[:, :self.maxlen, :]
            
        x = x + self.pos_emb(positions)

        # Padding Mask (0번 아이템은 패딩)
        pad_mask = (seq_ids == 0)

        # Transformer
        out = self.encoder(x, src_key_padding_mask=pad_mask)
        
        return self.ln_f(out)

    @torch.no_grad()
    def predict_last(self, seq_ids):
        """
        마지막 시점의 유저 임베딩만 반환 (Two Tower용)
        """
        # (Batch, Seq_Len, Hidden)
        out = self.forward(seq_ids)
        
        # 마지막 유효 토큰 찾기 (패딩이 아닌 마지막)
        # 여기서는 right_align을 썼으므로 단순히 -1을 가져오면 됨
        # 만약 패딩이 뒤에 있다면 별도 처리가 필요하지만, 
        # 이 스크립트의 right_align 함수는 [0, 0, A, B] 형태이므로 -1이 항상 마지막 아이템임.
        return out[:, -1, :]


def load_sasrec_ckpt_fixed(ckpt_path: str, item_mat: torch.Tensor, device: str):
    import os
    import pathlib
    
    # Windows Path 문제 해결
    _orig_posix = None
    if os.name == "nt":
        _orig_posix = pathlib.PosixPath
        pathlib.PosixPath = pathlib.WindowsPath

    try:
        # weights_only=False로 로드 (사용자 정의 객체 포함 가능성)
        ckpt = torch.load(ckpt_path, map_location=device)
    except:
        ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    finally:
        if _orig_posix:
            pathlib.PosixPath = _orig_posix

    # Config 추출
    state_dict = ckpt['state_dict'] if 'state_dict' in ckpt else ckpt
    config = ckpt.get('config', {})
    
    # 하이퍼파라미터 복원 (없으면 기본값)
    h_dim = config.get('D_MODEL', HIDDEN)
    n_layers = config.get('N_LAYERS', LAYERS)
    n_heads = config.get('N_HEADS', HEADS)
    dropout = config.get('DROPOUT', DROPOUT)
    maxlen = config.get('MAXLEN', MAXLEN)

    print(f"[SASRec Load] Dim={h_dim}, Layers={n_layers}, Heads={n_heads}, MaxLen={maxlen}")

    # 모델 초기화
    model = FeatureSASRec(
        item_vectors=item_mat, # 현재 로드된 벡터 매트릭스 주입
        hidden_dim=h_dim,
        n_layers=n_layers,
        n_heads=n_heads,
        dropout=dropout,
        maxlen=maxlen
    ).to(device)

    # State Dict 키 정리 (혹시 모를 prefix 불일치 해결)
    new_state_dict = {}
    for k, v in state_dict.items():
        # item_vectors는 우리가 주입했으므로 로드하지 않음 (크기가 다를 수 있음)
        if "item_vectors" in k or "item_mat" in k:
            continue
        new_state_dict[k] = v
    
    # 가중치 로드
    msg = model.load_state_dict(new_state_dict, strict=False)
    print(f"[SASRec Load] {msg}") # Missing key에 item_vectors가 있어도 괜찮음
    
    model.eval()
    return model

# -----------------------------
# Two-Tower Model
# -----------------------------
class TwoTowerAlign(nn.Module):
    def __init__(self, dim: int = 512, dropout: float = 0.1):
        super().__init__()
        # SASRec 출력과 Item Vector(CLIP)를 같은 공간으로 매핑
        self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))
        self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.LayerNorm(dim), nn.Dropout(dropout))

    def forward(self, user_vec, item_vec):
        zu = self.user_proj(user_vec)
        zi = self.item_proj(item_vec)
        # Cosine Similarity
        zu = zu / (zu.norm(dim=-1, keepdim=True) + 1e-12)
        zi = zi / (zi.norm(dim=-1, keepdim=True) + 1e-12)
        return (zu * zi).sum(dim=-1)

# -----------------------------
# Dataset & Train Loop
# -----------------------------
class AlignTrainDataset(Dataset):
    def __init__(self, user_seq: Dict[str, List[int]], num_items: int, seed: int = 42):
        self.users = [u for u, s in user_seq.items() if len(s) >= 2]
        self.user_seq = user_seq
        self.num_items = num_items # Max Index
        self.rng = np.random.default_rng(seed)
        self.user_hist = {u: set(user_seq[u]) for u in self.users}

    def __len__(self):
        return len(self.users)

    def _neg(self, hist: set):
        # 간단한 랜덤 네거티브 샘플링
        while True:
            j = int(self.rng.integers(1, self.num_items + 1))
            if j not in hist:
                return j

    def __getitem__(self, idx):
        uid = self.users[idx]
        seq = self.user_seq[uid]
        
        # 학습용: 시퀀스 중 하나를 타겟으로 잡음
        if len(seq) >= 3:
            t = int(self.rng.integers(1, len(seq) - 1))
        else:
            t = 1 # [0, 1] -> input:0, target:1
            
        inp = seq[:t]
        pos = seq[t]
        neg = self._neg(self.user_hist[uid])
        
        return str(uid), inp, pos, neg

def collate_fn(batch):
    uids, inps, pos, neg = zip(*batch)
    return list(uids), list(inps), torch.tensor(pos, dtype=torch.long), torch.tensor(neg, dtype=torch.long)

@torch.no_grad()
def evaluate(model_sas, model_tt, clip_mat, user_seq, device, maxlen, num_items, num_neg=100):
    rng = np.random.default_rng(42)
    hr = {10: [], 20: []}
    ndcg = {10: [], 20: []}

    users = [u for u, s in user_seq.items() if len(s) >= 3]
    # 시간 관계상 샘플링 평가 (전체 유저 평가시 너무 오래 걸릴 수 있음)
    if len(users) > 500:
        users = random.sample(users, 500)

    for uid in tqdm(users, desc="eval", leave=False):
        seq = user_seq[uid]
        hist = seq[:-1] # 마지막 하나 빼고 입력
        gt = seq[-1]    # 정답
        
        if len(hist) < 1: continue

        # Negative Sampling
        cands = [gt]
        hist_set = set(seq)
        while len(cands) < num_neg + 1:
            j = int(rng.integers(1, num_items + 1))
            if j not in hist_set and j != gt:
                cands.append(j)
        
        cand_t = torch.tensor(cands, dtype=torch.long, device=device) # (101,)

        # 1. User Vector (SASRec)
        # Right Align Padding
        padded_hist = right_align(hist, maxlen)
        seq_tensor = torch.tensor([padded_hist], dtype=torch.long, device=device) # (1, maxlen)
        user_vec = model_sas.predict_last(seq_tensor) # (1, 512)

        # 2. Candidate Vectors (CLIP)
        cand_clip = clip_mat[cand_t] # (101, 512)

        # 3. Two Tower Score
        # user_vec을 cands 개수만큼 복사해서 계산
        user_vec_rep = user_vec.repeat(cand_clip.size(0), 1)
        tt_scores = model_tt(user_vec_rep, cand_clip) # (101,)

        # 4. Content Score (User's last item vs Candidates) - Optional Logic
        # 여기서는 Two Tower 점수만으로 평가하거나, 
        # 원하신다면 alpha blending 로직 추가 가능 (기존 코드의 alpha_for_user_type)
        # 이번 수정에서는 Two Tower 학습 확인이 목적이므로 TT Score만 사용
        scores = tt_scores 

        # Ranking
        _, indices = torch.topk(scores, k=20)
        ranked_cands = cand_t[indices].tolist()

        for k in [10, 20]:
            h, n = hr_ndcg_at_k(ranked_cands, gt, k)
            hr[k].append(h)
            ndcg[k].append(n)

    return {
        "HR@10": np.mean(hr[10]), "NDCG@10": np.mean(ndcg[10]),
        "HR@20": np.mean(hr[20]), "NDCG@20": np.mean(ndcg[20])
    }

def main():
    set_seed(SEED)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[System] device = {device}")

    # 1. Data Loading (CLIP Vectors)
    print(">>> Loading Artwork Vectors...")
    artwork2idx, idx2artwork, item_mat = load_clip_matrix_full(CLIP_VEC_JSON)
    item_mat = item_mat.to(device)
    num_items = len(artwork2idx) - 1
    print(f"    Num Items: {num_items}")

    # 2. Load Pre-trained SASRec
    print(">>> Loading SASRec Checkpoint...")
    sas_model = load_sasrec_ckpt_fixed(SASREC_CKPT, item_mat, device)
    
    # 3. User Logs
    print(">>> Loading User Logs...")
    logs = load_logs_auto(LOG_PATH)
    user_seq = build_user_sequences(logs, artwork2idx)
    
    # Split
    train_seq, val_seq, _ = stratified_user_split(user_seq, train_ratio=0.8)
    print(f"    Train Users: {len(train_seq)}, Val Users: {len(val_seq)}")

    # 4. Two Tower Model Init
    tt_model = TwoTowerAlign(dim=512, dropout=0.1).to(device)
    optimizer = torch.optim.AdamW(tt_model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    criterion = nn.BCEWithLogitsLoss()
    
    # Dataset
    train_ds = AlignTrainDataset(train_seq, num_items, seed=SEED)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, 
                              collate_fn=collate_fn, drop_last=True)

    # 5. Training Loop
    best_ndcg = 0.0
    
    print(">>> Start Two-Tower Alignment Training")
    for epoch in range(1, EPOCHS + 1):
        tt_model.train()
        total_loss = 0
        steps = 0
        
        for uids, inps, pos, neg in tqdm(train_loader, desc=f"Ep {epoch}", leave=False):
            # Input Sequence Pad
            inps_pad = [right_align(x, MAXLEN) for x in inps]
            inps_tensor = torch.tensor(inps_pad, dtype=torch.long, device=device)
            pos = pos.to(device)
            neg = neg.to(device)

            # 1. SASRec Inference (Fixed)
            with torch.no_grad():
                user_emb = sas_model.predict_last(inps_tensor) # (B, 512)

            # 2. Item Embs
            pos_vec = item_mat[pos] # (B, 512)
            neg_vec = item_mat[neg] # (B, 512)

            # 3. Two Tower Forward
            pos_score = tt_model(user_emb, pos_vec)
            neg_score = tt_model(user_emb, neg_vec)

            # Loss
            loss = criterion(pos_score, torch.ones_like(pos_score)) + \
                   criterion(neg_score, torch.zeros_like(neg_score))

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            steps += 1

        avg_loss = total_loss / steps if steps > 0 else 0
        
        # Eval
        tt_model.eval()
        metrics = evaluate(sas_model, tt_model, item_mat, val_seq, device, MAXLEN, num_items)
        
        print(f"Ep {epoch:02d} | Loss={avg_loss:.4f} | HR@10={metrics['HR@10']:.4f} NDCG@10={metrics['NDCG@10']:.4f}")

        if metrics['NDCG@10'] > best_ndcg:
            best_ndcg = metrics['NDCG@10']
            torch.save({
                "two_tower_state_dict": tt_model.state_dict(),
                "config": {
                    "hidden": HIDDEN,
                    "maxlen": MAXLEN
                },
                "idx2artwork": idx2artwork # 인덱스 맵핑 저장 필수
            }, OUT_PTH)
            print(f"    🌟 Saved Best Model -> {OUT_PTH}")

    print(f"Done. Best NDCG@10 = {best_ndcg:.4f}")

if __name__ == "__main__":
    main()