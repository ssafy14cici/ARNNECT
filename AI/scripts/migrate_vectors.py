import sys
import json
import numpy as np
from pathlib import Path
from tqdm import tqdm

# -----------------------------------------------------------
# [1] 경로 설정 (가장 중요!)
# 스크립트 위치가 어디든 상관없이 무조건 프로젝트 루트를 찾습니다.
# -----------------------------------------------------------
current_script_path = Path(__file__).resolve()
project_root = current_script_path.parent.parent  # .../reco_service_runpod
sys.path.append(str(project_root))

from app.config import settings
from app.chroma_store import ChromaStore
from app.mapping_store import MappingStore
from app.item_vector_table import ItemVectorTable

def migrate():
    print("="*40)
    print("🚀 [데이터 마이그레이션] 경로 강제 지정 모드")
    print(f"📂 프로젝트 루트: {project_root}")
    print("="*40)

    # -------------------------------------------------------
    # [2] 저장 위치 강제 지정 (scripts 폴더 탈출!)
    # settings 값을 믿지 않고, 직접 경로를 조립합니다.
    # -------------------------------------------------------
    artifacts_dir = project_root / "artifacts"
    mappings_dir = artifacts_dir / "mappings"
    chroma_dir = artifacts_dir / "chroma_db"
    
    # 폴더가 없으면 만듭니다.
    mappings_dir.mkdir(parents=True, exist_ok=True)
    chroma_dir.mkdir(parents=True, exist_ok=True)

    # 파일 경로들
    path_piece_index = mappings_dir / "piece_index.json"
    path_idx_to_piece = mappings_dir / "idx_to_piece.json"
    path_item_vectors = artifacts_dir / "item_vectors.bin"
    path_source_json = project_root / "data" / "artwork_vector_norm.json"

    # -------------------------------------------------------
    # [3] 소스 데이터 로드
    # -------------------------------------------------------
    if not path_source_json.exists():
        print(f"❌ 소스 파일을 찾을 수 없습니다: {path_source_json}")
        return

    print(f"📂 JSON 읽는 중: {path_source_json}")
    with open(path_source_json, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"📊 데이터 개수: {len(data)} 개")

    # -------------------------------------------------------
    # [4] 저장소 초기화 (강제 지정된 경로 사용)
    # -------------------------------------------------------
    print("\n🛠️ 저장소 연결 중...")
    print(f"   -> 매핑 파일: {mappings_dir}")
    print(f"   -> ChromaDB: {chroma_dir}")
    print(f"   -> 벡터 테이블: {path_item_vectors}")

    # (1) 매핑 스토어
    mapping = MappingStore(path_piece_index, path_idx_to_piece)
    
    # (2) ChromaDB
    # [주의] Chroma는 폴더 경로를 문자열로 주거나 Path로 줍니다.
    chroma = ChromaStore(str(chroma_dir), collection="artworkMetaData")
    
    # (3) 벡터 테이블
    item_table = ItemVectorTable(
        path_item_vectors,
        settings.num_items, # 68702
        settings.d_model
    )
    
    success_count = 0
    print("\n🚀 데이터 주입 시작...")
    
    for item in tqdm(data):
        try:
            art_id = str(item["artworkId"])
            artist_id = str(item.get("artistId", "UNKNOWN"))
            category = str(item.get("category") or item.get("clip_primary_label", "ETC"))
            
            # 벡터 처리
            vec = np.array(item["vector"], dtype=np.float32)
            if vec.shape[0] != 512:
                if vec.shape[0] > 512: vec = vec[:512]
                else: vec = np.pad(vec, (0, 512 - vec.shape[0]))

            # 1. 매핑 등록
            idx, _ = mapping.get_or_add(art_id)
            
            # 2. 벡터 테이블 저장
            item_table.upsert(idx, vec)
            
            # 3. ChromaDB 저장
            meta = {
                "artistId": artist_id,
                "category": category,
                "idx": idx
            }
            chroma.upsert(
                artwork_id=art_id,
                embedding=vec,
                metadata=meta
            )
            success_count += 1
            
        except Exception as e:
            print(f"⚠️ 에러 ({item.get('artworkId')}): {e}")

    # -------------------------------------------------------
    # [5] 파일 강제 저장 (확인사살)
    # -------------------------------------------------------
    print("\n💾 매핑 파일 디스크 저장 중...")
    
    with open(path_piece_index, "w", encoding="utf-8") as f:
        json.dump(mapping.piece_to_index, f, ensure_ascii=False, indent=2)
    
    with open(path_idx_to_piece, "w", encoding="utf-8") as f:
        json.dump(mapping.index_to_piece, f, ensure_ascii=False, indent=2)
        
    print(f"✅ 저장 완료: {path_piece_index}")
    print(f"✅ 저장 완료: {path_idx_to_piece}")

    print("\n" + "="*40)
    print(f"🎉 모든 마이그레이션 완료! ({success_count}건)")
    print("이제 artifacts 폴더를 확인해보세요.")
    print("="*40)

if __name__ == "__main__":
    migrate()