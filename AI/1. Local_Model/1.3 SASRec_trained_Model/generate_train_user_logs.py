# generate_train_user_logs_json.py
import json
import random
from pathlib import Path
from datetime import datetime, timedelta

ARTWORK_JSON = "artwork.json"     # artwork_id 3만개 들어있는 파일
OUT_JSON = "train_user_logs.json"        # ✅ JSON(list)로 저장

N_USERS = 30000
COLD_P, NORMAL_P, HEAVY_P = 0.05, 0.50, 0.45

# 길이 1 유저는 SASRec에서 istarget.sum==0 -> NaN 위험이 있어서 cold도 최소 2로 권장
COLD_RANGE = (2, 5)
NORMAL_RANGE = (6, 20)
HEAVY_RANGE = (21, 200)

SEED = 42
START_TIME = datetime(2026, 1, 1, 0, 0)
END_TIME   = datetime(2026, 1, 21, 23, 59)

def rand_ts_str():
    total_minutes = int((END_TIME - START_TIME).total_seconds() // 60)
    m = random.randint(0, total_minutes)
    return (START_TIME + timedelta(minutes=m)).strftime("%Y-%m-%d %H:%M")

def load_artwork_ids(path: str):
    obj = json.loads(Path(path).read_text(encoding="utf-8"))
    ids = []
    for r in obj:
        aid = r.get("artwork_id") or r.get("item_id")
        if aid:
            ids.append(str(aid))
    if not ids:
        raise ValueError("artwork_id를 찾지 못했습니다. JSON 구조/키를 확인하세요.")
    return ids

def main():
    random.seed(SEED)
    artwork_ids = load_artwork_ids(ARTWORK_JSON)

    n_cold = int(N_USERS * COLD_P)
    n_normal = int(N_USERS * NORMAL_P)
    n_heavy = N_USERS - n_cold - n_normal

    users = [f"U_{i:05d}" for i in range(N_USERS)]
    random.shuffle(users)
    cold_users = users[:n_cold]
    normal_users = users[n_cold:n_cold + n_normal]
    heavy_users = users[n_cold + n_normal:]

    rows = []

    def add_user(uid, L, sample_mode="choices"):
        if sample_mode == "sample":
            seq = random.sample(artwork_ids, k=min(L, len(artwork_ids)))
        else:
            seq = random.choices(artwork_ids, k=L)
        times = sorted(rand_ts_str() for _ in range(len(seq)))
        for t, aid in zip(times, seq):
            rows.append({"user_id": uid, "item_id": aid, "timestamp": t})

    for uid in cold_users:
        L = random.randint(*COLD_RANGE)
        add_user(uid, L, sample_mode="sample")

    for uid in normal_users:
        L = random.randint(*NORMAL_RANGE)
        add_user(uid, L, sample_mode="choices")

    for uid in heavy_users:
        L = random.randint(*HEAVY_RANGE)
        add_user(uid, L, sample_mode="choices")

    # 깔끔하게 정렬(선택)
    rows.sort(key=lambda r: (r["user_id"], r["timestamp"]))

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    print("DONE:", OUT_JSON, "| users:", N_USERS, "| interactions:", len(rows))
    print("distribution:", {"cold": n_cold, "normal": n_normal, "heavy": n_heavy})

if __name__ == "__main__":
    main()
