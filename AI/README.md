# reco_service_runpod (BentoML)

이 프로젝트는 **BentoML**로 다음 2개 기능을 서빙합니다.

1. **이미지 → CLIP 임베딩 → ChromaDB 저장 + (artworkId→index) 매핑 자동 추가**
2. **유저 로그(JSON) → (SASRec+TwoTower 있으면 사용) → ChromaDB 후보 검색 → 추천 리스트 반환**

> ⚠️ 체크포인트(.pth)를 실제로 로드해서 추론하려면, **학습 때 사용한 모델 하이퍼파라미터와 반드시 동일**해야 합니다.  
> (NUM_ITEMS, FF_DIM, MAX_LEN, D_MODEL, N_HEADS, N_LAYERS, NUM_ACTIONS 등)

---

## 폴더 구조(중요)

```
reco_service_runpod/
  README.md # 사용 설명서
  .env.example # 가상 환경 설정
  Dockerfile
  service.py
  bentofile.yaml
  requirements.txt
  app/
    config.py
    schemas.py
    clip_embedder.py
    chroma_store.py
    mapping_store.py
    item_vector_table.py
    recommender.py
    models/
      sasrec_twotower.py
      loader.py
    utils/
      mapping.py
  artifacts/
    checkpoints/
      BEST_BestRecommend_model.pth          # (선택) TwoTower 체크포인트
      Best_SASRec_model.pth        # (선택) SASRec 체크포인트
    mappings/
      piece_index.json         # 자동 생성/업데이트
      idx_to_piece.json        # 자동 생성/업데이트
    chroma_db/                 # 자동 생성 (Chroma Persistent)
    item_vectors.bin
    item_vectors.meta.json           
  scripts/ # 잡 폴더
    
```

- **매핑 파일(piece_index.json, idx_to_piece.json)**: `POST /ingest` 호출 시 자동으로 생성/추가됩니다.
- **item_vectors.dat**: `POST /ingest` 호출 시 artworkId에 해당하는 index row에 CLIP 벡터가 저장됩니다.
  - 즉, **CLIP 임베딩 + 매핑 + 벡터 테이블이 항상 함께 갱신**됩니다.

---

## 1) 로컬 실행(Windows / Linux 공통)

### (1) 가상환경
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

### (2) 설치
```bash
pip install -r requirements.txt
```

### (3) 실행
프로젝트 루트(`reco_service_runpod/`)에서:

```bash
bentoml serve service:RecoService --reload --port 3000
```

---

## 2) Postman 테스트

### (A) Health
- Method: `POST`
- URL: `http://localhost:3000/health`
- Body(JSON):
```json
{}
```

### (B) 이미지 ingest (Base64)
- Method: `POST`
- URL: `http://localhost:3000/ingest`
- Body(JSON):
```json
{
  "artworkId": "category000_0000",
  "imageBase64": "<이미지파일을 base64로 인코딩한 문자열>",
  "metadata": {
    "category": "category000"
  }
}
```

Base64 만들기(예시, PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\path\to\image.jpg"))
```

### (C) 추천 요청
- Method: `POST`
- URL: `http://localhost:3000/recommend`
- Body(JSON):
```json
{
  "memberId": "A",
  "topk": 20,
  "logs": [
    {"artworkId": "category000_0000", "action": "VIEW"},
    {"artworkId": "category010_0012", "action": "LIKE"}
  ]
}
```

---

## 3) Runpod 실행(요약)

### 권장: Docker로 올리기
1) Runpod에서 GPU 템플릿(예: CUDA) 선택  
2) Repo 업로드 후 아래처럼 실행:

```bash
pip install -r requirements.txt
bentoml serve service:RecoService --port 3000
```

포트는 Runpod의 Expose Port에 맞춰 열어주세요.

---

## 환경변수(필요 시)

기본값으로도 실행되지만, 체크포인트/하이퍼파라미터가 다르면 아래를 맞춰야 합니다.

- `NUM_ITEMS` (기본 30001)
- `FF_DIM` (기본 2048)
- `MAX_LEN` (기본 200)
- `D_MODEL` (기본 512)
- `N_HEADS` (기본 8)
- `N_LAYERS` (기본 2)
- `NUM_ACTIONS` (기본 8)
- `SASREC_CKPT` (기본 artifacts/checkpoints/sasrec_best.pth)
- `TWOTOWER_CKPT` (기본 artifacts/checkpoints/twotower_best.pth)
- `CHROMA_DIR` (기본 artifacts/chroma_db)
- `DEVICE` (기본 cuda 가능하면 cuda)

예:
```bash
set NUM_ITEMS=30001
set FF_DIM=2048
set SASREC_CKPT=artifacts/checkpoints/BEST_SASRec_model.pth
```

---

## 흔한 에러 체크

- `cannot import name ...` : 파일이 누락됐거나, 패키지 구조가 깨진 경우 (zip 압축 해제 위치 확인)
- `NameError: nn is not defined` : `torch.nn as nn` import 누락 (이번 버전은 해결)
- 체크포인트 로드 에러: **모델 하이퍼파라미터 불일치** 가능성이 가장 큼
