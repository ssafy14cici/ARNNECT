import pandas as pd
import random
import json
from datetime import datetime, timedelta

# [1] 작품 ID 리스트 (제공된 artwork.json 기반)
artworks = [
    "train_test_00000", "train_test_00001", "train_test_00002", "train_test_00003", 
    "train_test_00004", "train_test_00005", "train_test_00006", "train_test_00007", 
    "train_test_00008", "train_test_00009"
]

# [2] 유저 설정 (콜드스타트 5명, 중간 3명, 헤비 2명)
users = {
    "cold": [f"user_cold_{i}" for i in range(5)],    # 1~5회
    "mid": [f"user_mid_{i}" for i in range(3)],     # 5~30회
    "heavy": [f"user_heavy_{i}" for i in range(2)]   # 30회 이상
}

start_date = datetime(2026, 1, 11)
log_data = []

# --- 수정된 부분: 타임스탬프를 문자열 형식으로 생성하는 함수 ---
def generate_formatted_ts(base_date):
    """
    2026-01-11 ~ 2026-01-18 범위 내에서 
    'YYYY-MM-DD HH:MM' 형식의 문자열을 반환합니다.
    """
    delta_days = random.randint(0, 7)
    delta_seconds = random.randint(0, 86400)
    target_dt = base_date + timedelta(days=delta_days, seconds=delta_seconds)
    # 사용자가 요청한 '2026-01-01 01:00' 형태의 포맷 적용
    return target_dt.strftime("%Y-%m-%d %H:%M")

# [3] 로그 생성 로직
# 1. 콜드 스타트 유저 (1~5회)
for uid in users["cold"]:
    count = random.randint(1, 5)
    for _ in range(count):
        log_data.append([uid, random.choice(artworks), generate_formatted_ts(start_date)])

# 2. 미디엄 유저 (5~30회) - Finn Steele(사이버펑크) 선호 패턴
for uid in users["mid"]:
    count = random.randint(6, 25) # 5~30회 범위
    for _ in range(count):
        if random.random() < 0.7:
            target = random.choice(["train_test_00001", "train_test_00006", "train_test_00008"])
        else:
            target = random.choice(artworks)
        log_data.append([uid, target, generate_formatted_ts(start_date)])

# 3. 헤비 유저 (30회 이상) - 디지털/글리치 스타일 선호 패턴
for uid in users["heavy"]:
    count = random.randint(31, 50) # 30회 이상
    for _ in range(count):
        if random.random() < 0.8:
            target = random.choice(["train_test_00000", "train_test_00004", "train_test_00005", "train_test_00007", "train_test_00009"])
        else:
            target = random.choice(artworks)
        log_data.append([uid, target, generate_formatted_ts(start_date)])

# [4] 데이터 정렬 및 결과 생성
df_logs = pd.DataFrame(log_data, columns=['user_id', 'artwork_id', 'timestamp'])
# 시간 순 정렬을 위해 임시로 datetime 변환 후 정렬
df_logs['tmp_ts'] = pd.to_datetime(df_logs['timestamp'])
df_logs = df_logs.sort_values(by=['user_id', 'tmp_ts']).drop(columns=['tmp_ts']).reset_index(drop=True)

# --- 수정된 부분: 결과를 JSON 파일로 저장 ---
output_file = "user_logs.json"

# pandas의 to_json을 사용하여 레코드 형식의 깔끔한 JSON 생성
df_logs.to_json(output_file, orient='records', force_ascii=False, indent=4)

print(f"✅ 총 {len(df_logs)}개의 로그 생성 및 '{output_file}' 저장 완료.")

# 생성된 데이터 샘플 확인용 출력
print("\n[JSON 데이터 샘플 (첫 3개)]")
print(df_logs.head(3).to_json(orient='records', force_ascii=False, indent=4))