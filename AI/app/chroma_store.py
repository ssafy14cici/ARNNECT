# app/chroma_store.py
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

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
    - IDs in Chroma are always strings.
    - Metadata is stored as dict.
    """
    def __init__(self, persist_dir: Path, collection: str):
        if chromadb is None:
            raise ImportError(
                "chromadb is not installed or failed to import. "
                "Install with: pip install chromadb"
            ) from _import_error

        self.persist_dir = Path(persist_dir)
        self.collection_name = str(collection)

        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        self.col = self.client.get_or_create_collection(name=self.collection_name)

    # ---------------------------------
    # Basic ops
    # ---------------------------------
    def upsert(
        self,
        artwork_id: Union[str, int],
        embedding: np.ndarray,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        emb = np.asarray(embedding, dtype=np.float32).reshape(1, -1).tolist()
        meta = metadata or {}
        safe_id = str(artwork_id)  # Chroma id must be str
        self.col.upsert(ids=[safe_id], embeddings=emb, metadatas=[meta])

    def upsert_many(
        self,
        ids: List[Union[str, int]],
        embeddings: List[Union[np.ndarray, List[float]]],
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        if not ids:
            return
        safe_ids = [str(x) for x in ids]

        embs: List[List[float]] = []
        for e in embeddings:
            if isinstance(e, np.ndarray):
                embs.append(np.asarray(e, dtype=np.float32).reshape(-1).tolist())
            else:
                embs.append(list(map(float, e)))

        metas = metadatas or [{} for _ in safe_ids]
        self.col.upsert(ids=safe_ids, embeddings=embs, metadatas=metas)

    def query(
        self,
        embedding: np.ndarray,
        topk: int = 20,
        where: Optional[Dict[str, Any]] = None
    ) -> ChromaQueryResult:
        emb = np.asarray(embedding, dtype=np.float32).reshape(1, -1).tolist()
        out = self.col.query(query_embeddings=emb, n_results=int(topk), where=where)

        ids = (out.get("ids") or [[]])[0]
        dists = (out.get("distances") or [[]])[0]
        metas = (out.get("metadatas") or [[]])[0]
        return ChromaQueryResult(ids=list(ids), distances=list(dists), metadatas=list(metas))

    def count(self) -> int:
        return int(self.col.count())

    def delete_many(self, ids: List[Union[str, int]]) -> None:
        if not ids:
            return
        self.col.delete(ids=[str(x) for x in ids])

    # ---------------------------------
    # Helpers for metadata fetch
    # ---------------------------------
    def get_many(self, ids: List[Union[str, int]]) -> Dict[str, Dict[str, Any]]:
        """Return {id(str): metadata_dict}. Missing ids are skipped."""
        if not ids:
            return {}
        safe_ids = [str(x) for x in ids]
        out = self.col.get(ids=safe_ids, include=["metadatas"])
        out_ids = out.get("ids") or []
        out_metas = out.get("metadatas") or []
        return {str(i): (m or {}) for i, m in zip(out_ids, out_metas)}

    def list_all_ids(self, limit: int = 100000) -> List[str]:
        """
        Best-effort list of ids.
        chroma versions vary; some accept limit without ids.
        """
        try:
            out = self.col.get(limit=int(limit))
            return list(out.get("ids") or [])
        except Exception:
            # fallback: try get without params (may be heavy; keep conservative)
            out = self.col.get()
            return list(out.get("ids") or [])


    def get_collection_metadatas(
        self,
        *,
        batch_size: int = 5000,
        hard_limit: int = 500000,
    ) -> Dict[str, Dict[str, Any]]:
        """
        컬렉션 전체 metadata를 {id(str): metadata(dict)}로 가져옵니다.

        - Chroma 버전에 따라 offset 지원이 다르므로:
          1) offset 방식 시도 -> 실패 시
          2) 전체 id list -> chunk get 방식으로 fallback

        주의: 데이터가 많으면 hard_limit/batch_size를 조절하세요.
        """
        out_map: Dict[str, Dict[str, Any]] = {}

        # 1) offset 기반 시도
        try:
            offset = 0
            while True:
                got = self.col.get(
                    include=["metadatas"],
                    limit=int(batch_size),
                    offset=int(offset),
                )
                ids = got.get("ids") or []
                metas = got.get("metadatas") or []
                if not ids:
                    break

                for i, m in zip(ids, metas):
                    out_map[str(i)] = (m or {})

                offset += len(ids)
                if offset >= int(hard_limit):
                    break

            return out_map

        except TypeError:
            # offset 미지원 -> fallback
            pass
        except Exception:
            # 기타 에러 -> fallback
            pass

        # 2) fallback: 전체 id -> chunk get
        all_ids = self.list_all_ids(limit=int(hard_limit))
        if not all_ids:
            return {}

        for s in range(0, len(all_ids), int(batch_size)):
            chunk = all_ids[s: s + int(batch_size)]
            got = self.col.get(ids=[str(x) for x in chunk], include=["metadatas"])
            ids = got.get("ids") or []
            metas = got.get("metadatas") or []
            for i, m in zip(ids, metas):
                out_map[str(i)] = (m or {})

        return out_map
