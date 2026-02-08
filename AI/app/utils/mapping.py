from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Tuple

import json
import os
import tempfile
from pathlib import Path

@dataclass
class IdMapping:
    # [수정] Key와 Value의 타입을 명확히 int로 변경
    piece2idx: Dict[int, int]  # artworkId(int) -> index(int)
    idx2piece: Dict[int, int]  # index(int) -> artworkId(int)


def _atomic_write_json(path: str, obj) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=p.name + ".", suffix=".tmp", dir=str(p.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, str(p))
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def load_or_init_mapping(mapping_dir: str) -> IdMapping:
    mapping_dir = str(mapping_dir)
    p_piece_index = os.path.join(mapping_dir, "piece_index.json")
    p_idx_to_piece = os.path.join(mapping_dir, "idx_to_piece.json")

    if os.path.exists(p_piece_index) and os.path.exists(p_idx_to_piece):
        return load_mapping(p_piece_index, p_idx_to_piece)

    # [수정] PAD ID는 0(int)으로 유지, artworkId 매핑 없음
    m = IdMapping(piece2idx={}, idx2piece={0: 0}) 
    # 주의: 0번 인덱스는 PAD용으로 쓰지만, 실제 artworkId '0'과 겹칠 수 있으므로
    # 보통 artworkId 0은 시스템상 예약하거나 사용하지 않는 것이 안전합니다.
    # 여기서는 artworkId=0이 들어오면 index=0(PAD)과 충돌할 수 있으니 주의 필요.
    
    save_mapping(p_piece_index, p_idx_to_piece, m)
    return m

def load_mapping(piece_index_path: str, idx_to_piece_path: str) -> IdMapping:
    p2i_raw = json.loads(Path(piece_index_path).read_text(encoding="utf-8"))
    i2p_raw = json.loads(Path(idx_to_piece_path).read_text(encoding="utf-8"))
    
    # [수정] JSON Key는 무조건 String이므로, 로드 후 int로 변환
    # piece2idx: Key(artworkId_str) -> Value(index_int)
    p2i = {}
    for k, v in p2i_raw.items():
        if k == "__PAD__": continue # 레거시 호환
        p2i[int(k)] = int(v)

    # idx2piece: Key(index_str) -> Value(artworkId_int)
    i2p = {}
    for k, v in i2p_raw.items():
        if v == "__PAD__": 
            i2p[int(k)] = 0
        else:
            i2p[int(k)] = int(v)
            
    return IdMapping(piece2idx=p2i, idx2piece=i2p)

def save_mapping(piece_index_path: str, idx_to_piece_path: str, mapping: IdMapping):
    # [수정] JSON 저장을 위해 Key를 String으로 변환
    # piece2idx: artworkId(int) -> index(int)
    p2i_str_key = {str(k): v for k, v in mapping.piece2idx.items()}
    
    # idx2piece: index(int) -> artworkId(int)
    i2p_str_key = {str(k): v for k, v in mapping.idx2piece.items()}

    _atomic_write_json(piece_index_path, p2i_str_key)
    _atomic_write_json(idx_to_piece_path, i2p_str_key)

    # 호환성 파일 저장
    mapping_dir = str(Path(piece_index_path).parent)
    _atomic_write_json(os.path.join(mapping_dir, "piece_to_index.json"), p2i_str_key)
    _atomic_write_json(os.path.join(mapping_dir, "index_to_piece.json"), i2p_str_key)

def ensure_artwork(mapping: IdMapping, artwork_id: int) -> Tuple[IdMapping, int, bool]:
    """Ensure artwork_id(int) exists in mapping."""
    if artwork_id in mapping.piece2idx:
        return mapping, mapping.piece2idx[artwork_id], False
    
    # index 0 is PAD
    current_max_idx = max(mapping.idx2piece.keys()) if mapping.idx2piece else 0
    new_idx = current_max_idx + 1
    
    mapping.piece2idx[artwork_id] = new_idx
    mapping.idx2piece[new_idx] = artwork_id
    return mapping, new_idx, True