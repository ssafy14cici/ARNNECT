from __future__ import annotations
import json
from pathlib import Path
from typing import Optional

import numpy as np

class ItemVectorTable:
    """
    Disk-backed (memmap) table: [num_items, dim] float32
    Index 0 is reserved for PAD (kept as zeros).
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
