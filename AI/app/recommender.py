# app/recommender.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set
import random
import numpy as np
import torch
import torch.nn.functional as F

from .mapping_store import MappingStore
from .chroma_store import ChromaStore
from .item_vector_table import ItemVectorTable
from .models.loader import load_models


ACTION2ID = {
    "PAD": 0,
    "VIEW": 1,
    "STAY": 2,
    "LIKE": 3,
    "COMMENT": 4,
    "REVIEW_WRITE": 5,
    "SELECT": 6,
    "OTHER": 7,
}
NUM_ACTIONS = 8


@dataclass
class RecommendResult:
    member_id: int
    recommends: List[Dict[str, Any]]


class Recommender:
    def __init__(
        self,
        *,
        device: str,
        num_items: int,
        max_len: int,
        d_model: int,
        n_heads: int,
        n_layers: int,
        ff_dim: int,
        dropout: float,
        num_actions: int,
        mapping: MappingStore,
        chroma: ChromaStore,                 # artworkMetaData
        artist_chroma: Optional[ChromaStore], # artistMetaData (없으면 None 가능)
        item_table: ItemVectorTable,
        sasrec_ckpt_path,
        twotower_ckpt_path,
    ):
        self.device = torch.device(device)
        self.max_len = int(max_len)
        self.mapping = mapping
        self.chroma = chroma
        self.artist_chroma = artist_chroma
        self.item_table = item_table

        self.models = load_models(
            sasrec_ckpt=sasrec_ckpt_path,
            twotower_ckpt=twotower_ckpt_path,
            device=str(self.device),
            num_items=num_items,
            max_len=max_len,
            d_model=d_model,
            n_heads=n_heads,
            n_layers=n_layers,
            ff_dim=ff_dim,
            dropout=dropout,
            num_actions=num_actions,
            item_vec_dim=item_table.dim,
        )

        # --- knobs ---
        self.RERANK_TOPN = 500
        self.NEW_ARTIST_RERANK_WINDOW = 50
        self.NEW_ARTIST_BONUS = 0.02

        # (노출 10개 기준 정책)
        self.EXPLORE_MIN = 2
        self.EXPLORE_MAX = 4

        # category profile
        self.SHORT_K = 20
        self.LONG_K = 200
        self.SHORT_TOPC = 2
        self.LONG_TOPC = 3

        # debug toggle
        self.DEBUG = True

        # --- GPU cache ---
        print("⚡ [Recommender] Caching Item Vectors to GPU...")
        item_vec_np = self.item_table.as_numpy().astype(np.float32, copy=False)
        self.all_item_vecs = torch.from_numpy(item_vec_np).to(self.device, non_blocking=True)

        self.cached_item_proj = None
        self._precompute_item_embeddings()

        # --- artist "is_new" cache ---
        self.new_artist_set: Set[int] = set()
        self._load_new_artist_cache()

    def _precompute_item_embeddings(self):
        if self.models.sasrec is None or self.models.twotower is None:
            print("⚠️ Models not loaded, skipping precompute.")
            return

        with torch.no_grad():
            base_items = self.models.sasrec.item_base(self.all_item_vecs)
            proj_items = self.models.twotower.item_proj(base_items)
            self.cached_item_proj = F.normalize(proj_items, p=2, dim=-1)

        print(f"✅ [Recommender] Item Embeddings Precomputed! Shape: {self.cached_item_proj.shape}")

    @staticmethod
    def _parse_bool(x: Any) -> bool:
        """Chroma metadata가 bool/str/int 섞여 들어올 수 있어 엄격 파싱."""
        if isinstance(x, bool):
            return x
        if isinstance(x, (int, float)):
            return bool(int(x))
        if isinstance(x, str):
            s = x.strip().lower()
            if s in ("true", "1", "yes", "y", "t"):
                return True
            if s in ("false", "0", "no", "n", "f", ""):
                return False
        return False

    def _load_new_artist_cache(self) -> None:
        """
        artistMetaData 컬렉션에서 is_new=True인 artistId 목록을 메모리에 로드
        """
        if self.artist_chroma is None:
            print("[INFO] artist_chroma is None -> new_artist_set disabled")
            return

        try:
            meta_map = self.artist_chroma.get_collection_metadatas(batch_size=5000, hard_limit=500000)
            s: Set[int] = set()

            print("[DEBUG_ARTIST] artist_chroma collection=", self.artist_chroma.collection_name)
            print("[DEBUG_ARTIST] count=", self.artist_chroma.count())

            # metadatas 일부만 확인
            mm = self.artist_chroma.get_collection_metadatas(batch_size=10, hard_limit=10)
            print("[DEBUG_ARTIST] sample keys=", list(mm.keys())[:3])
            for k in list(mm.keys())[:3]:
                print("[DEBUG_ARTIST] id=", k, "md=", mm[k])
                
            for _id, md in meta_map.items():
                if not isinstance(md, dict):
                    continue

                # ✅ is_new 엄격 파싱
                if not self._parse_bool(md.get("is_new", False)):
                    continue

                # ✅ artistId가 없으면 id를 쓰되, 숫자 변환이 되는 것만
                aid = md.get("artistId", _id)
                try:
                    s.add(int(aid))
                except Exception:
                    continue

            self.new_artist_set = s
            print(f"✅ [Recommender] new_artist_set size={len(self.new_artist_set)}")

        except Exception as e:
            print(f"[WARN] could not load artistMetaData: {type(e).__name__} {str(e)[:160]}")

    # -------------------------------------------------
    # Recommend
    # -------------------------------------------------
    def recommend(self, member_id: int, logs: List[Dict[str, Any]], topk: int = 20) -> RecommendResult:
        if self.cached_item_proj is None:
            return RecommendResult(member_id=member_id, recommends=[])

        topk = int(topk)

        # -------------------------------------------------
        # ✅ logs handling (현재 payload 형태 확정):
        # - head는 고정, tail에 최신 클릭이 append됨
        # - 따라서 "뒤에서 max_len개"를 쓰고, reverse는 하지 않는다.
        # - 모델은 pad를 앞에 넣고, sas_out[:, -1, :]을 쓰므로
        #   리스트 마지막이 최신이면 그대로 맞다.
        # -------------------------------------------------
        raw_logs = (logs or [])
        valid_logs = raw_logs[-self.max_len:]

        if self.DEBUG:
            if raw_logs:
                print("[DEBUG_RAW] raw_first_aid=", raw_logs[0].get("artworkId"),
                      "raw_last_aid=", raw_logs[-1].get("artworkId"),
                      "raw_len=", len(raw_logs))
                head = [e.get("artworkId") for e in raw_logs[:5]]
                tail = [e.get("artworkId") for e in raw_logs[-5:]]
                print("[DEBUG_RAW_LIST] head5=", head, "tail5=", tail)
            if valid_logs:
                print("[DEBUG_USED] used_first_aid=", valid_logs[0].get("artworkId"),
                      "used_last_aid=", valid_logs[-1].get("artworkId"),
                      "used_len=", len(valid_logs))

            # mapping miss 체크
            total = len(valid_logs)
            kept = 0
            miss = 0
            for ev in valid_logs:
                aid = ev.get("artworkId")
                if aid is None:
                    continue
                try:
                    idx = self.mapping.get(int(aid))
                except Exception:
                    idx = None
                if idx is None:
                    miss += 1
                else:
                    kept += 1
            print(f"[DEBUG] logs total={total} kept={kept} miss_mapping={miss}")

        # build seq
        seq_idx: List[int] = []
        seq_act: List[int] = []

        for ev in valid_logs:
            aid = ev.get("artworkId")
            if aid is None:
                continue
            try:
                idx = self.mapping.get(int(aid))
            except Exception:
                idx = None
            if idx is None:
                continue

            raw_act = str(ev.get("action", "VIEW")).upper()
            if raw_act == "REVIEW":
                raw_act = "REVIEW_WRITE"
            act_idx = int(ACTION2ID.get(raw_act, ACTION2ID["VIEW"]))

            seq_idx.append(int(idx))
            seq_act.append(act_idx)

        if not seq_idx:
            return RecommendResult(member_id=member_id, recommends=[])

        # pad (앞이 과거, 뒤가 최신이어야 sas_out[:, -1, :]가 최신 상태)
        seq_len = len(seq_idx)
        pad_len = max(0, self.max_len - seq_len)
        input_items = [0] * pad_len + seq_idx
        input_acts = [0] * pad_len + seq_act

        input_items_t = torch.tensor([input_items], dtype=torch.long, device=self.device)
        input_acts_t = torch.tensor([input_acts], dtype=torch.long, device=self.device)

        # seen sets
        seen_idx_set = set(seq_idx)  # internal idx
        seen_artwork_set: Set[int] = set()
        for i in seq_idx:
            rid = self.mapping.index_to_piece.get(int(i))
            if rid is not None:
                try:
                    seen_artwork_set.add(int(rid))
                except Exception:
                    pass

        # --- category profile (short/long) ---
        def _top_categories_from_artwork_ids(artwork_ids: List[int], topc: int) -> List[int]:
            if not artwork_ids:
                return []
            try:
                meta = self.chroma.get_many(artwork_ids)
            except Exception:
                return []
            cnt: Dict[int, int] = {}
            for _id, md in meta.items():
                c = md.get("category") if isinstance(md, dict) else None
                if c is None:
                    continue
                try:
                    c = int(c)
                except Exception:
                    continue
                cnt[c] = cnt.get(c, 0) + 1
            return [k for k, _ in sorted(cnt.items(), key=lambda x: x[1], reverse=True)[:topc]]

        # use real artwork ids for category profile
        log_real_ids: List[int] = []
        for i in seq_idx:
            rid = self.mapping.index_to_piece.get(int(i))
            if rid is not None:
                try:
                    log_real_ids.append(int(rid))
                except Exception:
                    pass

        short_ids = log_real_ids[-self.SHORT_K:]
        long_ids = log_real_ids[-self.LONG_K:]
        preferred_cats = set(_top_categories_from_artwork_ids(short_ids, self.SHORT_TOPC)) | set(
            _top_categories_from_artwork_ids(long_ids, self.LONG_TOPC)
        )

        # --- model scoring ---
        with torch.no_grad():
            sas_out = self.models.sasrec(input_items_t, input_acts_t, self.all_item_vecs)  # (1,S,H)
            last_emb = sas_out[:, -1, :]
            user_vec = self.models.twotower.user_proj(last_emb)
            user_vec = F.normalize(user_vec, p=2, dim=-1)

            scores = torch.matmul(user_vec, self.cached_item_proj.T).squeeze(0)  # (N,)

            topn = max(self.RERANK_TOPN, topk * 10)
            topn = min(int(topn), int(scores.shape[0]))
            vals, inds = torch.topk(scores, k=topn)

            cand_idx = inds.detach().cpu().numpy().tolist()
            cand_score = vals.detach().cpu().numpy().tolist()

        # idx -> artworkId (real) list for metadata fetch
        cand_real: List[int] = []
        for i in cand_idx:
            if int(i) == 0:
                continue
            rid = self.mapping.index_to_piece.get(int(i))
            if rid is None:
                continue
            try:
                cand_real.append(int(rid))
            except Exception:
                continue

        # fetch metadata (artworkMetaData)
        try:
            meta_map = self.chroma.get_many(cand_real)
        except Exception:
            meta_map = {}

        # build records
        records: List[Dict[str, Any]] = []
        for rank0, (i, s) in enumerate(zip(cand_idx, cand_score)):
            i = int(i)
            if i == 0 or i in seen_idx_set:
                continue

            rid = self.mapping.index_to_piece.get(i)
            if rid is None:
                continue
            try:
                rid_i = int(rid)
            except Exception:
                continue

            md = meta_map.get(str(rid_i), {})
            if not isinstance(md, dict):
                md = {}

            artist_id = md.get("artistId")
            category = md.get("category")

            try:
                artist_id = int(artist_id) if artist_id is not None else None
            except Exception:
                artist_id = None

            try:
                category = int(category) if category is not None else None
            except Exception:
                category = None

            bonus = 0.0
            if rank0 < self.NEW_ARTIST_RERANK_WINDOW and (artist_id is not None) and (artist_id in self.new_artist_set):
                bonus = float(self.NEW_ARTIST_BONUS)

            records.append({
                "idx": i,
                "artworkId": rid_i,
                "score": float(s),
                "score2": float(s) + bonus,
                "artistId": artist_id,
                "category": category,
            })

        # rerank (중복 제거)
        records.sort(key=lambda r: r["score2"], reverse=True)

        # -------------------------------------------------
        # ✅ New policy: (노출 10 기준)
        # - 신진 2 + 취향무관 3 + 나머지
        # - topk가 10이 아닐 때도 자연스럽게 동작
        # -------------------------------------------------
        new_target = min(2, topk)
        explore_target = min(3, max(0, topk - new_target))

        picked: List[Dict[str, Any]] = []
        picked_artwork_ids: Set[int] = set()
        picked_artist_ids: Set[int] = set()

        def _add_pick(r: Dict[str, Any]) -> bool:
            aid = int(r["artworkId"])
            if aid in picked_artwork_ids:
                return False
            picked.append(r)
            picked_artwork_ids.add(aid)
            if r.get("artistId") is not None:
                picked_artist_ids.add(int(r["artistId"]))
            return True

        # 1) ✅ 신진 2개 (가능하면 서로 다른 artist)
        if self.new_artist_set and new_target > 0:
            new_pool = [
                r for r in records
                if (r.get("artistId") is not None and int(r["artistId"]) in self.new_artist_set)
                and (r["artworkId"] not in seen_artwork_set)
                and (r["artworkId"] not in picked_artwork_ids)
            ]

            # 서로 다른 artist 우선 (점수순 records 기준)
            for r in new_pool:
                if len([x for x in picked if x.get("artistId") is not None and int(x["artistId"]) in self.new_artist_set]) >= new_target:
                    break
                a = r.get("artistId")
                if a is None:
                    continue
                if int(a) in picked_artist_ids:
                    continue
                _add_pick(r)

            # 부족하면 같은 artist라도 채움
            if len([x for x in picked if x.get("artistId") is not None and int(x["artistId"]) in self.new_artist_set]) < new_target:
                for r in new_pool:
                    if len([x for x in picked if x.get("artistId") is not None and int(x["artistId"]) in self.new_artist_set]) >= new_target:
                        break
                    _add_pick(r)

        # 2) ✅ 취향 무관 3개 (category not in preferred_cats)
        if explore_target > 0:
            if len(preferred_cats) > 0:
                explore_pool = [
                    r for r in records
                    if (r.get("category") is not None)
                    and (int(r["category"]) not in preferred_cats)
                    and (r["artworkId"] not in seen_artwork_set)
                    and (r["artworkId"] not in picked_artwork_ids)
                ]
            else:
                explore_pool = [
                    r for r in records
                    if (r["artworkId"] not in seen_artwork_set)
                    and (r["artworkId"] not in picked_artwork_ids)
                ]

            if explore_pool:
                start = int(len(explore_pool) * 0.60)
                tail = explore_pool[start:] if start < len(explore_pool) else explore_pool
                explore_picks = random.sample(tail, k=min(explore_target, len(tail)))
            else:
                explore_picks = []

            for r in explore_picks:
                _add_pick(r)

            # 부족하면 뒤쪽/미노출 위주로 채움
            while len(picked) < (new_target + explore_target):
                filled = False
                for r in records[::-1]:
                    if r["artworkId"] in seen_artwork_set:
                        continue
                    if _add_pick(r):
                        filled = True
                        break
                if not filled:
                    break

        # 3) ✅ 나머지 = 점수 기반 상위로 채우기
        for r in records:
            if len(picked) >= topk:
                break
            _add_pick(r)

        recommends = [{"rank": i + 1, "artworkId": rec["artworkId"]} for i, rec in enumerate(picked[:topk])]
        return RecommendResult(member_id=member_id, recommends=recommends)
