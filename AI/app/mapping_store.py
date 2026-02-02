from __future__ import annotations
import json
from pathlib import Path
from threading import Lock
from typing import Dict, Tuple, Optional

class MappingStore:
    """
    Maintains a stable mapping between artworkId (string) and model index (int).
    - index 0 is reserved for PAD.
    - new artworkIds get appended with a new index.
    """
    def __init__(self, piece_to_index_path: Path, index_to_piece_path: Path):
        self.piece_to_index_path = Path(piece_to_index_path)
        self.index_to_piece_path = Path(index_to_piece_path)
        self._lock = Lock()

        self.piece_to_index: Dict[str, int] = {}
        self.index_to_piece: Dict[int, str] = {}

        self._load()

    def _load(self) -> None:
        self.piece_to_index_path.parent.mkdir(parents=True, exist_ok=True)
        self.index_to_piece_path.parent.mkdir(parents=True, exist_ok=True)

        if self.piece_to_index_path.exists():
            self.piece_to_index = json.loads(self.piece_to_index_path.read_text(encoding="utf-8"))
            self.piece_to_index = {k: int(v) for k, v in self.piece_to_index.items()}
        else:
            self.piece_to_index = {}

        if self.index_to_piece_path.exists():
            raw = json.loads(self.index_to_piece_path.read_text(encoding="utf-8"))
            self.index_to_piece = {int(k): str(v) for k, v in raw.items()}
        else:
            self.index_to_piece = {}

        # Ensure PAD
        if 0 not in self.index_to_piece:
            self.index_to_piece[0] = "__PAD__"
        if "__PAD__" not in self.piece_to_index:
            self.piece_to_index["__PAD__"] = 0

    def _save(self) -> None:
        # write atomically
        tmp1 = self.piece_to_index_path.with_suffix(".json.tmp")
        tmp2 = self.index_to_piece_path.with_suffix(".json.tmp")

        tmp1.write_text(json.dumps(self.piece_to_index, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp2.write_text(
            json.dumps({str(k): v for k, v in self.index_to_piece.items()}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        tmp1.replace(self.piece_to_index_path)
        tmp2.replace(self.index_to_piece_path)

    def get(self, artwork_id: str) -> Optional[int]:
        return self.piece_to_index.get(artwork_id)

    def get_or_add(self, artwork_id: str) -> Tuple[int, bool]:
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
