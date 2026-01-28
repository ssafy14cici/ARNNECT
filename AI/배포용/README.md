# 1. 실행 명령어
bentoml serve . --port 8000

# 2. 포스트맨 명령어
- 이미지 임베딩
URL : http://localhost:8000/embed_artwork
Method : POST
예제
{
  "image_path": "C:/Users/SSAFY/Desktop/my_project/data/artwork_image/test01.jpg", << 실제 파일 경로로 지정
  "description": "A painting of a sunset" << 없으면 없는 상태로 주거나 혹은 "" 이런 식으로
}

- 추천
URL : http://localhost:8000/recommend
Method : POST
Body : raw => 각 유저마다 타임스탬프 넣기 "test_user_logs.json 참고"

예제
  {
    "user_log" : {
        "member_id": "u_00001",
        "timestamp": [
        {
            "artwork_id": "category061_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category061_0001",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category092_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category092_0001",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category086_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0050",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category106_0006",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category106_0006",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category065_0004",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category065_0004",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category039_0025",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category092_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0038",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0038",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category086_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category039_0028",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category039_0028",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category020_0043",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0043",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category020_0043",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category043_0064",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0011",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0012",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category039_0025",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category039_0025",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category039_0025",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category039_0025",
            "timestamp": "REVIEW"
        },
        {
            "artwork_id": "category053_0017",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0010",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category065_0003",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category004_0002",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category004_0002",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category028_0006",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category094_0010",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category053_0017",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category053_0017",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category086_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category013_0035",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0065",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0065",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category086_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category086_0007",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category056_0065",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0053",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0053",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category086_0009",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category039_0026",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category106_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0010",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0010",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category028_0006",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category028_0006",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category106_0006",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category004_0002",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category004_0002",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category086_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category086_0008",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category039_0025",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0010",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0010",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category020_0043",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0013",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0013",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category060_0013",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category020_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0007",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category020_0043",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0043",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category043_0063",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category030_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category004_0002",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0011",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0011",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category041_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0042",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category041_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0013",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0011",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category017_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category017_0001",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category086_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category015_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category015_0007",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category061_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category061_0001",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category061_0001",
            "timestamp": "REVIEW"
        },
        {
            "artwork_id": "category020_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0064",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0064",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category077_0009",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category077_0009",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category020_0018",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category065_0003",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category092_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category086_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category086_0001",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category077_0009",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0064",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0032",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0032",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category056_0053",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0053",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category020_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0008",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category060_0013",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category056_0038",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category039_0028",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category039_0028",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category017_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0015",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0064",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0064",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category043_0064",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category086_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category086_0008",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category041_0019",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category107_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category107_0008",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category106_0006",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category020_0007",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category041_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category041_0001",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category030_0008",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category086_0001",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category086_0001",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category065_0003",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category065_0003",
            "timestamp": "LIKE"
        },
        {
            "artwork_id": "category060_0010",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category060_0010",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category060_0011",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category106_0006",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category015_0007",
            "timestamp": "VIEW"
        },
        {
            "artwork_id": "category015_0007",
            "timestamp": "STAY"
        },
        {
            "artwork_id": "category015_0007",
            "timestamp": "LIKE"
        }
      ]
    }
  }