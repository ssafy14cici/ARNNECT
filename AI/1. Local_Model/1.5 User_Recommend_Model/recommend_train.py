import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import mlflow


# =========================
# 1) Config (JSON only)
# =========================
@dataclass
class Config:
    BASE_DIR: Path = Path(__file__).resolve().parent

    # Inputs (JSON only)
    ITEM_FILE: Path = Path("artwork_vector.json")        # list[{artist_id, artwork_id, artwork_vector}]
    USER_FILE: Path = Path("user_timestamp.json")        # list[{user_id, artwork_id, timestamp, ...}]
    SASREC_WEIGHTS: Path = Path("BEST_SASRec_model.pth") # torch.save(model.state_dict())

    # (매우 중요) 훈련 당시 artwork_id -> (0-based) index 매핑 파일(JSON)
    # 예: {"912637ab": 0, "102908ab": 1, ...}
    # 훈련 당시 인덱스와 동일해야 SASRec이 제대로 작동함.
    TRAIN_INDEX_FILE: Path = Path("train_item_index.json")  # 없으면 콘텐츠 기반만 사용

    # Outputs (JSON only)
    OUT_RECO_JSON: Path = Path("user_recommendations.json")
    OUT_PROFILE_JSON: Path = Path("user_profiles.json")
    OUT_SUMMARY_JSON: Path = Path("analysis_summary.json")

    # Vector dim (CLIP 벡터 차원)
    VECTOR_DIM: int = 512

    # cold/normal/heavy by history length
    COLD_MAX_LEN: int = 5
    NORMAL_MAX_LEN: int = 30

    # log weight(alpha_log). content weight = 1-alpha_log
    ALPHA_LOG_COLD: float = 0.10
    ALPHA_LOG_NORMAL: float = 0.50
    ALPHA_LOG_HEAVY: float = 0.65

    TOPK: int = 20
    SEED: int = 42

    # MLflow (서버는 별도로 `mlflow server --host 127.0.0.1 --port 8080`)
    MLFLOW_TRACKING_URI: str = "http://127.0.0.1:8080"
    MLFLOW_EXPERIMENT: str = "user_recommend_infer"

    @property
    def device(self) -> str:
        return "cuda" if torch.cuda.is_available() else "cpu"


cfg = Config()
random.seed(cfg.SEED)
np.random.seed(cfg.SEED)
torch.manual_seed(cfg.SEED)
torch.cuda.manual_seed_all(cfg.SEED)


# =========================
# 2) JSON utils (JSON only)
# =========================
def load_json(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, obj: Any) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


# =========================
# 3) Load items: CLIP vectors + metadata
# =========================
def load_items(item_path: Path) -> Tuple[List[str], np.ndarray, Dict[str, Dict[str, Any]]]:
    """
    Returns:
      - artwork_ids: list[str] (current dataset)
      - clip_mat: (N, D) normalized
      - meta_by_artwork_id
    """
    raw = load_json(item_path)
    if not isinstance(raw, list):
        raise ValueError("ITEM_FILE must be a JSON array (list of dicts).")

    if raw and isinstance(raw[0], dict):
        print(f"[DEBUG] ITEM sample keys={list(raw[0].keys())}")

    artwork_ids: List[str] = []
    vecs: List[np.ndarray] = []
    meta: Dict[str, Dict[str, Any]] = {}

    for it in raw:
        if not isinstance(it, dict):
            continue
        aid = it.get("artwork_id")
        v = it.get("artwork_vector")
        if aid is None or v is None:
            continue
        aid = str(aid)
        arr = np.asarray(v, dtype=np.float32)
        if arr.ndim != 1 or arr.shape[0] != cfg.VECTOR_DIM:
            continue
        n = np.linalg.norm(arr) + 1e-8
        arr = (arr / n).astype(np.float32)

        artwork_ids.append(aid)
        vecs.append(arr)
        meta[aid] = {k: it.get(k) for k in it.keys() if k != "artwork_vector"}

    if not artwork_ids:
        raise RuntimeError("No valid items loaded from ITEM_FILE.")

    clip_mat = np.stack(vecs, axis=0)  # (N,D)
    return artwork_ids, clip_mat, meta


# =========================
# 4) Load user logs (JSON only) -> histories as artwork_id list
# =========================
def load_user_histories(user_path: Path) -> Dict[str, List[Tuple[Optional[float], str]]]:
    raw = load_json(user_path)
    if isinstance(raw, dict) and isinstance(raw.get("logs"), list):
        raw = raw["logs"]
    if not isinstance(raw, list):
        raise ValueError("USER_FILE must be a JSON array (or {'logs': [...]}).")

    if raw and isinstance(raw[0], dict):
        print(f"[DEBUG] USER sample keys={list(raw[0].keys())}")

    by_user: Dict[str, List[Tuple[Optional[float], str]]] = {}

    for r in raw:
        if not isinstance(r, dict):
            continue
        uid = r.get("user_id") or r.get("uid") or r.get("user")
        aid = r.get("artwork_id") or r.get("id") or r.get("idx")
        ts = r.get("timestamp") or r.get("ts")

        if uid is None or aid is None:
            continue

        uid = str(uid)
        aid = str(aid)

        try:
            ts_val = float(ts) if ts is not None else None
        except Exception:
            ts_val = None

        by_user.setdefault(uid, []).append((ts_val, aid))

    # sort by timestamp if available
    for uid, events in by_user.items():
        if any(t is not None for t, _ in events):
            events.sort(key=lambda x: (x[0] is None, x[0]))

    return by_user


# =========================
# 5) SASRec model builder that matches checkpoint shapes
# =========================
class SASRecForInference(nn.Module):
    def __init__(self, num_items: int, max_seq_len: int, d_model: int, nhead: int, ff_dim: int, n_layers: int, dropout: float):
        super().__init__()
        self.num_items = num_items
        self.max_seq_len = max_seq_len
        self.d_model = d_model

        self.item_embedding = nn.Embedding(num_items, d_model, padding_idx=0)
        self.pos_embedding = nn.Embedding(max_seq_len, d_model)

        layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=ff_dim,
            dropout=dropout,
            batch_first=True,
            norm_first=False,  # 기본값 가정(체크포인트 키 구조와 일치하는 케이스가 많음)
        )
        self.transformer = nn.TransformerEncoder(layer, num_layers=n_layers)

    @torch.no_grad()
    def encode_user(self, seq: torch.Tensor) -> torch.Tensor:
        """
        seq: (B,L) left padded with 0. L must == self.max_seq_len
        returns normalized user vector (B,D)
        """
        B, L = seq.shape
        x = self.item_embedding(seq)
        pos = torch.arange(L, device=seq.device).unsqueeze(0)
        x = x + self.pos_embedding(pos)
        pad_mask = (seq == 0)
        out = self.transformer(x, src_key_padding_mask=pad_mask)
        u = out[:, -1, :]
        u = u / (u.norm(dim=-1, keepdim=True) + 1e-8)
        return u


def infer_model_shapes_from_ckpt(sd: Dict[str, torch.Tensor]) -> Tuple[int, int, int]:
    """
    Returns: (num_items, max_seq_len, ff_dim)
    """
    num_items = sd["item_embedding.weight"].shape[0]
    max_seq_len = sd["pos_embedding.weight"].shape[0]
    ff_dim = sd["transformer.layers.0.linear1.weight"].shape[0]
    return num_items, max_seq_len, ff_dim


# =========================
# 6) Mapping: artwork_id -> train_idx (SASRec item index)
# =========================
def load_train_index_map(path: Path) -> Optional[Dict[str, int]]:
    if not path.exists():
        return None
    raw = load_json(path)
    if not isinstance(raw, dict):
        raise ValueError("TRAIN_INDEX_FILE must be a JSON object mapping artwork_id -> 0-based index.")
    # ensure int
    out: Dict[str, int] = {}
    for k, v in raw.items():
        try:
            out[str(k)] = int(v)
        except Exception:
            continue
    return out


def segment_and_alpha(hist_len: int) -> Tuple[str, float]:
    if hist_len <= cfg.COLD_MAX_LEN:
        return "cold", cfg.ALPHA_LOG_COLD
    if hist_len <= cfg.NORMAL_MAX_LEN:
        return "normal", cfg.ALPHA_LOG_NORMAL
    return "heavy", cfg.ALPHA_LOG_HEAVY


def pad_left_train_indices(train_hist: List[int], L: int) -> torch.Tensor:
    """
    train_hist: list of train indices (already +1 PAD offset applied if needed)
    Return (1,L) left padded
    """
    seq = train_hist[-L:]
    pad = [0] * max(0, L - len(seq))
    return torch.tensor([pad + seq], dtype=torch.long)


# =========================
# 7) Scoring
#   - content score: CLIP cosine in CLIP space
#   - log score: SASRec cosine in SASRec embedding space
#   - blend scores by alpha_log
# =========================
def content_profile_clip(hist_artwork_ids: List[str], id_to_clip: Dict[str, np.ndarray]) -> np.ndarray:
    vecs = [id_to_clip[a] for a in hist_artwork_ids if a in id_to_clip]
    if not vecs:
        return np.zeros((cfg.VECTOR_DIM,), dtype=np.float32)
    v = np.mean(np.stack(vecs, axis=0), axis=0).astype(np.float32)
    v = v / (np.linalg.norm(v) + 1e-8)
    return v


@torch.no_grad()
def score_log_for_current_items(
    model: SASRecForInference,
    u_log: torch.Tensor,                 # (D,) normalized
    current_artwork_ids: List[str],
    train_index_map: Dict[str, int],     # artwork_id -> 0-based index (train)
) -> np.ndarray:
    """
    Returns log scores for each current item (N,)
    If an item doesn't exist in train_index_map, score becomes very small.
    """
    # Normalize item embedding weights once
    W = model.item_embedding.weight  # (num_items, D)
    Wn = W / (W.norm(dim=-1, keepdim=True) + 1e-8)

    scores = np.full((len(current_artwork_ids),), -1e9, dtype=np.float32)
    for i, aid in enumerate(current_artwork_ids):
        if aid not in train_index_map:
            continue
        # train index is 0-based for items excluding PAD in mapping,
        # SASRec embedding usually uses 1..N for items and 0 for PAD
        tid0 = train_index_map[aid]
        tid = tid0 + 1  # shift for PAD
        if tid < 0 or tid >= Wn.shape[0]:
            continue
        scores[i] = float(torch.dot(Wn[tid], u_log).item())
    return scores


def recommend_topk(
    uid: str,
    hist_artwork_ids: List[str],
    current_artwork_ids: List[str],
    clip_mat: np.ndarray,
    id_to_clip: Dict[str, np.ndarray],
    model: Optional[SASRecForInference],
    train_index_map: Optional[Dict[str, int]],
    device: str,
    max_seq_len_train: int,
    topk: int,
    meta_by_artwork: Dict[str, Dict[str, Any]],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    seg, alpha_log = segment_and_alpha(len(hist_artwork_ids))
    alpha_content = 1.0 - alpha_log

    # ---------- content score ----------
    u_content = content_profile_clip(hist_artwork_ids, id_to_clip)      # (D,)
    score_content = clip_mat @ u_content                                # (N,)

    # ---------- log score ----------
    use_log = (model is not None) and (train_index_map is not None)
    if use_log:
        # user history -> train indices(+1)
        train_hist = []
        for aid in hist_artwork_ids:
            if aid in train_index_map:
                train_hist.append(train_index_map[aid] + 1)
        if train_hist:
            seq_t = pad_left_train_indices(train_hist, max_seq_len_train).to(device)
            u_log = model.encode_user(seq_t).squeeze(0)  # (D,) torch normalized
            score_log = score_log_for_current_items(model, u_log, current_artwork_ids, train_index_map)
        else:
            score_log = np.full_like(score_content, -1e9, dtype=np.float32)
            use_log = False
    else:
        score_log = np.full_like(score_content, -1e9, dtype=np.float32)

    # ---------- blend ----------
    # log을 못 쓰는 경우에는 콘텐츠만 사용 (alpha_log 무시)
    if not use_log:
        alpha_log_eff = 0.0
        alpha_content_eff = 1.0
    else:
        alpha_log_eff = alpha_log
        alpha_content_eff = alpha_content

    score = alpha_content_eff * score_content + alpha_log_eff * score_log  # (N,)

    # exclude already seen (by artwork_id)
    seen = set(hist_artwork_ids)
    for i, aid in enumerate(current_artwork_ids):
        if aid in seen:
            score[i] = -1e9

    k = min(topk, len(score))
    top_idx = np.argpartition(-score, kth=k - 1)[:k]
    top_idx = top_idx[np.argsort(-score[top_idx])]

    recs = []
    for ix in top_idx.tolist():
        aid = current_artwork_ids[ix]
        recs.append({
            "artwork_id": aid,
            "score": float(score[ix]),
            "score_content": float(score_content[ix]),
            "score_log": float(score_log[ix]) if use_log else None,
            "artist_id": meta_by_artwork.get(aid, {}).get("artist_id"),
        })

    profile = {
        "user_id": uid,
        "segment": seg,
        "history_len": len(hist_artwork_ids),
        "alpha_log": float(alpha_log_eff),
        "alpha_content": float(alpha_content_eff),
        "log_available": bool(use_log),
    }
    reco = {"user_id": uid, **profile, "recommendations": recs}
    return profile, reco


# =========================
# 8) Main
# =========================
def main():
    item_path = cfg.BASE_DIR / cfg.ITEM_FILE
    user_path = cfg.BASE_DIR / cfg.USER_FILE
    w_path = cfg.BASE_DIR / cfg.SASREC_WEIGHTS
    idx_path = cfg.BASE_DIR / cfg.TRAIN_INDEX_FILE

    print(f"[System] device={cfg.device}")
    print(f"[Paths] ITEM_FILE={item_path}")
    print(f"[Paths] USER_FILE={user_path}")
    print(f"[Paths] SASREC_WEIGHTS={w_path}")
    print(f"[Paths] TRAIN_INDEX_FILE={idx_path}")

    mlflow.set_tracking_uri(cfg.MLFLOW_TRACKING_URI)
    mlflow.set_experiment(cfg.MLFLOW_EXPERIMENT)

    current_artwork_ids, clip_mat, meta_by_artwork = load_items(item_path)
    histories = load_user_histories(user_path)

    # fast lookup: artwork_id -> clip_vector
    id_to_clip = {aid: clip_mat[i] for i, aid in enumerate(current_artwork_ids)}

    # load train index map (optional but strongly recommended)
    train_index_map = load_train_index_map(idx_path)
    if train_index_map is None:
        print("[WARN] TRAIN_INDEX_FILE not found. SASRec(log) score will be DISABLED, content-only recommendations will be produced.")

    # load SASRec model shapes from checkpoint and build matching model
    if not w_path.exists():
        raise FileNotFoundError(f"Missing SASRec weights: {w_path}")
    sd = torch.load(w_path, map_location="cpu")
    num_items_ckpt, max_seq_len_ckpt, ff_dim_ckpt = infer_model_shapes_from_ckpt(sd)

    print(f"[CKPT] num_items={num_items_ckpt} | max_seq_len={max_seq_len_ckpt} | ff_dim={ff_dim_ckpt}")

    model = SASRecForInference(
        num_items=num_items_ckpt,
        max_seq_len=max_seq_len_ckpt,
        d_model=cfg.VECTOR_DIM,
        nhead=4,                 # checkpoint에 nhead는 weight shape로 직접 못 뽑아서, 학습 설정과 같아야 함
        ff_dim=ff_dim_ckpt,
        n_layers=2,              # checkpoint 키에 layers.0, layers.1 -> 2 layers
        dropout=0.1,
    ).to(cfg.device).eval()

    # strict 로드 (완전 재현)
    model.load_state_dict(sd, strict=True)
    print("[Load] ✅ SASRec state_dict matched perfectly (strict=True)")

    profiles: List[Dict[str, Any]] = []
    recos: List[Dict[str, Any]] = []
    seg_count = {"cold": 0, "normal": 0, "heavy": 0}
    log_available_users = 0
    lens: List[int] = []

    out_prof = cfg.BASE_DIR / cfg.OUT_PROFILE_JSON
    out_reco = cfg.BASE_DIR / cfg.OUT_RECO_JSON
    out_sum = cfg.BASE_DIR / cfg.OUT_SUMMARY_JSON

    with mlflow.start_run(run_name="infer_analyze"):
        mlflow.log_param("TOPK", cfg.TOPK)
        mlflow.log_param("COLD_MAX_LEN", cfg.COLD_MAX_LEN)
        mlflow.log_param("NORMAL_MAX_LEN", cfg.NORMAL_MAX_LEN)
        mlflow.log_param("ALPHA_LOG_COLD", cfg.ALPHA_LOG_COLD)
        mlflow.log_param("ALPHA_LOG_NORMAL", cfg.ALPHA_LOG_NORMAL)
        mlflow.log_param("ALPHA_LOG_HEAVY", cfg.ALPHA_LOG_HEAVY)
        mlflow.log_param("CKPT_num_items", num_items_ckpt)
        mlflow.log_param("CKPT_max_seq_len", max_seq_len_ckpt)
        mlflow.log_param("CKPT_ff_dim", ff_dim_ckpt)

        for uid, events in histories.items():
            # events: list[(ts, artwork_id)] already sorted (if ts exists)
            hist_ids = [aid for _, aid in events]
            if not hist_ids:
                continue

            prof, reco = recommend_topk(
                uid=uid,
                hist_artwork_ids=hist_ids,
                current_artwork_ids=current_artwork_ids,
                clip_mat=clip_mat,
                id_to_clip=id_to_clip,
                model=model,
                train_index_map=train_index_map,
                device=cfg.device,
                max_seq_len_train=max_seq_len_ckpt,
                topk=cfg.TOPK,
                meta_by_artwork=meta_by_artwork,
            )
            profiles.append(prof)
            recos.append(reco)

            seg_count[prof["segment"]] += 1
            if prof["log_available"]:
                log_available_users += 1
            lens.append(prof["history_len"])

        summary = {
            "num_users_in_logs": len(histories),
            "num_users_profiled": len(profiles),
            "segment_count": seg_count,
            "log_available_users": log_available_users,
            "history_len": {
                "min": int(min(lens)) if lens else 0,
                "max": int(max(lens)) if lens else 0,
                "mean": float(sum(lens) / len(lens)) if lens else 0.0,
            },
            "notes": [
                "SASRec score uses TRAIN_INDEX_FILE mapping (artwork_id -> train_idx).",
                "If mapping missing for an artwork/user, log score is disabled and content-only is used.",
            ],
        }

        save_json(out_prof, profiles)
        save_json(out_reco, recos)
        save_json(out_sum, summary)

        mlflow.log_metric("num_users_profiled", summary["num_users_profiled"])
        mlflow.log_metric("cold_users", seg_count["cold"])
        mlflow.log_metric("normal_users", seg_count["normal"])
        mlflow.log_metric("heavy_users", seg_count["heavy"])
        mlflow.log_metric("log_available_users", log_available_users)
        if lens:
            mlflow.log_metric("history_len_mean", summary["history_len"]["mean"])

        mlflow.log_artifact(str(out_prof))
        mlflow.log_artifact(str(out_reco))
        mlflow.log_artifact(str(out_sum))

    print("[DONE]")
    print(f" - profiles: {out_prof}")
    print(f" - recos:    {out_reco}")
    print(f" - summary:  {out_sum}")


if __name__ == "__main__":
    main()
