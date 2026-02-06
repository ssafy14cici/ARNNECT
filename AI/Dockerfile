FROM pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime

WORKDIR /workspace

# 1. 패키지 설치
RUN apt-get update && apt-get install -y git wget && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. [핵심] 파일을 '안전 지대'(/opt)로 복사 (여기는 볼륨이 안 덮음)
COPY artifacts/ /opt/artifacts_base/

# 3. 소스코드 복사
COPY service.py .
COPY bentofile.yaml .
COPY app/ /workspace/app/

# 4. 확인용 (빌드할 때 잘 들어갔나 눈으로 확인)
RUN echo "=== Check Backup Artifacts ===" && ls -R /opt/artifacts_base

EXPOSE 8000

# 5. [중요] 시작할 때 안전 지대에서 -> 실행 폴더로 파일 복사
# (이미 파일이 있으면 덮어쓰지 않도록 -n 옵션 사용 가능, 여기선 강제 복사 -r 사용)
CMD ["bash", "-c", "cp -r /opt/artifacts_base/* /workspace/artifacts/ 2>/dev/null || : && bentoml serve service:RecoService --host 0.0.0.0 --port 8000"]