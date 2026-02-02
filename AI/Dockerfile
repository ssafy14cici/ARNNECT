FROM pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime

WORKDIR /workspace

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 파이썬 라이브러리 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# [전략 2 반영] 안전 장치: 마운트할 폴더 미리 생성
# 트럭(볼륨)이 오기 전에 짐을 풀 선반을 만들어 두는 작업입니다.
RUN mkdir -p artifacts && mkdir -p artifacts/chroma_db

# 코드 복사 (데이터 제외)
COPY service.py ./service.py
COPY bentofile.yaml ./bentofile.yaml
COPY app ./app
COPY scripts ./scripts
# .env.example만 복사 (실제 .env는 볼륨에 넣을 예정)
COPY .env.example ./.env.example

EXPOSE 8000

CMD ["bentoml", "serve", "service:svc", "--host", "0.0.0.0", "--port", "8000"]