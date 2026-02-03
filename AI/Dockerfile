FROM pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime

WORKDIR /workspace

# 1. 시스템 패키지 설치
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 2. 파이썬 라이브러리 설치 (캐싱 효율을 위해 가장 먼저 수행)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. 필요한 폴더 구조 생성 (빈 폴더)
# artifacts 폴더는 복사하는 게 아니라, 빈 공간만 만들어둡니다.
RUN mkdir -p artifacts && mkdir -p artifacts/chroma_db

# 4. [핵심] 필요한 파일만 콕 집어서 복사 (화이트리스트 방식)
COPY service.py .
COPY bentofile.yaml .
COPY .env.example .
COPY README.md .
COPY Dockerfile .

# 5. 필요한 폴더(소스코드) 복사
COPY app ./app

# 참고: scripts 폴더는 복사 목록에 없으므로 제외됩니다.

EXPOSE 8000

# [주의] 아래 명령어의 'service:svc' 부분은 service.py 안의 클래스 이름과 맞춰야 합니다.
# (예: service:RecommenderService)
CMD ["bentoml", "serve", "service:RecommenderService", "--host", "0.0.0.0", "--port", "8000"]