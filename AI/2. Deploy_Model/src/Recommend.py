import torch
import torch.nn as nn
import json
import numpy as np
from pathlib import Path
from collections import defaultdict
import os

# --- 모델 클래스 (기존과 동일) ---
class FeatureSASRec(nn.Module):
    def __init__(self, item_vectors, hidden_dim=512, n_layers=2, n_heads=4, dropout=0.1, maxlen=200):
        super().__init__()
        self.register_buffer("item_vectors", item_vectors)
        self.hidden_dim = hidden_dim
        self.maxlen = maxlen
        self.proj = nn.Sequential(nn.Linear(item_vectors.size(1), hidden_dim), nn.LayerNorm(hidden_dim), nn.GELU())
        self.pos_emb = nn.Embedding(maxlen, hidden_dim)
        encoder_layer = nn.TransformerEncoderLayer(d_model=hidden_dim, nhead=n_heads, dim_feedforward=hidden_dim*4, dropout=dropout, batch_first=True, norm_first=True)
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.ln_f = nn.LayerNorm(hidden_dim)

    def forward(self, seq_ids):
        x = self.item_vectors[seq_ids]
        x = self.proj(x)
        B, S, _ = x.shape
        positions = torch.arange(S, device=x.device).unsqueeze(0)
        if S > self.maxlen: x, S = x[:, :self.maxlen, :], self.maxlen
        x = x + self.pos_emb(positions[:, :S])
        pad_mask = (seq_ids == 0)
        if pad_mask.size(1) > self.maxlen: pad_mask = pad_mask[:, :self.maxlen]
        out = self.encoder(x, src_key_padding_mask=pad_mask)
        return self.ln_f(out)

    @torch.no_grad()
    def predict_last(self, seq_ids):
        out = self.forward(seq_ids)
        return out[:, -1, :]

class TwoTowerAlign(nn.Module):
    def __init__(self, dim=512, dropout=0.1):
        super().__init__()
        self.user_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))
        self.item_proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))

    @torch.no_grad()
    def predict_user(self, user_vec):
        zu = self.user_proj(user_vec)
        return zu / (zu.norm(dim=-1, keepdim=True) + 1e-12)

    @torch.no_grad()
    def predict_item(self, item_vec):
        zi = self.item_proj(item_vec)
        return zi / (zi.norm(dim=-1, keepdim=True) + 1e-12)

# --- 추천 로직 클래스 ---
class ArtRecommender:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.MAXLEN = 200
        self.HIDDEN = 512
        self.data_dir = Path("data") 
        
        self.user_logs_map = {} # 초기화
        self._load_vectors()
        self._load_models()
        self._load_logs()

    def _load_vectors(self):
        print("[Recommender] Loading Vectors...")
        vec_path = self.data_dir / "artwork_vector.json"
        if not vec_path.exists():
            print(f"❌ Error: {vec_path.resolve()} not found!")
            return

        with open(vec_path, "r", encoding='utf-8') as f:
            data = json.load(f)
        
        self.artwork2idx = {"<PAD>": 0}
        self.idx2artwork = {0: "<PAD>"}
        matrix_list = [np.zeros(512, dtype=np.float32)]
        
        for item in data:
            aid = str(item.get("artwork_id") or item.get("item_id"))
            vec = item.get("artwork_vector")
            if aid and vec:
                idx = len(self.artwork2idx)
                self.artwork2idx[aid] = idx
                self.idx2artwork[idx] = aid
                matrix_list.append(np.array(vec, dtype=np.float32))
        
        self.item_mat = torch.tensor(np.stack(matrix_list), dtype=torch.float32).to(self.device)
        self.item_mat = self.item_mat / (self.item_mat.norm(dim=-1, keepdim=True) + 1e-12)

    def _load_models(self):
        print("[Recommender] Loading Models...")
        self.sas = FeatureSASRec(self.item_mat, hidden_dim=self.HIDDEN, maxlen=self.MAXLEN).to(self.device)
        self.tt = TwoTowerAlign(dim=self.HIDDEN).to(self.device)
        
        try:
            sas_ckpt = torch.load(self.data_dir / "BEST_SASRec_model.pth", map_location=self.device)
            state = {k:v for k,v in sas_ckpt.get('state_dict', sas_ckpt).items() if "item_vectors" not in k}
            self.sas.load_state_dict(state, strict=False)
            self.sas.eval()
            
            tt_ckpt = torch.load(self.data_dir / "Best_UserRecommend_model.pth", map_location=self.device)
            self.tt.load_state_dict(tt_ckpt.get('two_tower_state_dict', tt_ckpt))
            self.tt.eval()
            print("✅ Models loaded successfully.")
        except Exception as e:
            print(f"⚠️ Model load failed: {e}")

    def _load_logs(self):
        # [디버깅] 절대 경로 확인
        log_path = self.data_dir / "test_user_logs.json"
        abs_path = log_path.resolve()
        
        print(f"[Recommender] Trying to load logs from: {abs_path}")
        
        if not log_path.exists():
            print(f"❌ ERROR: Log file NOT found at {abs_path}")
            print(f"👉 Please check if 'test_user_logs.json' is inside '{self.data_dir.resolve()}'")
            return

        try:
            with open(log_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content.startswith("["):
                    logs = json.loads(content)
                else:
                    f.seek(0)
                    logs = [json.loads(line) for line in f if line.strip()]
        except Exception as e:
            print(f"❌ Log parsing error: {e}")
            return

        self.user_logs_map = defaultdict(list)
        for r in logs:
            uid = str(r.get("member_id") or r.get("user_id") or "").strip()
            aid = str(r.get("artwork_id") or r.get("item_id") or "").strip()
            if uid and aid:
                self.user_logs_map[uid].append(aid)
                
        print(f"✅ Loaded history for {len(self.user_logs_map)} users. (Sample ID: {list(self.user_logs_map.keys())[:3]})")

    def recommend(self, member_id: str = None, history_list: list = None, topk: int = 10):
        final_history = []
        status_msg = "OK"

        # 1. member_id 조회
        if member_id:
            final_history = self.user_logs_map.get(member_id, [])
            if not final_history:
                status_msg = f"User '{member_id}' not found in logs. (Cold Start)"
                print(f"⚠️ {status_msg}")
        
        # 2. 직접 입력된 history가 있다면 덮어쓰기
        if history_list:
            final_history = history_list
            status_msg = "Using provided history list."

        # ID -> Index 변환
        seq = [self.artwork2idx.get(aid, 0) for aid in final_history if aid in self.artwork2idx]
        seq = seq[-self.MAXLEN:]
        pad_len = self.MAXLEN - len(seq)
        input_ids = [0] * pad_len + seq
        
        input_tensor = torch.tensor([input_ids], device=self.device)
        
        with torch.no_grad():
            user_sas_emb = self.sas.predict_last(input_tensor)
            user_emb = self.tt.predict_user(user_sas_emb)
            all_items = self.tt.predict_item(self.item_mat)
            scores = (user_emb @ all_items.T).squeeze()
            
            if seq: scores[seq] = -9999
            scores[0] = -9999
            
            vals, indices = torch.topk(scores, k=topk)
            
        results = [{"rank": i+1, "artwork_id": self.idx2artwork.get(idx.item()), "score": val.item()} 
                   for i, (val, idx) in enumerate(zip(vals, indices))]
        
        return results, status_msg, len(final_history)