# 1. 도커 설치

### 1. docker 설치

기존에 존재할 수 있는 구형 버전을 지우고 저장소를 사용할 수 있도록 설정

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove $pkg; done

sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
```

### 2. docker gpg 키 및 저장소 등록

gpg key - 소프트웨어가 공식 저장소에서 왔는지 체크하고 전송중에 위/변조 되지 않았는지 확인

repository - 이미지 저장, 관리, 공유용

```bash
# GPG 키 추가
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 저장소(Repository) 설정
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
```

### 3. docker 및 docker compose 설치

```bash
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -
```

### 4. 권한 설정

```bash
# 현재 접속 중인 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 설정을 즉시 적용 (또는 재로그인)
newgrp docker
```

### 5. 서비스 자동 실행

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 6. 설치 확인 및 테스트

```bash
# Docker 버전 확인
docker --version

# Docker Compose 버전 확인 (이제 'docker compose' 명령어로 사용합니다)
docker compose version

# 테스트 컨테이너 실행
docker run hello-world
```

# 도커 세팅

### 1. docker file 설정

현재는 테스트 코드

추후 실제 빌드된 jar 또는 멀티스테이지 사용 필요
나중에 젠킨스 파이프라인에서 사용

경로: app/Dockerfile

```bash
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 2. 인프라 구축

docker compose를 사용해 jenkins, mysql, nginx를 한 번에 실행
경로: infra/docker-compose.yml

```bash
version: '3.8'

services:
  # 1. Nginx (웹 서버 & 리버스 프록시)
  nginx:
    image: nginx:latest
    container_name: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
    depends_on:
      - jenkins
      # - app (앱은 나중에 젠킨스가 띄울 예정)
    networks:
      - devops-net

  # 2. MySQL (데이터베이스)
  mysql:
    image: mysql:8.0
    container_name: mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: testdb
      MYSQL_USER: user
      MYSQL_PASSWORD: userpassword
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - devops-net
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  # 3. Jenkins (CI/CD 도구) - JDK 17 버전 사용
  jenkins:
    image: jenkins/jenkins:lts-jdk17
    container_name: jenkins
    user: root # 도커 명령어를 쓰기 위해 임시로 root 권한 부여
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - ./jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock # 호스트의 도커를 젠킨스가 제어
      - /usr/bin/docker:/usr/bin/docker
    networks:
      - devops-net

networks:
  devops-net:
    driver: bridge

volumes:
  mysql_data:
```

# 도커 실행

### 1. 실행

```bash
cd ~/test-project/infra
docker compose up -d
```

### 2. 젠킨스 기본 비밀번호 확인

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```