from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import os

@dataclass(frozen=True)
class Settings:
    # Paths (relative to repo root by default)
    artifacts_dir: Path = Path(os.getenv("ARTIFACTS_DIR", "artifacts"))
    chroma_dir: Path = Path(os.getenv("CHROMA_DIR", "artifacts/chroma_db"))
    chroma_collection: str = os.getenv("CHROMA_COLLECTION", "artworks")

    # Mapping files (artworkId <-> train index)
    piece_to_index_path: Path = Path(os.getenv("PIECE_TO_INDEX", "artifacts/mappings/piece_index.json"))
    index_to_piece_path: Path = Path(os.getenv("INDEX_TO_PIECE", "artifacts/mappings/idx_to_piece.json"))

    # Checkpoints (optional)
    sasrec_ckpt: Path = Path(os.getenv("SASREC_CKPT", "artifacts/checkpoints/BEST_SASRec_model.pth"))
    twotower_ckpt: Path = Path(os.getenv("TWOTOWER_CKPT", "artifacts/checkpoints/BEST_BestRecommend_model.pth"))

    # Model hyperparams (MUST match training if you load checkpoints)
    num_items: int = int(os.getenv("NUM_ITEMS", "68702"))   # include padding index 0
    max_len: int = int(os.getenv("MAX_LEN", "200"))
    d_model: int = int(os.getenv("D_MODEL", "512"))
    n_heads: int = int(os.getenv("N_HEADS", "8"))
    n_layers: int = int(os.getenv("N_LAYERS", "2"))
    ff_dim: int = int(os.getenv("FF_DIM", "2048"))
    dropout: float = float(os.getenv("DROPOUT", "0.1"))
    num_actions: int = int(os.getenv("NUM_ACTIONS", "7"))

    # Serving
    device: str = os.getenv("DEVICE", "cuda" if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu")
    clip_model_name: str = os.getenv("CLIP_MODEL", "openai/clip-vit-base-patch32")
    clip_batch_size: int = int(os.getenv("CLIP_BATCH_SIZE", "16"))

settings = Settings()

# Backward-compatible alias (some code refers to `ServiceConfig`).
ServiceConfig = Settings
