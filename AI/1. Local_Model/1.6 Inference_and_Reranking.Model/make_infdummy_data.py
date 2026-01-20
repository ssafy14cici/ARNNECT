# make_validation_dummy_logs.py
from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple, Optional


@dataclass
class Cfg:
    BASE_DIR: Path = Path(".")
    ARTWORK_DATA: Path = Path("artwork_data.jsonl")  # input
    OUT_LOG: Path = Path("validation_dummy_user_timestamp.jsonl")  # output

    SEED: int = 42

    # 유저별 로그 길이
    COLD_LEN: Tuple[int, int] = (3, 5)
    NORMAL_LEN: Tuple[int, int] = (12, 20)
    HEAVY_LEN: Tuple[int, int] = (45, 70)

    # taste 그룹을 artist 기반으로 만들 때, 최소 작품수
    MIN_ARTWORKS_PER_TASTE: int = 80  # 데이터 적으면 30으로 낮춰도 됨

    # 생성할 taste 그룹 수
    N_TASTES: int = 3


cfg = Cfg()


def load_jsonl(path: Path) -> List[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def get_artwork_id(r: dict) -> Optional[str]:
    return r.get("idx") or r.get("artwork_id") or r.get("item_id")


def get_artist_id(r: dict) -> str:
    return str(r.get("artist_id") or r.get("artist") or r.get("artist_idx") or "Unknown")


def pick_taste_artists(rows: List[dict]) -> List[str]:
    """
    작품이 많은 artist_id 상위에서 taste를 고름.
    """
    cnt: Dict[str, int] = {}
    for r in rows:
        aid = get_artist_id(r)
        wid = get_artwork_id(r)
        if not wid:
            continue
        cnt[aid] = cnt.get(aid, 0) + 1

    # 충분히 많은 artist만 후보
    candidates = [a for a, c in cnt.items() if c >= cfg.MIN_ARTWORKS_PER_TASTE]
    candidates.sort(key=lambda a: cnt[a], reverse=True)

    if len(candidates) >= cfg.N_TASTES:
        return candidates[: cfg.N_TASTES]

    # fallback: 그냥 상위 N개
    all_sorted = sorted(cnt.items(), key=lambda x: x[1], reverse=True)
    return [a for a, _ in all_sorted[: cfg.N_TASTES]]


def sample_sequence(pool: List[str], length_range: Tuple[int, int]) -> List[str]:
    L = random.randint(length_range[0], length_range[1])
    if len(pool) >= L:
        return random.sample(pool, k=L)
    return [random.choice(pool) for _ in range(L)]


def main():
    random.seed(cfg.SEED)

    base = cfg.BASE_DIR
    data_path = base / cfg.ARTWORK_DATA
    out_path = base / cfg.OUT_LOG

    if not data_path.exists():
        raise FileNotFoundError(f"artwork_data.jsonl not found: {data_path}")

    rows = load_jsonl(data_path)
    print(f"[INFO] loaded artwork_data rows: {len(rows)}")

    # artist -> artworks
    artist_to_artworks: Dict[str, List[str]] = {}
    for r in rows:
        wid = get_artwork_id(r)
        if not wid:
            continue
        aid = get_artist_id(r)
        artist_to_artworks.setdefault(aid, []).append(wid)

    taste_artists = pick_taste_artists(rows)
    print(f"[INFO] selected taste artists: {taste_artists}")

    # 유저 9명: taste 3개 * (cold/norm/heavy)
    users = []
    for aid in taste_artists:
        users.append((f"DUMMY_COLD_{aid}", aid, cfg.COLD_LEN))
        users.append((f"DUMMY_NORM_{aid}", aid, cfg.NORMAL_LEN))
        users.append((f"DUMMY_HEAVY_{aid}", aid, cfg.HEAVY_LEN))

    now = time.time()
    logs = []
    for uid, aid, length_range in users:
        pool = artist_to_artworks.get(aid, [])
        if not pool:
            continue

        seq = sample_sequence(pool, length_range)
        ts = now + random.uniform(0, 10)

        for wid in seq:
            logs.append({"user_id": uid, "item_id": wid, "timestamp": ts})
            ts += random.uniform(10.0, 90.0)  # 10~90초 간격

    # 저장
    with out_path.open("w", encoding="utf-8") as f:
        for r in logs:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"[OK] wrote dummy logs -> {out_path} | users={len(users)} | logs={len(logs)}")
    print("TIP: 이제 infer_validate_best_model.py에서 이 로그로 오프라인 검증 가능.")


if __name__ == "__main__":
    main()
