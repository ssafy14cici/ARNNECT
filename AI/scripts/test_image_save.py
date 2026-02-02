import sys
import requests
import json
from pathlib import Path

# 1. 프로젝트 루트 경로를 확실하게 잡습니다.
current_dir = Path(__file__).resolve().parent   # .../reco_service_runpod/scripts
project_root = current_dir.parent               # .../reco_service_runpod
sys.path.append(str(project_root))

from app.config import ServiceConfig
from app.chroma_store import ChromaStore

# ---------------------------------------------------------
# [중요] DB 경로를 프로젝트 루트 기준 절대 경로로 강제 지정
# ---------------------------------------------------------
# 이렇게 하면 scripts 폴더에서 실행하든 어디서 실행하든 항상 같은 진짜 DB를 봅니다.
REAL_CHROMA_DIR = project_root / "artifacts" / "chroma_db"

# 테스트 설정
TEST_IMAGE_PATH = "C:/Users/SSAFY/Downloads/11111111.jpg" 
TEST_ARTWORK_ID = "test_realtime_final_04"
SERVER_URL = "http://localhost:3000/embed_artwork"

def test_save_flow():
    print(f"📂 데이터 검증 경로(절대 경로): {REAL_CHROMA_DIR}")
    
    print(f"\n🚀 [Step 1] API로 이미지 등록 요청 중... (ID: {TEST_ARTWORK_ID})")
    
    # inputData로 감싸서 전송
    payload = {
        "inputData": {
            "artworkId": TEST_ARTWORK_ID,
            "artistId": "test_artist",
            "imagePath": TEST_IMAGE_PATH,
            "category": "Test Category"
        }
    }
    
    try:
        response = requests.post(SERVER_URL, json=payload)
        if response.status_code == 200:
            print("   ✅ API 요청 성공! (200 OK)")
            print(f"   응답: {response.json().get('artworkId')} 등록됨.")
        else:
            print(f"   ❌ API 요청 실패: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ 서버 연결 실패: {e}")
        return

    # 2. ChromaDB 즉시 조회
    print(f"\n🔍 [Step 2] ChromaDB 직접 까서 확인 중...")
    
    # [수정] config 값 대신 위에서 만든 절대 경로(REAL_CHROMA_DIR)를 사용
    chroma = ChromaStore(REAL_CHROMA_DIR, collection="artworkMetaData")
    
    # 방금 넣은 ID로 조회
    result = chroma.col.get(ids=[TEST_ARTWORK_ID], include=["embeddings", "metadatas"])
    
    if result["ids"]:
        print("   🎉 [확인 성공] ChromaDB에 데이터가 있습니다!")
        print(f"   - 저장된 ID: {result['ids'][0]}")
        print(f"   - 메타데이터: {result['metadatas'][0]}")
        
        vec = result["embeddings"][0]
        print(f"   - 벡터 차원: {len(vec)} (512차원이면 정상)")
        print("\n   결론: 서버가 저장한 곳과 동일한 폴더를 확인하니 데이터가 보입니다!")
    else:
        print("   ❌ [확인 실패] 경로를 맞췄는데도 데이터가 없습니다. (서버 로그 확인 필요)")

if __name__ == "__main__":
    test_save_flow()