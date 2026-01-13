# 기본 세팅

nginx기본 설정인 default.conf 세팅

기본 요청을 다른 포트 혹은 url로 보내주는 역할을 수행

경로: infra/nginx/conf.d/default.conf

```bash
server {
    listen 80;
    server_name localhost;

    # 1. 기본 요청은 나중에 뜰 자바 앱(App)으로 보냄 (현재는 없으므로 502 에러가 뜸)
    location / {
        proxy_pass http://app:8080; 
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 2. /jenkins로 들어오면 젠킨스로 연결 (또는 8080 포트로 직접 접속도 가능)
    # 편의상 젠킨스는 보통 포트로 구분하거나 서브도메인을 씁니다.
    # 여기서는 Nginx 설정 테스트를 위해 놔두지만, 
    # 실제 실습에선 http://서버IP:8080 으로 젠킨스에 접속하는게 더 편할 수 있습니다.
}
```