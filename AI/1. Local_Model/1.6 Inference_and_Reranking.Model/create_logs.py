import json
import random
from datetime import datetime, timedelta

# 1. 대상 아이템 ID 설정 (test_00001 ~ test_01000)
# 주의: 이 ID들이 반드시 artwork_vector.json에 있어야 합니다.
artwork_ids = [f"test_{str(i).zfill(5)}" for i in range(1, 1001)]

# 2. 유저 설정 (Light, Medium, Heavy)
users_config = [
    # Light Users
    {'id': 'user_light_1', 'count': 1, 'min_dupes': 0},
    {'id': 'user_light_2', 'count': 2, 'min_dupes': 1},
    {'id': 'user_light_3', 'count': 4, 'min_dupes': 2},
    # Medium Users
    {'id': 'user_medium_1', 'count': 5, 'min_dupes': 2},
    {'id': 'user_medium_2', 'count': 12, 'min_dupes': 2},
    {'id': 'user_medium_3', 'count': 15, 'min_dupes': 3},
    # Heavy Users
    {'id': 'user_heavy_1', 'count': 40, 'min_dupes': 5},
    {'id': 'user_heavy_2', 'count': 100, 'min_dupes': 10},
    {'id': 'user_heavy_3', 'count': 200, 'min_dupes': 20},
]

generated_logs = []
base_time = datetime(2026, 1, 1, 9, 0, 0)

print(f"[System] 로그 생성 시작 (Target Items: test_00001 ~ test_01000)")

for user in users_config:
    u_id = user['id']
    count = user['count']
    min_dupes = user['min_dupes']
    
    # 아이템 선택 로직 (중복 포함)
    if count == 1:
        selected_items = [random.choice(artwork_ids)]
    else:
        # 중복을 위한 여유 공간 확보
        max_unique = count - min_dupes
        if max_unique < 1: max_unique = 1
        
        # 유니크 아이템 개수 랜덤 결정
        unique_count = random.randint(max(1, int(max_unique * 0.7)), max_unique)
        unique_pool = random.sample(artwork_ids, unique_count)
        
        sequence = unique_pool[:]
        
        # 나머지 칸은 중복 아이템으로 채움
        remaining_slots = count - len(sequence)
        if remaining_slots > 0:
            duplicates = random.choices(unique_pool, k=remaining_slots)
            sequence.extend(duplicates)
        
        # 순서 섞기
        random.shuffle(sequence)
        selected_items = sequence

    # 타임스탬프 생성
    current_time = base_time + timedelta(days=random.randint(0, 30))
    user_logs = []
    
    for item_id in selected_items:
        # 방문 간격 랜덤화
        gap_type = random.random()
        if gap_type < 0.7:
            gap = timedelta(seconds=random.randint(30, 300)) # 짧은 간격
        elif gap_type < 0.9:
            gap = timedelta(minutes=random.randint(10, 120)) # 중간 간격
        else:
            gap = timedelta(hours=random.randint(12, 72))    # 긴 간격 (다음 세션)
            
        current_time += gap
        
        user_logs.append({
            "user_id": u_id,
            "artwork_id": item_id,
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M")
        })
    
    generated_logs.extend(user_logs)

# 파일 저장
output_filename = "generated_9_users_logs.json"
with open(output_filename, 'w', encoding='utf-8') as f:
    json.dump(generated_logs, f, indent=2)

print(f"✅ 생성 완료! 파일명: {output_filename}")
print(f"   - 총 로그 수: {len(generated_logs)}")
print(f"   - 유저 수: {len(users_config)}")