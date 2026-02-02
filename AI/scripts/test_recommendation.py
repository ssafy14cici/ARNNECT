import requests
import json

# 1. 서버 주소 (로컬)
SERVER_URL = "http://localhost:3000/recommend"

# =================================================================
# [수정 필요] 아까 verify_mapping.py에서 찾은 "진짜 존재하는 ID"를 넣으세요!
# 예: "category030_0019" (반드시 piece_index.json에 있는 거여야 함)
# =================================================================
LIKED_ARTWORK_ID = "category030_0019" 


def test_reco():
    print(f"🚀 [추천 요청] 가짜 유저가 '{LIKED_ARTWORK_ID}'를 좋아한다고 서버에 알립니다...")

    # 2. 보낼 데이터 (JSON Payload)
    # "나는 tester_01이고, 이 작품을 LIKE 했어. 추천 5개 해줘."
    payload = {
        "inputData": {"memberId": "u_demo_008", "logs": [{"artworkId": "category106_0001", "action": "STAY"}, {"artworkId": "category078_0004", "action": "VIEW"}, {"artworkId": "category090_0001", "action": "STAY"}, {"artworkId": "category106_0015", "action": "LIKE"}, {"artworkId": "category106_0020", "action": "REVIEW"}, {"artworkId": "category106_0018", "action": "STAY"}, {"artworkId": "category078_0001", "action": "REVIEW"}, {"artworkId": "category106_0011", "action": "LIKE"}, {"artworkId": "category078_0001", "action": "VIEW"}, {"artworkId": "category078_0003", "action": "LIKE"}, {"artworkId": "category078_0001", "action": "LIKE"}, {"artworkId": "category090_0002", "action": "COMMENT"}, {"artworkId": "category041_0015", "action": "COMMENT"}, {"artworkId": "category090_0001", "action": "REVIEW"}, {"artworkId": "category106_0013", "action": "VIEW"}, {"artworkId": "category056_0017", "action": "VIEW"}, {"artworkId": "category003_0008", "action": "COMMENT"}, {"artworkId": "category011_0005", "action": "VIEW"}, {"artworkId": "category106_0012", "action": "COMMENT"}, {"artworkId": "category090_0002", "action": "COMMENT"}, {"artworkId": "category106_0012", "action": "REVIEW"}, {"artworkId": "category013_0021", "action": "COMMENT"}, {"artworkId": "category078_0003", "action": "REVIEW"}, {"artworkId": "category106_0025", "action": "STAY"}, {"artworkId": "category090_0003", "action": "VIEW"}, {"artworkId": "category090_0003", "action": "STAY"}, {"artworkId": "category106_0017", "action": "STAY"}, {"artworkId": "category090_0001", "action": "LIKE"}, {"artworkId": "category090_0002", "action": "LIKE"}, {"artworkId": "category090_0002", "action": "VIEW"}, {"artworkId": "category041_0015", "action": "LIKE"}, {"artworkId": "category106_0017", "action": "LIKE"}, {"artworkId": "category106_0026", "action": "STAY"}, {"artworkId": "category049_0001", "action": "LIKE"}, {"artworkId": "category106_0012", "action": "COMMENT"}, {"artworkId": "category078_0002", "action": "VIEW"}, {"artworkId": "category090_0003", "action": "REVIEW"}, {"artworkId": "category078_0001", "action": "COMMENT"}, {"artworkId": "category078_0003", "action": "COMMENT"}, {"artworkId": "category090_0002", "action": "LIKE"}, {"artworkId": "category106_0023", "action": "VIEW"}, {"artworkId": "category065_0006", "action": "LIKE"}, {"artworkId": "category090_0003", "action": "VIEW"}, {"artworkId": "category090_0001", "action": "REVIEW"}, {"artworkId": "category106_0011", "action": "COMMENT"}, {"artworkId": "category106_0016", "action": "COMMENT"}, {"artworkId": "category051_0012", "action": "VIEW"}, {"artworkId": "category051_0012", "action": "VIEW"}, {"artworkId": "category078_0003", "action": "LIKE"}, {"artworkId": "category078_0004", "action": "COMMENT"}, {"artworkId": "category090_0002", "action": "VIEW"}, {"artworkId": "category090_0003", "action": "COMMENT"}, {"artworkId": "category090_0001", "action": "STAY"}, {"artworkId": "category106_0020", "action": "STAY"}, {"artworkId": "category013_0021", "action": "VIEW"}]}
    }

    try:
        # 3. API 호출 (POST 요청)
        res = requests.post(SERVER_URL, json=payload)
        
        # 4. 결과 확인
        if res.status_code == 200:
            data = res.json()
            print("\n✅ [성공] 서버가 추천 리스트를 보냈습니다!")
            print(f"   - 요청 유저: {data['memberId']}")
            
            print("\n📋 [AI 추천 결과 TOP 5]")
            recommends = data.get('recommends', [])
            
            if not recommends:
                print("   ⚠️ 추천 결과가 비어있습니다 (DB 데이터 부족 가능성)")
            
            for item in recommends:
                print(f"   🥇 {item['rank']}위: {item['artworkId']} (점수: {item.get('score', 0):.4f})")
                
            print("\n--> 이 결과가 매번 다르게 나오거나, ID가 잘 출력되면 성공입니다.")
            
        else:
            print(f"❌ [실패] 서버 에러 (Status: {res.status_code})")
            print(f"   메시지: {res.text}")
            
    except Exception as e:
        print(f"❌ [연결 실패] 서버가 꺼져있나요?: {e}")

if __name__ == "__main__":
    test_reco()