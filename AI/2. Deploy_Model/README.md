repo/
  app/
    service.py                 # BentoML Service (서빙 엔트리)
    config.py                  # 환경변수/설정 로더
    schemas.py                 # 입력/출력 Pydantic 스키마

    core/
      clip_encoder.py          # CLIP 로딩/임베딩
      chroma_store.py          # ChromaDB 연결/CRUD
      sasrec_runtime.py        # SASRec 로딩/추천(학습아이템만)

      recommenders.py          # 3종 추천 로직(작품/작가/유저)

    scripts/
      ingest_from_json.py      # (옵션) artwork_vector.json -> Chroma 벌크 적재
      train_sasrec.py          # (옵션) 서버 내 재학습 스켈레톤

  models/
    BEST_SASRec_model.pth      # 배포용 SASRec 모델(고정)
    piece_index.json           # (권장) 매핑 파일(학습에 사용한 idx2artwork 복구용)

  docker/
    Dockerfile
    docker-compose.yml         # (Chroma 같이 띄우면)
  
  bentofile.yaml
  requirements.txt
  README.md
