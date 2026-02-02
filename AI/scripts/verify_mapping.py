import sys
import json
from pathlib import Path

# 프로젝트 루트 설정
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent
sys.path.append(str(project_root))

from app.config import settings

def verify():
    print("="*40)
    print("🕵️‍♂️ [매핑 파일 검증] piece_index.json 확인")
    print("="*40)

    # 1. 파일 위치 확인
    mapping_path = settings.piece_to_index_path
    print(f"📂 파일 경로: {mapping_path}")

    if not mapping_path.exists():
        print("❌ [치명적 오류] 파일이 없습니다!")
        print("   👉 'python scripts/migrate_vectors.py'를 다시 실행하세요.")
        return

    # 2. 내용 읽기
    try:
        with open(mapping_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        count = len(data)
        print(f"📊 저장된 ID 개수: {count} 개")

        if count <= 1: # PAD 포함해서 1개면 사실상 빈 것
            print("🚨 [문제 발견] 매핑 파일이 사실상 비어있습니다!")
            print("   👉 원본 JSON 데이터 경로가 맞는지, 마이그레이션이 제대로 돌았는지 확인하세요.")
            return

        # 3. 유효한 ID 출력 (복사용)
        print("\n✅ [테스트에 사용 가능한 진짜 ID 목록]")
        valid_ids = [k for k in list(data.keys()) if k != "__PAD__"][:5] # 5개만 출력
        
        for i, vid in enumerate(valid_ids):
            print(f"   {i+1}. {vid}")

        print("\n💡 위 ID 중 하나를 복사해서 test_recommendation.py 의 LIKED_ARTWORK_ID 에 넣으세요.")

    except Exception as e:
        print(f"❌ 파일 읽기 실패: {e}")

if __name__ == "__main__":
    verify()