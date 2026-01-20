import json
import numpy as np
from collections import defaultdict

# 1. 데이터 로드
with open("artwork_vector.json", "r", encoding="utf-8") as f:
    artwork_data = json.load(f)

# 2. 작가별 데이터 그룹화
artist_groups = defaultdict(list)
for item in artwork_data:
    # 각 작품 벡터를 numpy 배열로 변환하여 저장
    artist_groups[item["artist_id"]].append(np.array(item["artwork_vector"]))

# 3. 가중 평균 로직 적용 및 벡터 추출
final_artist_only = []

for artist_id, vectors in artist_groups.items():
    # A. 임시 중심점 계산 (단순 평균 및 정규화)
    temp_centroid = np.mean(vectors, axis=0)
    temp_centroid /= np.linalg.norm(temp_centroid)
    
    # B. 가중치 기반 합산
    weighted_sum_vec = np.zeros_like(temp_centroid)
    for v in vectors:
        # 내적(Cosine Similarity) 계산
        sim = np.dot(v, temp_centroid)
        # 0.5 이하면 가중치 0.2, 아니면 1.0
        weight = 1.0 if sim > 0.5 else 0.2
        weighted_sum_vec += v * weight
    
    # C. 최종 정규화
    final_vec = weighted_sum_vec / np.linalg.norm(weighted_sum_vec)
    
    # D. 요청하신 두 가지 정보만 저장
    final_artist_only.append({
        "artist_id": artist_id,
        "artist_vector": final_vec.tolist()
    })

# 4. 깔끔한 JSON 형태로 저장
with open("artist_vector.json", "w", encoding="utf-8") as f:
    json.dump(final_artist_only, f, indent=4, ensure_ascii=False)

print(f"✅ 추출 완료: artist_vector.json ({len(final_artist_only)}명의 작가)")