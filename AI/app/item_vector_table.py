# 이 코드는 아이템 벡터를 디스크에 저장하고 관리하는 기능을 제공합니다.

from __future__ import annotations
import json
from pathlib import Path
from typing import Optional

import numpy as np

class ItemVectorTable:
    """
    디스크 백드된 아이템 벡터 테이블입니다.
    인덱스 0는 PAD로 예약되어 있습니다.
    - 벡터는 float32로 저장됩니다.
    - 벡터는 메모리 맵핑을 통해 접근됩니다.
    """
    def __init__(self, path: Path, num_items: int, dim: int = 512):
        self.path = Path(path)
        self.meta_path = self.path.with_suffix(".meta.json")
        self.num_items = int(num_items)
        self.dim = int(dim)

        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure()

        self._mmap = np.memmap(self.path, dtype=np.float32, mode="r+", shape=(self.num_items, self.dim))

    def _ensure(self):
        if self.path.exists() and self.meta_path.exists():
            meta = json.loads(self.meta_path.read_text(encoding="utf-8"))
            if int(meta["num_items"]) != self.num_items or int(meta["dim"]) != self.dim:
                raise ValueError(
                    f"Existing item vector table meta mismatch: {meta} vs required "
                    f"num_items={self.num_items}, dim={self.dim}"
                )
            return

        # create new file
        arr = np.memmap(self.path, dtype=np.float32, mode="w+", shape=(self.num_items, self.dim))
        arr[:] = 0.0
        arr.flush()
        self.meta_path.write_text(json.dumps({"num_items": self.num_items, "dim": self.dim}, indent=2), encoding="utf-8")

    def upsert(self, idx: int, vec: np.ndarray) -> None:
        if idx < 0 or idx >= self.num_items:
            raise IndexError(f"idx {idx} out of range for num_items={self.num_items}")
        v = vec.astype(np.float32).reshape(-1)
        if v.shape[0] != self.dim:
            raise ValueError(f"vector dim {v.shape[0]} != {self.dim}")
        self._mmap[idx, :] = v
        self._mmap.flush()

    def get(self, idx: int) -> np.ndarray:
        return np.array(self._mmap[idx, :], copy=True)

    def as_numpy(self) -> np.ndarray:
        # zero-copy view (careful)
        return np.asarray(self._mmap)

    def close(self) -> None:
        try:
            self._mmap.flush()
        except Exception:
            pass

    def ensure_capacity(self, needed_num_items: int) -> None:
        needed_num_items = int(needed_num_items)
        if needed_num_items <= self.num_items:
            return

        # ✅ grow size (2배 확장 등)
        new_num_items = max(needed_num_items, self.num_items * 2)

        # 기존 mmap 닫기
        try:
            self._mmap.flush()
        except Exception:
            pass
        del self._mmap

        # 파일 크기 확장 + 새 영역 0으로
        arr = np.memmap(self.path, dtype=np.float32, mode="r+", shape=(self.num_items, self.dim))
        arr.flush()
        del arr

        new_arr = np.memmap(self.path, dtype=np.float32, mode="r+", shape=(new_num_items, self.dim))
        new_arr[self.num_items:new_num_items, :] = 0.0
        new_arr.flush()

        self.num_items = new_num_items
        self.meta_path.write_text(
            json.dumps({"num_items": self.num_items, "dim": self.dim}, indent=2),
            encoding="utf-8",
        )

        # 새 mmap 다시 열기
        self._mmap = np.memmap(self.path, dtype=np.float32, mode="r+", shape=(self.num_items, self.dim))
