# Reco Service - RunPod 포팅 메뉴얼

> **BentoML 기반 AI 추천 서비스를 RunPod GPU Pod에 Docker 컨테이너로 배포하는 완벽 가이드**

---

## 📋 목차

- [개요](#-개요)
- [사전 준비](#-사전-준비)
- [프로젝트 구조](#-프로젝트-구조)
- [로컬 환경 테스트](#-로컬-환경-테스트)
- [Docker 이미지 빌드 및 배포](#-docker-이미지-빌드-및-배포)
- [RunPod 배포](#-runpod-배포)
- [배포 후 검증](#-배포-후-검증)
- [Best Practices](#-best-practices)

---

## 🎯 개요

이 문서는 **AI 기반 추천 서비스(Reco Service)**를 RunPod GPU Pod 환경에 Docker 컨테이너로 배포하는 방법을 단계별로 설명합니다.

### 서비스 스펙

- **프레임워크**: BentoML
- **엔트리포인트**: `service:RecoService`
- **기본 포트**: `8000`
- **GPU 요구사항**: CUDA 지원 GPU 권장
- **핵심 구성요소**:
  - SASRec, Two-Tower 모델 체크포인트
  - 매핑 파일 (작품 ↔ 인덱스)
  - ChromaDB (벡터 검색)
  - 아이템 벡터 테이블

---

## 📦 사전 준비

### 로컬 개발 환경

- [x] **Docker** (최신 버전 권장)
- [x] **NVIDIA GPU** (로컬 테스트 시)
  - NVIDIA Driver 설치
  - `nvidia-container-toolkit` 설치 (`--gpus all` 플래그 지원)

### RunPod 환경

- [x] **RunPod 계정** 및 GPU Pod 생성 권한
- [x] **Docker Registry** (Docker Hub 또는 GitHub Container Registry 권장)
- [x] **RunPod Volume** (영속 스토리지, 운영 환경에서 필수)

---

## 📁 프로젝트 구조

```
AI/
├── Dockerfile                      # 컨테이너 이미지 빌드 설정
├── bentofile.yaml                  # BentoML 서비스 정의
├── requirements.txt                # Python 의존성
├── service.py                      # BentoML 서비스 엔트리포인트
├── app/                            # 추천 로직 모듈
│   ├── _pychace_/
│   ├── models/
│       ├── __init__.py
│       ├── loader.py               # 데이터를 로드
│       ├── sasrec_twotower.py      # TwoTower 모델
│       └── README.md
│   ├── utils/
│       ├── __init__.py
│       ├── chroma_store.py         # chromaDB 저장 로직
│       ├── clip_embedder.py        # 작품 임베딩 벡터
│       ├── config.py               # 환경 설정
│       ├── item_vector_table.py    # 아이템 벡터 저장 테이블
│       ├── mapping_store.py        # idx <=> artwork 맵핑
│       ├── recommender.py          # 추천 시스템
│       └── schemas.py              # chromaDB 데이터 형식
└── artifacts/                      # ⚠️ 런타임 필수 아티팩트
    ├── checkpoints/
    │   ├── BEST_SASRec_model.pth
    │   └── BEST_BestRecommend_model.pth
    ├── mappings/
    │   ├── piece_index.json
    │   └── idx_to_piece.json
    ├── chroma_db/                  # ChromaDB 영속 데이터
    ├── item_vectors.bin            # 아이템 임베딩 벡터
    └── item_vectors.meta.json
```

### ⚠️ 중요: 매핑 파일 정합성

> **artifacts/mappings/*.json**은 학습과 추론의 인덱스 체계를 정의하는 "단일 진실 원천(Single Source of Truth)"입니다.

**절대 금지사항**:
- 환경 A의 매핑 파일 + 환경 B의 체크포인트/벡터 조합
- 매핑 파일 없이 체크포인트만 교체
- 운영 중 매핑 파일 임의 수정

---

## 🧪 로컬 환경 테스트

### 1. Docker 이미지 빌드

```bash
cd AI
docker build -t reco-service:local .
```

### 2. 컨테이너 실행 (GPU 활성화)

```bash
docker run --gpus all --rm -it \
  -p 8000:8000 \
  reco-service:local
```

### 3. 서비스 헬스체크

```bash
curl -s http://localhost:8000/health
```

**예상 응답**:
```json
{
  "status": "healthy",
  "mapped_num_items": 1234,
  "chroma_count": 1234
}
```

---

## 🐳 Docker 이미지 빌드 및 배포

### Registry에 이미지 Push (권장)

```bash
# 1. 이미지 빌드 (태그는 Docker Hub 기준 예시)
docker build -t <username>/reco-service:latest .

# 2. Registry에 Push
docker push <username>/reco-service:latest
```

> 💡 **Tip**: GitHub Container Registry(GHCR) 사용 시 `ghcr.io/<username>/reco-service:latest` 형식으로 변경

---

## 🚀 RunPod 배포

### Step 1: GPU Pod 생성

RunPod 콘솔에서 새 Pod 생성:

| 설정 항목 | 값 |
|-----------|-----|
| **Container Image** | `<username>/reco-service:latest` |
| **Expose Ports** | `8000` |
| **GPU Type** | 서비스 요구사항에 맞게 선택 (예: RTX 4090, A100) |
| **Volume** | `/workspace/artifacts` (영속 스토리지 마운트) |

### Step 2: Local => RunPod 저장소 이전
Runpod 실행 시 Container image 밑에 Container Start Command 명령어 다음과 같이 등록
'''
bash -c "mkdir -p /workspace/artifacts && \
cp -r /opt/artifacts_base/* /workspace/artifacts/ && \
bentoml serve service:RecoService --host 0.0.0.0 --port 8000"
'''

### (또는) Step 3: 환경 변수 설정

RunPod UI의 **Environment Variables**에 아래 추가:

```bash
ARTIFACTS_DIR=/workspace/artifacts
CHROMA_DIR=/workspace/artifacts/chroma_db
PIECE_TO_INDEX=/workspace/artifacts/mappings/piece_index.json
INDEX_TO_PIECE=/workspace/artifacts/mappings/idx_to_piece.json
SASREC_CKPT=/workspace/artifacts/checkpoints/BEST_SASRec_model.pth
TWOTOWER_CKPT=/workspace/artifacts/checkpoints/BEST_BestRecommend_model.pth
DEVICE=cuda:0
```

## 🗄️ 운영 환경 구성

### Volume에 Artifacts 업로드

#### 케이스 A: 최초 배포 (Volume이 비어있음)

**방법 1: 로컬에서 직접 업로드** (권장)
```bash
# RunPod CLI 또는 rsync로 artifacts/ 전체 업로드
rsync -avz ./artifacts/ <pod-ip>:/workspace/artifacts/
```

**방법 2: 컨테이너 시딩** (차선책)
- 컨테이너 최초 실행 시 기본 artifacts를 Volume으로 복사
- ⚠️ **반드시 1회만 실행되도록 구성**

#### 케이스 B: 재배포/재시작 (Volume에 데이터 있음)

```bash
# ✅ Volume 데이터 절대 덮어쓰지 않도록 주의
# Pod 재시작 시 기존 매핑/체크포인트 유지 확인
```

### Dockerfile 시딩 로직 개선 (권장)

기존 무조건 복사 방식:
```dockerfile
# ❌ 위험: 매번 덮어쓰기
COPY artifacts/ /opt/artifacts_base/
CMD cp -r /opt/artifacts_base/* /workspace/artifacts/ && \
    bentoml serve service:RecoService --host 0.0.0.0 --port 8000
```

개선된 조건부 시딩:
```bash
#!/bin/bash
# ✅ 안전: 최초 1회만 시딩
if [ ! -f /workspace/artifacts/mappings/piece_index.json ]; then
  echo "[BOOT] Seeding artifacts from base..."
  cp -rn /opt/artifacts_base/* /workspace/artifacts/ || true
else
  echo "[BOOT] Artifacts exist. Skipping seed."
fi

bentoml serve service:RecoService --host 0.0.0.0 --port 8000
```

> 💡 `cp -rn` 플래그: 기존 파일 존재 시 덮어쓰기 방지

---

## ✅ 배포 후 검증

### 1. 헬스체크

```bash
# RunPod Public URL 확인 후 호출
curl -s http://<runpod-url>:8000/health
```

**정상 응답 예시**:
```json
{
  "status": "healthy",
  "mapped_num_items": 1234,
  "mapping_count": 1234,
  "chroma_count": 1234,
  "device": "cuda:0"
}
```

### 2. 작품 임베딩
```bash
curl -X POST "http://<runpod-url>:8000/embed_artwork" \
  -H "Content-Type: application/json" \
  -d '{
    "artworkId" : 1,
    "artistId" : 2,
    "category" : 3,
    "image" : "원본 이미지 전송"
  }'
```

**예상 응답**:
```json
{
  "artworkId" : 1,
  "artistId" : 2,
  "category" : 3,
  "artworkVector" : [0,00000...., ... , 0.00000] (512D Vector)
}
```

### 3. 추천 API 테스트

```bash
curl -X POST "http://<runpod-url>:8000/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 123,
    "logs": [
      {"artworkId": 111, "action": "VIEW"},
      {"artworkId": 222, "action": "VIEW"}
    ]
  }'
```

**예상 응답**:
```json
{
  "recommendations": [
    {"rank" : 1, "artworkId": 333},
    {"rank" : 2, "artworkId": 444},
    ... ,
    {"rank" : 500, "artworkId": 3210},
  ]
}
```

---

## 🔧 트러블슈팅

### 문제 1: 외부 접속 불가

**증상**: `curl: (7) Failed to connect`

**체크리스트**:
- [ ] RunPod에서 **Expose Ports = 8000** 설정했는가?
- [ ] 서버가 `0.0.0.0:8000`에 바인딩되는가? (로그 확인)
- [ ] Pod 로그에 `Listening on 0.0.0.0:8000` 메시지 있는가?
- [ ] RunPod Public URL이 정확한가?

**해결**:
```bash
# Pod 로그 확인
runpod logs <pod-id>

# Dockerfile의 CMD 수정
CMD ["bentoml", "serve", "service:RecoService", "--host", "0.0.0.0", "--port", "8000"]
```

---

### 문제 2: 체크포인트 로드 실패

**증상**: `RuntimeError: Error(s) in loading state_dict`

**원인**:
1. 매핑 파일(`piece_index.json`)과 체크포인트의 `num_items` 불일치
2. `FF_DIM` 등 모델 하이퍼파라미터 변경
3. 서로 다른 환경의 아티팩트 혼용

**체크리스트**:
- [ ] `artifacts/mappings/*.json`이 학습 시와 동일한가?
- [ ] 환경변수 `SASREC_CKPT`, `TWOTOWER_CKPT` 경로가 정확한가?
- [ ] `item_vectors.bin`과 매핑 인덱스 범위가 일치하는가?

**해결**:
```bash
# 매핑 파일 개수 확인
cat /workspace/artifacts/mappings/piece_index.json | jq 'length'

# 모델 로드 로그 확인
grep "num_items" /var/log/service.log
```

---

### 문제 3: ChromaDB 벡터 검색 이상

**증상**: `chroma_count: 0` 또는 추천 결과 없음

**체크리스트**:
- [ ] `CHROMA_DIR=/workspace/artifacts/chroma_db` 경로가 맞는가?
- [ ] Volume에 `chroma_db/` 실제 데이터가 존재하는가?
- [ ] 컨테이너 사용자 권한 문제로 쓰기 실패하지 않았는가?

**해결**:
```bash
# Chroma DB 디렉토리 확인
ls -la /workspace/artifacts/chroma_db/

# 권한 문제 해결
chmod -R 755 /workspace/artifacts/chroma_db/
```

---

## 💡 Best Practices

### 1. Volume 기반 Artifacts 관리

```
✅ DO: RunPod Volume에 artifacts 영구 보관
❌ DON'T: 컨테이너 이미지에 artifacts 포함 (운영 시)
```

**이유**:
- 모델/매핑 업데이트 시 이미지 재빌드 불필요
- ChromaDB는 운영 중 지속적으로 변경됨
- 재배포 시에도 학습 상태 유지

---

### 2. 매핑 파일 버전 관리

```bash
# ✅ 권장: Git에서 매핑 파일 버전 관리
git add artifacts/mappings/
git commit -m "Update mappings: add artwork 1000-1050"

# ✅ 새 작품 추가 시 append-only
# ❌ 기존 인덱스 절대 변경 금지
```

---

### 3. Health Endpoint 정합성 체크

`service.py`에 정합성 검증 로직 추가:

```python
@svc.api(route="/health")
def health():
    mapping_count = len(piece_to_index)
    chroma_count = chroma_collection.count()
    
    if mapping_count != chroma_count:
        return {"status": "degraded", "warning": "Mapping mismatch"}
    
    return {
        "status": "healthy",
        "mapped_num_items": mapping_count,
        "chroma_count": chroma_count
    }
```

---

### 4. 환경별 설정 분리

```bash
# .env.dev
DEVICE=cpu
BATCH_SIZE=16

# .env.prod (RunPod)
DEVICE=cuda:0
BATCH_SIZE=64
```

---


## 📚 빠른 시작 요약

### 1️⃣ 로컬 테스트

```bash
cd AI
docker build -t reco-service:local .
docker run --gpus all -p 8000:8000 reco-service:local
curl http://localhost:8000/health
```

### 2️⃣ Registry 배포

```bash
docker build -t <username>/reco-service:latest .
docker push <username>/reco-service:latest
```

### 3️⃣ RunPod Pod 생성

- **Image**: `<username>/reco-service:latest`
- **Expose Ports**: `8000`
- **Volume Mount**: `/workspace/artifacts`
- **Environment Variables**:
  ```
  ARTIFACTS_DIR=/workspace/artifacts
  CHROMA_DIR=/workspace/artifacts/chroma_db
  DEVICE=cuda:0
  ```

### 4️⃣ 검증

```bash
curl http://<runpod-url>:8000/health
curl -X POST http://<runpod-url>:8000/recommend -H "Content-Type: application/json" -d '{"memberId":123,"logs":[]}'
```