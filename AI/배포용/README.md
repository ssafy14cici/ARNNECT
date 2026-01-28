# 1. 실행 명령어
bentoml serve . --port 8000

# 2. 포스트맨 명령어
- 이미지 임베딩
> URL : http://localhost:8000/embed_artwork
> Method : POST

- 추천
> URL : http://localhost:8000/recommend
> Method : POST
> Body : raw => 각 유저마다 타임스탬프 넣기 "test_user_logs.json 참고"