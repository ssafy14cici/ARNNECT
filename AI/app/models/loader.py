from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
import torch
import sys

# 경로에 맞춰 import
from .sasrec_twotower import VectorSASRec, TwoTowerAlign

def _adapt_sasrec_keys(state_dict: Dict[str, torch.Tensor], model_keys: list) -> Dict[str, torch.Tensor]:
    """
    학습된 파일(.pth)의 변수명을 현재 코드(VectorSASRec)에 맞게 강제 변환
    """
    new_sd = {}
    print("🔄 [Loader] 키 이름 변환 로직 가동...")

    for k, v in state_dict.items():
        new_k = k
        
        # 1. 메인 레이어 (encoder.layers -> blocks)
        if "encoder.layers" in new_k:
            new_k = new_k.replace("encoder.layers", "blocks")
            
        # 2. 어텐션 내부 (self_attn -> attn)
        if "self_attn" in new_k:
            new_k = new_k.replace("self_attn", "attn")
            
        # 3. 아이템 프로젝션 (item_in_proj -> item_proj)
        if "item_in_proj" in new_k:
            new_k = new_k.replace("item_in_proj", "item_proj")
            
        # 4. LayerNorm (norm1 -> ln1, norm2 -> ln2)
        if "norm1" in new_k:
            new_k = new_k.replace("norm1", "ln1")
        if "norm2" in new_k:
            new_k = new_k.replace("norm2", "ln2")
            
        # 5. FeedForward (linear1 -> ff.0, linear2 -> ff.3)
        # Sequential로 정의했으므로 인덱스로 매핑
        if "linear1" in new_k:
            new_k = new_k.replace("linear1", "ff.0")
        if "linear2" in new_k:
            new_k = new_k.replace("linear2", "ff.3")

        new_sd[new_k] = v

    return new_sd

def _smart_load_ckpt(path: str) -> Dict[str, Any]:
    """pth 파일 구조가 딕셔너리든 모델 전체든 유연하게 로드"""
    print(f"📂 파일 읽기 시도: {path}")
    ckpt = torch.load(path, map_location="cpu")
    
    if isinstance(ckpt, dict):
        if "state_dict" in ckpt: return ckpt["state_dict"]
        if "model_state_dict" in ckpt: return ckpt["model_state_dict"]
        if "model" in ckpt: return ckpt["model"]
        
        # 키가 파라미터 이름 같으면 바로 반환
        keys = list(ckpt.keys())
        if keys and isinstance(ckpt[keys[0]], torch.Tensor):
            return ckpt
            
    if hasattr(ckpt, "state_dict"):
        return ckpt.state_dict()
        
    return ckpt

def _strip_prefix(state_dict: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    prefixes = ("model.", "sas.", "sas_model.", "net.", "module.", "_orig_mod.", "recommender.")
    new_sd = {}
    for k, v in state_dict.items():
        cleaned = False
        for p in prefixes:
            if k.startswith(p):
                new_sd[k[len(p):]] = v
                cleaned = True
                break
        if not cleaned:
            new_sd[k] = v
    return new_sd

@dataclass
class LoadedModels:
    sasrec: Optional[VectorSASRec]
    twotower: Optional[TwoTowerAlign]

def _load_state_dict_from_file(path: str, key_hint: str = "state_dict") -> Dict[str, Any]:
    print(f"📂 Loading: {path}")
    ckpt = torch.load(path, map_location="cpu")
    if isinstance(ckpt, dict):
        if key_hint in ckpt:
            return ckpt[key_hint]
        if "state_dict" in ckpt:
            return ckpt["state_dict"]
        if "model_state_dict" in ckpt:
            return ckpt["model_state_dict"]
    return ckpt

def load_models(
    sasrec_ckpt: Optional[Path],
    twotower_ckpt: Optional[Path],
    *,
    device: str,
    # config params
    num_items: int,
    max_len: int,
    d_model: int,
    n_heads: int,
    n_layers: int,
    ff_dim: int,
    dropout: float,
    num_actions: int,
    item_vec_dim: int = 512,
) -> LoadedModels:
    
    sasrec = None
    twotower = None

    print("\n" + "="*40)
    print("🔧 [Model Loader] V17 Notebook 호환 로딩 시작")

    # 1. SASRec
    if sasrec_ckpt and Path(sasrec_ckpt).exists():
        try:
            # V17 노트북 파라미터 매핑
            sasrec = VectorSASRec(
                clip_dim=item_vec_dim,    # config.d_model (512)
                hidden_dim=d_model,       # config.d_model (512)
                num_actions=num_actions,
                n_layers=n_layers,
                n_heads=n_heads,
                dropout=dropout,
                maxlen=max_len
            )
            
            sd = _load_state_dict_from_file(str(sasrec_ckpt), key_hint="state_dict")
            
            # 모델 키 매칭 (Strict=True 시도 후 실패시 보고)
            missing, unexpected = sasrec.load_state_dict(sd, strict=False)
            print(f"✅ [SASRec] Loaded. (Missing: {len(missing)}, Unexpected: {len(unexpected)})")
            
            sasrec.to(device)
            sasrec.eval()
        except Exception as e:
            print(f"❌ [SASRec] Load Failed: {e}")
            sasrec = None

    # 2. TwoTower
    if twotower_ckpt and Path(twotower_ckpt).exists():
        try:
            twotower = TwoTowerAlign(dim=d_model, dropout=dropout)
            
            # 노트북은 "two_tower_state_dict" 라는 키로 저장함 (Cell 10 참조)
            sd = _load_state_dict_from_file(str(twotower_ckpt), key_hint="two_tower_state_dict")
            
            twotower.load_state_dict(sd, strict=False)
            print("✅ [TwoTower] Loaded.")
            
            twotower.to(device)
            twotower.eval()
        except Exception as e:
            print(f"⚠️ [TwoTower] Load Failed: {e}")
            twotower = None

    print("="*40 + "\n")
    return LoadedModels(sasrec=sasrec, twotower=twotower)