"""폴더에 있는 이미지들을 한 번에 ChromaDB에 넣는 스크립트.

사용 예)
python scripts/bulk_ingest_images.py --img_dir ./images --mapping ./artifacts/mappings/piece_index.json
- 파일명(확장자 제외)을 artworkId로 사용 (예: category000_0000.jpg -> category000_0000)
"""

from __future__ import annotations
import argparse
from pathlib import Path
import io

import torch
import torch.nn.functional as F
from PIL import Image

from app.config import settings
from app.clip_embedder import load_clip
from app.chroma_client import init_chroma, upsert_embedding
from app.models.loader import load_models_auto
from app.utils.mapping import load_mapping, save_mapping, ensure_artwork

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--img_dir", required=True)
    ap.add_argument("--exts", default=".jpg,.jpeg,.png,.webp")
    args = ap.parse_args()

    dev = torch.device(settings.DEVICE if (settings.DEVICE=="cpu" or torch.cuda.is_available()) else "cpu")

    stores = init_chroma(settings.CHROMA_PATH, settings.CHROMA_COLLECTION_CLIP, settings.CHROMA_COLLECTION_TOWER)
    mapping = load_mapping(settings.MAPPING_PATH, settings.IDX2PIECE_PATH)

    # 모델 체크포인트를 자동 로딩 (설정값/ckpt를 기반으로 하이퍼파라미터를 최대한 복원)
    models = load_models_auto(
        settings.SASREC_CKPT,
        settings.TWOTOWER_CKPT,
        n_heads_default=8,
        dropout_default=0.2,
        device=str(dev),
    )

    clip = load_clip(settings.CLIP_MODEL_NAME, device=str(dev))

    exts = tuple(e.strip().lower() for e in args.exts.split(","))
    img_dir = Path(args.img_dir)
    files = [p for p in img_dir.rglob("*") if p.suffix.lower() in exts]

    created_any = False
    for p in files:
        art_id = p.stem
        mapping, idx, created = ensure_artwork(mapping, art_id)
        created_any = created_any or created

        pil = Image.open(p).convert("RGB")
        clip_vec = clip.embed_pil(pil)
        upsert_embedding(stores.clip_col, art_id, clip_vec, metadata={"idx": idx})

        with torch.inference_mode():
            v = torch.tensor([clip_vec], dtype=torch.float32, device=dev)
            base = models.sas_model.item_base(v)
            tower = models.tt_model.item_proj(base)
            tower = F.normalize(tower, p=2, dim=-1, eps=1e-12)
        upsert_embedding(stores.tower_col, art_id, tower[0].float().cpu().tolist(), metadata={"idx": idx})

        if created:
            print("[NEW]", art_id, "->", idx)
    if created_any:
        save_mapping(settings.MAPPING_PATH, settings.IDX2PIECE_PATH, mapping)

if __name__ == "__main__":
    main()
