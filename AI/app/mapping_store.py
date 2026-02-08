# app/mapping_store.py
from __future__ import annotations
import json
from pathlib import Path
from threading import Lock
from typing import Dict, Tuple, Optional, Union

class MappingStore:
    """
    artworkId(int)와 모델 인덱스(int) 간의 매핑을 유지합니다.
    - JSON 파일에는 Key가 String으로 저장되지만, 메모리 상에서는 Int로 관리합니다.
    - 인덱스 0은 PAD로 예약되어 있습니다.
    """
    def __init__(self, piece_to_index_path: Path, index_to_piece_path: Path):
        self.piece_to_index_path = Path(piece_to_index_path)
        self.index_to_piece_path = Path(index_to_piece_path)
        self._lock = Lock()

        # 메모리 상에서는 모든 ID를 int로 관리
        self.piece_to_index: Dict[int, int] = {}
        self.index_to_piece: Dict[int, int] = {}

        self._load()

    def _load(self) -> None:
        self.piece_to_index_path.parent.mkdir(parents=True, exist_ok=True)
        self.index_to_piece_path.parent.mkdir(parents=True, exist_ok=True)

        if self.piece_to_index_path.exists():
            raw = json.loads(self.piece_to_index_path.read_text(encoding="utf-8"))
            self.piece_to_index = {}
            for k, v in raw.items():
                # [수정] <PAD> 또는 __PAD__ 문자열이 오면 0으로 처리
                if k in ["<PAD>", "__PAD__"]:
                    self.piece_to_index[0] = 0
                else:
                    self.piece_to_index[int(k)] = int(v)
        else:
            self.piece_to_index = {}

        if self.index_to_piece_path.exists():
            raw = json.loads(self.index_to_piece_path.read_text(encoding="utf-8"))
            self.index_to_piece = {}
            for k, v in raw.items():
                idx = int(k)
                # [수정] Value가 <PAD> 문자열인 경우 처리
                if str(v) in ["<PAD>", "__PAD__"]:
                    self.index_to_piece[idx] = 0
                else:
                    self.index_to_piece[idx] = int(v)
        else:
            self.index_to_piece = {}

        # Ensure PAD (ID 0 예약)
        if 0 not in self.index_to_piece:
            self.index_to_piece[0] = 0 # artworkId 0
        if 0 not in self.piece_to_index:
            self.piece_to_index[0] = 0

    def _save(self) -> None:
        # write atomically
        tmp1 = self.piece_to_index_path.with_suffix(".json.tmp")
        tmp2 = self.index_to_piece_path.with_suffix(".json.tmp")

        # JSON 저장을 위해 Key를 String으로 변환
        p2i_out = {}
        for k, v in self.piece_to_index.items():
            # 저장할 때는 표준화된 이름("<PAD>")을 쓸 수도 있지만, 
            # int 변환 편의를 위해 그냥 "0": 0 으로 저장해도 무방합니다.
            # 여기서는 호환성을 위해 0번은 "<PAD>"로 저장합니다.
            if k == 0 and v == 0: p2i_out["<PAD>"] = 0
            else: p2i_out[str(k)] = v
            
        i2p_out = {}
        for k, v in self.index_to_piece.items():
            if k == 0 and v == 0: i2p_out[str(k)] = "<PAD>"
            else: i2p_out[str(k)] = v

        tmp1.write_text(json.dumps(p2i_out, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp2.write_text(json.dumps(i2p_out, ensure_ascii=False, indent=2), encoding="utf-8")

        tmp1.replace(self.piece_to_index_path)
        tmp2.replace(self.index_to_piece_path)

    def get(self, artwork_id: int) -> Optional[int]:
        return self.piece_to_index.get(artwork_id)

    def get_or_add(self, artwork_id: int) -> Tuple[int, bool]:
        """
        Returns (index, is_new).
        """
        with self._lock:
            idx = self.piece_to_index.get(artwork_id)
            if idx is not None:
                return idx, False

            new_idx = max(self.index_to_piece.keys(), default=0) + 1
            
            self.piece_to_index[artwork_id] = new_idx
            self.index_to_piece[new_idx] = artwork_id
            self._save()
            return new_idx, True

    def ensure_consistent_size(self, num_items: int) -> None:
        if len(self.index_to_piece) > num_items:
            raise ValueError(
                f"Mapping has {len(self.index_to_piece)} indices but num_items={num_items}. "
                "Either increase NUM_ITEMS or prune mapping."
            )