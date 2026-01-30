FROM nginx:alpine

# 1. Nginx 설정 파일 복사 (개발자 PC에 이 파일이 있어야 함)
COPY nginx-conf/default.conf /etc/nginx/conf.d/default.conf

# 2. React 빌드 결과물 복사
# Jenkins가 'dist' 폴더를 생성함
COPY dist /usr/share/nginx/html

# 3. Nginx가 파일을 읽을 수 있도록 권한 부여
USER root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 4. 실행
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]