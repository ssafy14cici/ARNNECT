FROM nginx:alpine

# 1. Nginx 설정 파일 복사 (개발자 PC에 이 파일이 있어야 함)
COPY nginx-conf/default.conf /etc/nginx/conf.d/default.conf

# 2. React 빌드 결과물 복사 (Jenkins 빌드 경로에 맞게 수정 필요)
# 보통 Jenkins가 'build' 혹은 'dist' 폴더를 생성함
COPY build /usr/share/nginx/html

# 3. 실행
CMD ["nginx", "-g", "daemon off;"]