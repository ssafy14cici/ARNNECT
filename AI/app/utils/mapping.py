from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Tuple

import json
import os
import tempfile
from pathlib import Path

@dataclass
class IdMapping:
    piece2idx: Dict[str, int]
    idx2piece: Dict[int, str]


def _atomic_write_json(path: str, obj) -> None:
    """Best-effort atomic JSON write.

    - Same directory에 임시 파일을 만든 뒤 os.replace(...)로 교체합니다.
    - 멀티프로세스 동시 쓰기까지 완벽하게 막지는 못하지만, 파일 깨짐은 방지합니다.
    """
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=p.name + ".", suffix=".tmp", dir=str(p.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, str(p))
    finally:
        # tmp가 남아있으면 정리
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def load_or_init_mapping(mapping_dir: str) -> IdMapping:
    """Load mapping files if exist, otherwise create default mapping.

    Files created/used:
      - piece_index.json (artwork_id -> index)
      - idx_to_piece.json (index -> artwork_id)

    Compatibility aliases (same content):
      - piece_to_index.json
      - index_to_piece.json

    Index 0 is reserved for PAD.
    """
    mapping_dir = str(mapping_dir)
    p_piece_index = os.path.join(mapping_dir, "piece_index.json")
    p_idx_to_piece = os.path.join(mapping_dir, "idx_to_piece.json")

    if os.path.exists(p_piece_index) and os.path.exists(p_idx_to_piece):
        return load_mapping(p_piece_index, p_idx_to_piece)

    # default mapping
    m = IdMapping(piece2idx={"__PAD__": 0}, idx2piece={0: "__PAD__"})
    save_mapping(p_piece_index, p_idx_to_piece, m)
    return m

def load_mapping(piece_index_path: str, idx_to_piece_path: str) -> IdMapping:
    p2i = json.loads(Path(piece_index_path).read_text(encoding="utf-8"))
    i2p_raw = json.loads(Path(idx_to_piece_path).read_text(encoding="utf-8"))
    # idx_to_piece.json이 {"0":"PAD", "1":"..."} 처럼 string key일 수 있으니 int로 변환
    i2p = {int(k): v for k, v in i2p_raw.items()}
    return IdMapping(piece2idx=p2i, idx2piece=i2p)

def save_mapping(piece_index_path: str, idx_to_piece_path: str, mapping: IdMapping):
    # primary files
    _atomic_write_json(piece_index_path, mapping.piece2idx)
    idx2piece_str = {str(k): v for k, v in mapping.idx2piece.items()}
    _atomic_write_json(idx_to_piece_path, idx2piece_str)

    # compatibility aliases (some code/users prefer these names)
    mapping_dir = str(Path(piece_index_path).parent)
    _atomic_write_json(os.path.join(mapping_dir, "piece_to_index.json"), mapping.piece2idx)
    _atomic_write_json(os.path.join(mapping_dir, "index_to_piece.json"), idx2piece_str)

def ensure_artwork(mapping: IdMapping, artwork_id: str) -> Tuple[IdMapping, int, bool]:
    """Ensure artwork_id exists in mapping. Return (mapping, idx, created?)."""
    if artwork_id in mapping.piece2idx:
        return mapping, int(mapping.piece2idx[artwork_id]), False
    # index 0 is PAD, new ids start from 1
    new_idx = max(mapping.idx2piece.keys()) + 1 if mapping.idx2piece else 1
    mapping.piece2idx[artwork_id] = int(new_idx)
    mapping.idx2piece[int(new_idx)] = artwork_id
    return mapping, int(new_idx), True
