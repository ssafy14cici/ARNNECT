# 이 코드는 chromaDB에 들어오는 데이터를 저장하고 쿼리하는 래퍼 클래스입니다.

from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import chromadb
except Exception as e:  # pragma: no cover
    chromadb = None
    _import_error = e


@dataclass
class ChromaQueryResult:
    ids: List[str]
    distances: List[float]
    metadatas: List[Dict[str, Any]]


class ChromaStore:
    """
    Thin wrapper around ChromaDB PersistentClient.

    - Stores vectors keyed by artworkId (string)
    - Keeps metadata like {"index": <int>, ...}
    """
    def __init__(self, persist_dir: Path, collection: str):
        if chromadb is None:
            raise ImportError(
                "chromadb is not installed or failed to import. "
                "Install with: pip install chromadb"
            ) from _import_error
        self.persist_dir = Path(persist_dir)
        self.collection_name = collection

        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        self.col = self.client.get_or_create_collection(name=self.collection_name)

    def upsert(self, artwork_id: str, embedding: np.ndarray, metadata: Optional[Dict[str, Any]] = None) -> None:
        emb = embedding.astype(np.float32).reshape(1, -1).tolist()
        meta = metadata or {}
        self.col.upsert(ids=[artwork_id], embeddings=emb, metadatas=[meta])

    def query(self, embedding: np.ndarray, topk: int = 20, where: Optional[Dict[str, Any]] = None) -> ChromaQueryResult:
        emb = embedding.astype(np.float32).reshape(1, -1).tolist()
        out = self.col.query(query_embeddings=emb, n_results=int(topk), where=where)
        # Chroma returns list-of-lists
        ids = (out.get("ids") or [[]])[0]
        dists = (out.get("distances") or [[]])[0]
        metas = (out.get("metadatas") or [[]])[0]
        return ChromaQueryResult(ids=list(ids), distances=list(dists), metadatas=list(metas))

    def count(self) -> int:
        return self.col.count()
