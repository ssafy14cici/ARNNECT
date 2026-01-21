# 1. Base Image 선택 (기존과 동일하게 node 20 alpine 버전)
FROM node:20-alpine

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 설치 (캐싱 활용을 위해 package 파일들만 먼저 복사)
# package-lock.json도 있으면 같이 복사됩니다.
COPY package*.json ./

# npm install 실행 (CI 환경에서는 npm ci가 더 빠르고 안정적일 수 있습니다)
RUN npm install

# 4. 전체 소스 코드 복사
COPY . .

# 5. 빌드 실행 (dist 폴더 생성)
RUN npm run build