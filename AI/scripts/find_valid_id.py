import sys
import json
from pathlib import Path

# 프로젝트 루트 설정
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent

def find_id():
    mapping_path = project_root / "artifacts" / "mappings" / "piece_index.json"
    
    if not mapping_path.exists():
        print(f"❌ 매핑 파일이 없습니다: {mapping_path}")
        return

    try:
        with open(mapping_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        print(f"📊 총 매핑된 아이템 수: {len(data)} 개")
        
        # 0번(PAD) 제외하고 실제 아이템 3개만 출력
        valid_ids = [k for k in list(data.keys())[:5] if k != "__PAD__"]
        
        if valid_ids:
            print("\n✅ [테스트에 사용할 수 있는 유효한 ID]")
            print(f"👉 {valid_ids[0]}")  # 이걸 복사해서 쓰세요!
            print(f"   (그 외: {valid_ids[1:]})")
        else:
            print("❌ 유효한 ID가 하나도 없습니다. 마이그레이션이 잘못되었습니다.")
            
    except Exception as e:
        print(f"❌ 읽기 에러: {e}")

if __name__ == "__main__":
    find_id()