# export_top5_seen_normal_heavy.py
import json
import shutil
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

# ===== 설정 =====
ARTWORK_IMAGE_DIR = Path("artwork_image")      # 이미지 폴더
USER_LOG_PATH     = Path("test_user_logs.json")# 또는 .jsonl
OUT_DIR           = Path("export_vis_top5")    # 출력 폴더

# 분류 기준 (원래 네 정책 기준)
NORMAL_MIN, NORMAL_MAX = 6, 20
HEAVY_MIN, HEAVY_MAX   = 21, 200

TOPK = 5


# ===== 유틸 =====
def load_json_or_jsonl(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"파일이 없습니다: {path.resolve()}")
    text = path.read_text(encoding="utf-8").lstrip()
    if text.startswith("[") or text.startswith("{"):
        return json.loads(text)

    out = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def parse_ts(ts):
    if ts is None:
        return 0
    ts = str(ts).strip()
    fmts = ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y/%m/%d %H:%M:%S"]
    for fmt in fmts:
        try:
            return int(datetime.strptime(ts, fmt).timestamp())
        except ValueError:
            pass
    try:
        return int(datetime.fromisoformat(ts).timestamp())
    except Exception:
        return 0


def find_image_file(artwork_id: str, image_dir: Path):
    exts = [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
    for ext in exts:
        p = image_dir / f"{artwork_id}{ext}"
        if p.exists():
            return p

    # fallback: stem 매칭
    target = artwork_id.lower()
    for p in image_dir.iterdir():
        if p.is_file() and p.stem.lower() == target:
            return p
    return None


def safe_copy(src: Path, dst: Path) -> bool:
    try:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        return True
    except Exception:
        return False


def user_segment(n_events: int):
    if NORMAL_MIN <= n_events <= NORMAL_MAX:
        return "normal"
    if HEAVY_MIN <= n_events <= HEAVY_MAX:
        return "heavy"
    return None


# ===== 핵심 로직 =====
def topk_most_seen_per_user(events):
    """
    events: list[(ts_int, artwork_id)]
    반환: top5 artwork_id 리스트
    - 1) 많이 본 횟수 desc
    - 2) 동률이면 마지막 본 timestamp desc
    """
    cnt = Counter([aid for _, aid in events])
    last_ts = {}
    for t, aid in events:
        last_ts[aid] = max(last_ts.get(aid, 0), t)

    ranked = sorted(
        cnt.items(),
        key=lambda kv: (kv[1], last_ts.get(kv[0], 0)),
        reverse=True
    )
    return [aid for aid, _ in ranked[:TOPK]]


def main():
    logs = load_json_or_jsonl(USER_LOG_PATH)

    # user -> list[(ts, artwork_id)]
    by_user = defaultdict(list)
    for r in logs:
        if not isinstance(r, dict):
            continue
        uid = r.get("user_id")
        aid = r.get("artwork_id") or r.get("item_id")
        if uid is None or aid is None:
            continue
        t = parse_ts(r.get("timestamp"))
        by_user[str(uid)].append((t, str(aid)))

    if not ARTWORK_IMAGE_DIR.exists():
        raise FileNotFoundError(f"이미지 폴더가 없습니다: {ARTWORK_IMAGE_DIR.resolve()}")

    copied = 0
    missing = 0
    seg_counts = {"normal": 0, "heavy": 0}

    for uid, ev in by_user.items():
        ev.sort(key=lambda x: x[0])
        n = len(ev)
        seg = user_segment(n)
        if seg is None:
            continue

        seg_counts[seg] += 1
        top5 = topk_most_seen_per_user(ev)

        # 유저별로 top5만 복사
        for aid in top5:
            src = find_image_file(aid, ARTWORK_IMAGE_DIR)
            if src is None:
                missing += 1
                continue
            dst = OUT_DIR / seg / uid / "seen_top5" / src.name
            if safe_copy(src, dst):
                copied += 1
            else:
                missing += 1

    print(f"[DONE] normal users={seg_counts['normal']}, heavy users={seg_counts['heavy']}")
    print(f"[COPIED] {copied} | [MISSING] {missing}")
    print(f"[OUT] {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
