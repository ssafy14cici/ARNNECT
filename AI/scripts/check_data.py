import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트 경로 설정
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent
sys.path.append(str(project_root))

from app.config import ServiceConfig
from app.chroma_store import ChromaStore
from app.mapping_store import MappingStore
from app.item_vector_table import ItemVectorTable

def check():
    cfg = ServiceConfig()
    print(f"📂 데이터 확인 경로: {cfg.artifacts_dir}\n")

    # 1. 매핑 데이터 확인 (JSON)
    print("1️⃣ [MappingStore] 확인")
    mapping = MappingStore(cfg.piece_to_index_path, cfg.index_to_piece_path)
    total_map = len(mapping.piece_to_index)
    print(f"   - 총 매핑된 아이템 수: {total_map} 개")
    
    # 샘플 3개 출력
    print("   - 샘플 데이터:")
    for k, v in list(mapping.piece_to_index.items())[:3]:
        print(f"     {k} -> {v}")

    # 2. ChromaDB 확인
    print("\n2️⃣ [ChromaDB] 확인")
    chroma = ChromaStore(cfg.chroma_dir, collection="artworkMetaData")
    # 저장된 데이터 개수 확인
    count = chroma.col.count() 
    print(f"   - ChromaDB 저장된 문서 수: {count} 개")
    
    # 샘플 검색 (첫 번째 아이템 ID로 검색)
# [수정 전]
    # first_id = list(mapping.piece_to_index.keys())[0]  <-- 이게 __PAD__ 였습니다.

    # [수정 후] 0번(__PAD__) 말고 1번(실제 데이터)을 가져오도록 수정
    all_keys = list(mapping.piece_to_index.keys())
    if all_keys[0] == "__PAD__":
        first_id = all_keys[1]  # 두 번째 키(실제 데이터) 선택
    else:
        first_id = all_keys[0]
    print(f"   - ID '{first_id}'로 데이터 조회 중...")
    try:
        res = chroma.col.get(ids=[first_id], include=["metadatas", "embeddings"])
        if res["ids"]:
            meta = res["metadatas"][0]
            emb_len = len(res["embeddings"][0])
            print(f"     ✅ 조회 성공!")
            print(f"     메타데이터: {meta}")
            print(f"     벡터 차원: {emb_len} 차원")
        else:
            print("     ❌ 조회 실패 (ID가 DB에 없음)")
    except Exception as e:
        print(f"     ⚠️ 에러: {e}")

    # 3. ItemVectorTable 확인
    print("\n3️⃣ [ItemVectorTable] 확인")
    item_table_path = cfg.artifacts_dir / "item_vectors.bin"
    item_table = ItemVectorTable(item_table_path, cfg.num_items, cfg.d_model)
    
    # 첫 번째 인덱스(1번) 벡터 확인 (0번은 padding이라 0임)
    vec = item_table.get(1)
    norm = np.linalg.norm(vec)
    print(f"   - Index 1번 벡터 확인")
    print(f"     벡터 값 일부: {vec[:5]} ...")
    print(f"     벡터 크기(Norm): {norm:.4f} (0이 아니면 데이터가 있는 것)")

if __name__ == "__main__":
    check()