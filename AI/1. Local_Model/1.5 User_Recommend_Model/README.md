# 추천 모델 프로젝트 메모(공부 아님 제거할거임)

## 1) 오늘 결론 요약
- SASRec 체크포인트(`BEST_SASRec_model.pth`)는 **학습 당시 모델 구조/하이퍼파라미터/아이템 수/인덱스 매핑**이
  추론(analysis/recommend) 코드와 **완전히 동일**해야 `state_dict`를 정상 로드하고 결과를 재현할 수 있다.
- 현재 체크포인트는 아래 형태로 학습됨:
  - `item_embedding.weight` shape = **[30001, 512]**  → 아이템 수 30000(+PAD 1개)
  - Transformer FFN 차원(`linear1.weight` shape) = **2048**  → FF_DIM=2048
  - 레이어 수는 `layers.0`, `layers.1`가 있어 **2 layers**
- 그래서 추론 모델은 **체크포인트 모양대로** 생성해야 한다.
  - num_items=30001, d_model=512, ff_dim=2048, n_layers=2 (그리고 nhead도 학습 때 값과 동일)

## 2) 왜 에러가 났나?
- `artwork_vector.json`에서 구성한 현재 아이템 수가 약 **21001개(+PAD 포함 가정)**라서
  체크포인트의 `30001`과 달라 `item_embedding.weight` size mismatch 발생.
- 또한 최근 코드에서 FF_DIM을 768로 두면 체크포인트(2048)와 달라 Transformer 선형층에서 mismatch 발생.

## 3) “작품 수만 맞추면 되나?”에 대한 정확한 답
작품 수만 맞추면 충분하지 않다. 반드시 아래 3가지를 동시에 맞춰야 한다.

### (1) 아이템 개수 일치
- 학습/추론에서 동일한 num_items를 사용

### (2) artwork_id -> index 매핑 일치 (가장 중요)
- 개수가 같아도, 학습 때 artwork A가 123번이고 추론 때 500번이면 추천이 완전히 틀어진다.
- 따라서 `piece_index.json` 같은 매핑 파일을 만들어서
  **학습/추론/DB 저장 전 과정에서 동일 매핑을 사용**해야 한다.
- 새 작품이 추가되면 인덱스를 “append 방식”으로만 늘리고 기존 인덱스는 변경 금지.

### (3) 모델 하이퍼파라미터 일치
- VECTOR_DIM(512), MAX_SEQ_LEN, NHEAD, FF_DIM(2048), N_LAYERS 등이 학습과 동일해야 로드 가능.

## 4) 콜드/노멀/헤비 가중치 적용 방식
- 로그 기반 SASRec 임베딩 공간과 CLIP 임베딩 공간이 다를 수 있어
  **벡터를 직접 섞는(blend vector) 방식은 위험**할 수 있다.
- 더 안전한 방법: **점수(score) 혼합**
  - score_content = (콘텐츠 프로필 CLIP) · (작품 CLIP 벡터)
  - score_log = (SASRec user vector) · (SASRec item_embedding)
  - score = alpha_log * score_log + (1-alpha_log) * score_content
- 콜드/노멀/헤비 분류는 로그 길이로 구분:
  - cold: len <= 5 → alpha_log = 0.10
  - normal: 6~30 → alpha_log = 0.50 (50% 이하)
  - heavy: >30 → alpha_log = 0.65 (60~70% 중간값)

## 5) MLflow 실행 메모 (포트 8080)
- 오타 주의: `--host 127.0.0` 는 에러. 반드시 아래 중 하나 사용.
- 로컬에서만:
  - `mlflow server --host 127.0.0.1 --port 8080`
- 외부 접속도:
  - `mlflow server --host 0.0.0.0 --port 8080 --allowed-hosts "*" --cors-allowed-origins "*"`

## 6) 내일 할 일 체크리스트
1) 학습 때 사용했던 `artwork_id -> train_idx` 매핑 파일 확보 (예: `train_item_index.json`)
2) `artwork_vector.json`의 작품들과 매핑이 얼마나 겹치는지 확인 (누락률 체크)
3) 추론 코드는 체크포인트 shape 기반으로 모델 생성 + score blending으로 추천 생성
4) 최종적으로 추천 결과 JSON(`user_recommendations.json`)을 백엔드/VB에 저장하는 흐름 확정
