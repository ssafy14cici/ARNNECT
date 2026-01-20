# 1. 로컬 실행

> 1. 데이터셋 및 구성

데이터셋의 출처는 다음과 같습니다.
Wikiart : https://www.wikiart.org/
AI 생성 데이터셋 : (다운 받으실려면 mathmatice180521@gmail.com으로 연락주셔야 합니다.)

> 2. 파일 트리
> 
파일 트리 구조는 다음과 같습니다.

Local_Model : 로컬에서 실행하는 AI 추천 모델(순서대로)
└ 1. CLiP_embedded_Model : 작품의 임베딩 벡터를 산출하는 폴더입니다.
└ 2. artist_embedded_Model : 작가가 그린 작품들의 평균적인 임베딩 벡터를 산출하는 폴더입니다.
└ 3. SASRec_trained_Model : 유저의 경로를 학습시키는 모델 및 가중치를 산출하는 폴더입니다.
└ 4. SASRec_inference_Model : 3에서 학습시킨 가중치를 모델에 넣어 추론 및 검증하는 폴더입니다.
└ 5. User_Recommend_Model : 3에서 만든 Best_SASRec_model.pth를 가지고 사용자 추천 알고리즘을 학습하는 알고리즘을 구현하고 가중치를 산출하는 폴더입니다.
└ 6. Inference_and_Reranking.Model : 5에서 만든 Best_Recommend_model.pth를 가지고 사용자 추천 알고리즘을 추론 및 검증하는 폴더입니다.
└ requirements.txt : 폴더를 구동하기 위한 받아야 하는 모든 패키지들을 기록한 텍스트 문서입니다.
└ README.md : 기록용 문서입니다.

> 3. 일자별 변경사항

2026/01/20
- 
- 1. CLiP_embedded_Model에서 PRETRAINED_DATA 변경
	(openai => datacomp 쪽으로 바뀜)
- 2. 유저 추천 모델 학습에 콜드/노멀/헤비 로그 유저들의 가중치를 넣어서 학습시킴
- 3. 그 이외의 이름(artwork), 파일 확장자(json)를 획일화시킴.