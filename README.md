<div align="center">

# 🎨 ARNNECT

</div>

**아티스트와 일반 사용자가 작품으로 소통**할 수 있는 예술 커뮤니티 플랫폼<br>
**AI 기반 개인화 추천**과 **3D 전시관 경험**을 통해 작품 감상부터 수집까지, 누구나 쉽게 참여할 수 있는 예술 생태계를 제공합니다.

> 예술이 연결되다, 여기서 만나다, **ARNNECT**

- **개발 기간** : 2026.01.06 ~ 2025.02.09 **(5주)**
- **플랫폼** : Web Design
- **개발 인원** : 6명 <br><br>

<img src="./readme-assets/ARNNECT_introduction.png" />

</div> <br>

## 🔎 목차

<div align="center">

### <a href="#developers">🌟 팀원 구성</a>

### <a href="#techStack">🛠️ 기술 스택</a>

### <a href="#systemArchitecture">🌐 시스템 아키텍처</a>

### <a href="#skills">📲 기능 구성</a>

### <a href="#feature"> 🏛️ 기능 시연</a>

### <a href="#directories">📂 디렉터리 구조</a>

### <a href="#projectDeliverables">📦 프로젝트 산출물</a>

</div>
<br>

## 🌟 팀원 구성

<a name="developers"></a>

<div align="center">

<div align="center">
<table>
    <tr>
        <td width="33%" align="center"> <a href="https://github.com/LOIS-N">
            <img src="./readme-assets/suwon.jpg" width="160px" /> <br> 최수원 <br>(Leader & Infra & Backend) </a> <br></td>
        <td width="33%" align="center"> <a href="https://github.com/sujin31">
            <img src="./readme-assets/sujin.png" width="160px" /> <br> 이수진 <br>(Backend Leader) </a> <br></td>
        <td width="33%" align="center"> <a href="https://github.com/mathmatice180521">
            <img src="./readme-assets/minseong.png" width="160px" /> <br> 김민성 <br>(AI Leader) </a> <br></td>
    </tr>
    <tr>
      <td width="280px">
        <sub>
          - Jenkins 기반의 빌드/배포 파이프라인구축 <br>
          - Docker compose 멀티 컨테이너 서비스 구조 설계 및 배포 <br>
          - Spring: 회원 관리, 댓글, 좋아요 API 구현
        </sub>
      </td>
      <td width="280px">
        <sub>
          - 사용자 로그 기반 추천용 데이터 전처리 및 AI 서버·OpenAI REST 연동 구조 설계 <br>
          - AOP + 비동기·독립 트랜잭션으로 로그 자동 수집 처리 <br>
          - 로그 집계 취향 분석 구현, Redis로 동시성 및 정합성 확보 <br>
          - 회원관리, 작품, 감상평, 팬레터, 콜렉트북 등 API 전반 구현 <br>
          - API 명세서 & 요구사항 정의서 설계
        </sub>
      </td>
      <td width="280px">
        <sub>
          - 작품 추천 시스템 파이프 라인 설계 <br>
          - 사진 더미 데이터 생산 및 추천 알고리즘 학습을 위한 유저 로그 로직 설정 <br>
          - CLIP, SASRec을 사용한 데이터 임베딩 <br>
          - TwoTower을 사용하여 사용자 로그 기반 추천 모델 설계/학습 <br>
          - Runpod, BentoML을 이용한 외부 AI 추론 서버 구축
        </sub>
      </td>
    </tr>

</table>

<table>
    <tr>
        <td width="33%" align="center"> <a href="https://github.com/yooneverse">
        <img src="./readme-assets/jiyoon.jpg" width="160px" /> <br> 김지윤 <br> (Frontend Sub & Presentation & Media Production) </a> <br></td>
        <td width="33%" align="center"> <a href="https://github.com/hyeryeongeda">
        <img src="./readme-assets/hyeryeong.jpg" width="160px" /> <br> 김혜령 <br> (Frontend Leader & Docs) </a> <br></td>
        <td width="33%" align="center"> <a href="https://github.com/ssafy14cici">
        <img src="./readme-assets/chaea.jpg" width="160px" /> <br> 김채아 <br>(Frontend Sub & Design) </a> <br></td>
    </tr>
    <tr>
        <td width="280px">
          <sub>
            - React 기반 작품상세 페이지 API 연동 및 상태 기반 UI 설계·구현 <br>
            - 서비스 운영 필수 이용자 지침·약관 페이지→ 구조 설계 및 UI 일관성 정비 <br>
            - 중간·최종 발표 발표자 및 PR 리딩 <br>
            - Premiere, Movavi 기반 영상 포트폴리오 제작 및 PowerPoint·Canva 활용 발표 자료 기획·디자인 총괄 <br>
            - Grok 및 Veo, Sora 활용 AI 영상 및 이미지 콘텐츠 제작
          </sub>
        </td>
        <td width="280px">
          <sub>
            - React + TypeScript + Vite 기반 FE 아키텍처 설계, 라우팅/전역 상태(Zustand) 구축 <br>
            - 로그인/회원가입(이메일 인증 포함) 및 role 기반 Guard로 인증·권한 플로우 구현 <br>
            - AppLayout·Navbar 전역 UI 구현(라우트 기반 navVariant 분기, 반응형, 모달/전환 UX 정리) <br>
            - 작품 피드/상세/검색 + 정렬/토글/무한 스크롤로 탐색 UX 완성 <br>
            - 리뷰·댓글 CRUD, 팔로우·팬레터(답변 포함) 등 커뮤니티/상호작용 기능 연동 <br>
            - QR 티켓 발급·스캔 수집 → 콜렉트북 + ‘너의 취향은’(MBTI)·리마인드 퀴즈 기능 구현
          </sub>
        </td>
        <td width="280px">
          <sub>
            - Three.js + React Three Fiber(@react-three/drei) 기반 3D 전시장 FE 구현, 씬 구조/카메라·조명/환경(HDRI) 세팅 <br>
            - Blender로 에셋 커스텀, 간판/패널 등 오브젝트 제작 후 GLB 통합 <br>
            - 웨이포인트 동선 설계로 관람 흐름 최적화, 조작법 오버레이로 초기 진입 UX 보완 <br>
            - 대용량 GLB/텍스처 로딩 병목을 에셋/텍스처 최적화 + 브라우저 캐싱으로 개선 <br>
            - AppLayout·Navbar/메뉴 IA 정리로 전역 탐색 흐름·화면 일관성 개선, 팬레터·티켓(디자인 추가)·프로필·회원가입 등 주요 페이지 UI(CSS) 구현 및 전역 스크롤/BGM/폰트/푸터 설정 반영
          </sub>
        </td>
    </tr>

</table>
</div>
<br>

</div>

## 🛠️ 기술 스택

<a name="techStack"></a>

### 🌕 Frontend

<div align="center">

![VSCode](https://img.shields.io/badge/VisualStudioCode-007ACC?style=for-the-badge&logo=VisualStudioCode&logoColor=white)<br>
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)<br>
![React](https://img.shields.io/badge/react-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-orange?style=for-the-badge&logo=Rss&logoColor=white)<br>
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=Three.js&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/React%20Three%20Fiber-000000?style=for-the-badge&logo=react&logoColor=white)
![Blender](https://img.shields.io/badge/Blender-E87D0D?style=for-the-badge&logo=Blender&logoColor=white)

<br>

| **Category** | **Stack** |
|:---:|:---|
| **Language** | TypeScript 5.8.3 |
| **Framework** | React 19.1.0, React Router 7.7.0 |
| **Library** | Zustand 5.0.6, Axios 1.10.0, React Three Fiber, Drei, Emotion 11.14.0 |
| **Build Tool** | Vite 6.3.1 |
| **IDE** | Visual Studio Code 1.103.1 |

</div>

### 🌑 Backend

<div align="center">

![IntelliJ IDEA](https://img.shields.io/badge/IntelliJ_IDEA-black?style=for-the-badge&logo=intellijidea)
![Java](https://img.shields.io/badge/Java-orange?style=for-the-badge&logo=openjdk)
![Gradle](https://img.shields.io/badge/Gradle-02303A?style=for-the-badge&logo=gradle)<br>
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=jsonwebtokens)<br>
![Hibernate](https://img.shields.io/badge/Hibernate-59666C?style=for-the-badge&logo=hibernate)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis)<br>
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger)
![OpenAI](https://img.shields.io/badge/OpenAI-black?style=for-the-badge&logo=openai)

</div>

| **Category** | **Stack** |
|:---:|:---|
| **Language** | Java 17 |
| **Framework** | Spring Boot 3.5.9 |
| **Library** | Spring Security, Spring Data JPA, Spring Data Redis, Spring Batch, Spring Validation, Springdoc OpenAPI, JWT (jjwt), Lombok |
| **Build Tool** | Gradle 8.14.3 |
| **Database** | MySQL 8.0, Redis 7.4 |
| **IDE** | IntelliJ IDEA 2023.3.8 (Ultimate Edition) |

### 🤖 AI

<div align="center">

![VSCode](https://img.shields.io/badge/VisualStudioCode-007ACC?style=for-the-badge&logo=VisualStudioCode&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)<br>
![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white)
![NumPy](https://img.shields.io/badge/numpy-%23013243.svg?style=for-the-badge&logo=numpy&logoColor=white)<br>
![BentoML](https://img.shields.io/badge/BentoML-FF6F00?style=for-the-badge&logo=bentoml&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-orange?style=for-the-badge&logo=database&logoColor=white)
![RunPod](https://img.shields.io/badge/RunPod-purple?style=for-the-badge&logo=serverless&logoColor=white)

<br>

| **Category** | **Stack** |
|:---:|:---|
| **Language** | Python 3.9+ |
| **Framework** | BentoML |
| **Library** | PyTorch, NumPy, Pandas, ChromaDB, OpenAI CLIP |
| **Model** | SASRec, Two-Tower Recommender |
| **Database** | ChromaDB (Vector Store) |
| **Deployment** | RunPod GPU Pod, Docker |
| **IDE** | Visual Studio Code |

</div>

### ⚙️ DevOps

<div align="center">

![GitLab](https://img.shields.io/badge/GitLab-FC6D26?style=for-the-badge&logo=gitlab&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![Jenkins](https://img.shields.io/badge/Jenkins-D24939?style=for-the-badge&logo=jenkins&logoColor=white)<br>
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)<br>
![SSH](https://img.shields.io/badge/SSH-4D4D4D?style=for-the-badge&logo=openssh&logoColor=white)
![Ubuntu](https://img.shields.io/badge/Ubuntu-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![Mattermost](https://img.shields.io/badge/Mattermost-0058CC?style=for-the-badge&logo=mattermost&logoColor=white)

<br>

#### 서버 스펙
| **요소** | **스펙** |
|:---:|:---:|
| **CPU** | 4vCPUs |
| **RAM** | 16 GB |
| **Storage (Disk)** | SSD: 320 GB |

#### 사용 기술
| **기술** | **버전** |
|:---:|:---:|
| **Jenkins** | 2.528.3 |
| **Docker** | 29.1.5 |
| **Docker Compose** | 5.0.1 |
| **Nginx** | 1.29.4-alpine |
| **SSH** | 9.6 |
| **Ubuntu** | 24.04.3 LTS |
| **Mattermost** | 10.11.9 |

</div>

## 🌐 시스템 아키텍처

<a name="systemArchitecture"></a>

### System Architecture
<img src="./readme-assets/System_Architecture.png"/>

### CI/CD Sequence Diagram
<img src="./readme-assets/CICD_Sequence_Diagram.png"/>

### Event Notification

<div align="center">

<table>
  <tr>
    <td align="center" width="50%"><b>❌ Jenkins Pipeline Failure</b></td>
    <td align="center" width="50%"><b>✅ Jenkins Pipeline Success</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/deploy_fail.png"/></td>
    <td align="center"><img src="./readme-assets/deploy_success.png"/></td>
  </tr>
</table>

</div>

<br>

## 📲 기능 구성

<a name="skills"></a>

### 🎨 주요 기능

#### 1️⃣ 사용자 인증 및 권한 관리
- **회원가입/로그인**: 이메일 인증 기반 회원가입, JWT 토큰 기반 인증
- **역할 구분**: 일반 사용자(General) / 아티스트(Artist) 권한 분리
- **OAuth2 연동**: 소셜 로그인 지원

#### 2️⃣ 작품 탐색 및 검색
- **작품 피드**: 무한 스크롤 기반 작품 목록
- **상세 보기**: 작품 정보, 작가 정보, 관련 리뷰
- **검색 및 필터링**: 카테고리, 정렬 옵션 제공
- **작품 업로드**: 아티스트 전용 작품 등록/수정/삭제

#### 3️⃣ 커뮤니티
- **리뷰 시스템**: 작품에 대한 리뷰 작성/조회/수정/삭제
- **댓글**: 리뷰에 대한 댓글 작성 및 관리
- **팔로우**: 아티스트/사용자 팔로우 기능
- **팬레터**: 일반 사용자 → 아티스트 팬레터 전송 및 답변

#### 4️⃣ 콜렉트북 (QR 티켓)
- **QR 티켓 발급**: 아티스트가 전시/작품용 QR 티켓 생성
- **QR 스캔 수집**: 일반 사용자가 QR 스캔으로 작품 수집
- **콜렉트북**: 수집한 작품 목록 및 상세 보기

#### 5️⃣ 개인화 추천
- **AI 추천 시스템**: SASRec + Two-Tower 모델 기반 작품 추천
- **취향 분석**: 사용자 행동 로그 기반 취향 분석
- **MBTI 매칭**: 예술 취향 MBTI 결과 제공
- **리마인드 퀴즈**: 과거 감상 작품 기반 퀴즈

#### 6️⃣ 3D 전시관
- **Hall**: 메인 전시 홀(React Three Fiber)
- **Exhibit**: 아티스트별 개별 전시 공간
- **3D 인터랙션**: Blender GLB 에셋 기반 몰입형 전시 경험

## 🏛️ 기능 시연

<a name="feature"></a>

### 🖥️ 화면 구성 및 기능

<div align="center">

<table>
  <tr>
    <td align="center" width="33%"><b>1. 인트로</b></td>
    <td align="center" width="33%"><b>2. 메인 홀</b></td>
    <td align="center" width="33%"><b>3. 메인 홀 조작법</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/1_intro.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/2_main_hall.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/3_main_hall_operation.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>4. 메인 홀 디테일</b></td>
    <td align="center" width="33%"><b>5. 메인 홀 전시장 이동</b></td>
    <td align="center" width="33%"><b>6. 포트폴리오 시작</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/4_main_hall_detail.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/5_main_hall_move_to_exhibition.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/6_portfolio_start.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>7. 포트폴리오 내부 1</b></td>
    <td align="center" width="33%"><b>8. 포트폴리오 내부 2</b></td>
    <td align="center" width="33%"><b>9. 작품 디테일 이동</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/7_portfolio_in_1.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/8_portfolio_in_2.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/9_portfolio_in_move_to_exhibition.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>10. 로그인 유저</b></td>
    <td align="center" width="33%"><b>11. 작품 디테일 페이지</b></td>
    <td align="center" width="33%"><b>12. 작가 프로필 페이지</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/10_login_user.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/11_artwork_detail_page.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/12_artist_detail_page.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>13. 작가 프로필 팬레터</b></td>
    <td align="center" width="33%"><b>14. 너의 취향은</b></td>
    <td align="center" width="33%"><b>15. 너의 취향은 - 테스트</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/13_artist_profile_fanletter.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/14_your_persona.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/15_your_persona_test.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>16. 너의 취향은 - 결과표</b></td>
    <td align="center" width="33%"><b>17. 너의 취향은 - 반영피드</b></td>
    <td align="center" width="33%"><b>18. 유저 프로필</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/16_your_persona_result.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/17_your_persona_feed.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/18_user_profile.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>19. 아티스트 로그인</b></td>
    <td align="center" width="33%"><b>20. 아티스트 라운지 - 티켓</b></td>
    <td align="center" width="33%"><b>21. 티켓 생성 1</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/19_artist_login.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/20_artist_lounge.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/21_artist_lounge_ticket_create_1.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>22. 티켓 생성 2</b></td>
    <td align="center" width="33%"><b>23. 티켓 발급 완료</b></td>
    <td align="center" width="33%"><b>24. 아티스트 팬레터</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/22_artist_lounge_ticket_create_2.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/23_artist_lounge_ticket_complete.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/24_artist_lounge_fanletter.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>25. 검색 페이지</b></td>
    <td align="center" width="33%"><b>26. 404 페이지</b></td>
    <td align="center" width="33%"><b>27. 회원가입 페이지</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/25_search_page.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/26_404_page.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/27_signup_page.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>28. 유저 회원가입</b></td>
    <td align="center" width="33%"><b>29. 유저 회원가입 약관</b></td>
    <td align="center" width="33%"><b>30. 아티스트 회원가입</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/28_user_signup_page.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/29_user_signup_termsandconditions.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/30_aritst_signup.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>31. 아티스트 정보 입력</b></td>
    <td align="center" width="33%"><b>32. 아티스트 예술인 증명</b></td>
    <td align="center" width="33%"><b>33. 아티스트 약관</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/31_aritst_signup_inputdata.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/32_aritst_signup_artistprove.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/33_artist_signup_termsandconditions.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>34. 유저 취향도형</b></td>
    <td align="center" width="33%"><b>35. 유저 티켓 등록 1</b></td>
    <td align="center" width="33%"><b>36. 유저 티켓 등록 2</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/35_user_lounge_personahexagon.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/36_user_lounge_ticket_registration_1.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/37_user_lounge_ticket_registration_2.png"/></td>
  </tr>

  <tr>
    <td align="center" width="33%"><b>37. 유저 티켓 등록 완료</b></td>
    <td align="center" width="33%"><b>38. 유저 라운지 - 퀴즈 1</b></td>
    <td align="center" width="33%"><b>39. 유저 라운지 - 퀴즈 2</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/capture/38_user_lounge_ticket_registration_complete.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/39_user_lounge_quiz_1.png"/></td>
    <td align="center"><img src="./readme-assets/usescreen/capture/40_user_lounge_quiz_2.png"/></td>
  </tr>

</table>

</div>

### 🖥️ 실제 기능 시연

<div>

<table>
  <tr>
    <td align="center" width="33%"><b>1. 인트로 홀</b></td>
    <td align="center" width="33%"><b>2. 로그인 - 유저</b></td>
    <td align="center" width="33%"><b>3. 로그인 - 아티스트</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/moved/intro_hall.gif"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/login_out(user).gif"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/login_out(artist).gif"/></td>
  </tr>
    <tr>
    <td align="center" width="33%"><b>4. 프로필 페이지 - 유저</b></td>
    <td align="center" width="33%"><b>5. 프로필 페이지 - 예술가</b></td>
    <td align="center" width="33%"><b>6. 너의 취향은</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/moved/profile(user).gif"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/profile(artist).gif"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/your_persona.gif"/></td>
  </tr>
    <tr>
    <td align="center" width="33%"><b>7. 취향 도형</b></td>
    <td align="center" width="33%"><b>8. 팬레터</b></td>
    <td align="center" width="33%"><b>9. 리마인드 퀴즈</b></td>
  </tr>
  <tr>
    <td align="center"><img src="./readme-assets/usescreen/moved/persona_hexagon.gif"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/fan_letter.gif"/></td>
    <td align="center"><img src="./readme-assets/usescreen/moved/remind_quiz.gif"/></td>
  </tr>
</table>

</div>

### 🎨 화면 구성 및 기능


## 📂 디렉터리 구조

<a name="directories"></a>

### 🌕 Frontend

<details align="left">
  <summary>
    <strong>Frontend 프로젝트 구조</strong>
  </summary>

```
📦FE
 ┣ 📂src
 ┃ ┣ 📂app
 ┃ ┃ ┣ 📂layouts              # AppLayout, RootLayout
 ┃ ┃ ┗ 📂router               # routes.tsx, Guard, guards.ts
 ┃ ┣ 📂components
 ┃ ┃ ┣ 📂layout               # Navbar, Footer
 ┃ ┃ ┗ 📂charts               # Radar6 등 차트 컴포넌트
 ┃ ┣ 📂features
 ┃ ┃ ┣ 📂auth                 # store / api / model
 ┃ ┃ ┣ 📂artworks             # api / model / ui
 ┃ ┃ ┣ 📂reviews              # api / model / ui
 ┃ ┃ ┣ 📂tickets              # api + resolveTicketMedia
 ┃ ┃ ┣ 📂collectbook          # api / ui
 ┃ ┃ ┗ 📂fanLetter            # api / ui
 ┃ ┣ 📂pages
 ┃ ┃ ┣ 📂home                 # Home / HomePC / HomeMobile
 ┃ ┃ ┣ 📂hall                 # Hall
 ┃ ┃ ┣ 📂exhibit              # Exhibit
 ┃ ┃ ┣ 📂search               # Search
 ┃ ┃ ┣ 📂guide                # Guide
 ┃ ┃ ┣ 📂feed                 # Feed
 ┃ ┃ ┣ 📂auth                 # Login / Signup
 ┃ ┃ ┣ 📂artworks             # ArtworkCreate/Edit/Detail
 ┃ ┃ ┣ 📂reviews              # ReviewCreate/Edit/Detail
 ┃ ┃ ┣ 📂lounge               # Lounge / LoungeIndex / user/artist
 ┃ ┃ ┣ 📂yourpreference       # YourPreference / Select / Result
 ┃ ┃ ┣ 📂profile              # Profile + tabs
 ┃ ┃ ┣ 📂fanLetter            # FanLetterCompose / MyFanLetters
 ┃ ┃ ┣ 📂legal                # PrivacyPolicy / TermsOfService
 ┃ ┃ ┗ 📂notfound             # NotFound
 ┃ ┣ 📂museum                 # three viewer scripts
 ┃ ┗ 📂shared
 ┃ ┃ ┣ 📂api                  # http wrapper
 ┃ ┃ ┗ 📂utils                # ScrollToTop 등 공통 유틸
 ┣ 📜.gitignore
 ┣ 📜.prettierrc
 ┣ 📜Dockerfile
 ┣ 📜eslint.config.js
 ┣ 📜index.html
 ┣ 📜package-lock.json
 ┣ 📜package.json
 ┣ 📜README.md
 ┣ 📜tsconfig.app.json
 ┣ 📜tsconfig.json
 ┣ 📜tsconfig.node.json
 ┗ 📜vite.config.ts
```

</details>

### 🌑 Backend

<details align="left">
  <summary>
    <strong>Backend 프로젝트 구조</strong>
  </summary>

```
📦backend
 ┣ 📂gradle
 ┃ ┗ 📂wrapper
 ┣ 📂src
 ┃ ┣ 📂main
 ┃ ┃ ┣ 📂java
 ┃ ┃ ┃ ┗ 📂com
 ┃ ┃ ┃ ┃ ┗ 📂ssafy
 ┃ ┃ ┃ ┃ ┃ ┗ 📂arnnect
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂artwork
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂application
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂dto
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂request
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂response
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂service
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂domain
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂entity
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂presentation
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂controller
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂repository
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂auth
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂application
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂dto
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂request
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂response
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂service
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂jwt
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂presentation
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂controller
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂collectbook
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂comment
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂fanletter
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂follow
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂member
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂review
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ └── (application / domain / presentation / repository 동일 구조)
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂preference
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂application
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂dto
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂service
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂vo
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂batch
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂config
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂job
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂domain
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂presentation
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂controller
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂repository
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂remind
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂presentation
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂controller
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂common
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂config
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂exception
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂file
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂logs
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ 📂response
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂util
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ 📂security
 ┃ ┃ ┗ 📂resources
 ┃ ┗ 📂test
 ┃ ┃ ┗ 📂java
 ┣ 📜.gitattributes
 ┣ 📜.gitignore
 ┣ 📜build.gradle
 ┣ 📜Dockerfile
 ┣ 📜gradlew
 ┣ 📜gradlew.bat
 ┣ 📜README.md
 ┗ 📜settings.gradle
```

</details>

### 🤖 AI

<details align="left">
  <summary>
    <strong>AI 프로젝트 구조</strong>
  </summary>

```
📦AI
 ┣ 📂app
 ┃ ┣ 📂models
 ┃ ┃ ┣ 📜__init__.py
 ┃ ┃ ┣ 📜loader.py               # 데이터를 로드
 ┃ ┃ ┣ 📜sasrec_twotower.py      # TwoTower 모델
 ┃ ┃ ┗ 📜README.md
 ┃ ┗ 📂utils
 ┃ ┃ ┣ 📜__init__.py
 ┃ ┃ ┣ 📜chroma_store.py         # chromaDB 저장 로직
 ┃ ┃ ┣ 📜clip_embedder.py        # 작품 임베딩 벡터
 ┃ ┃ ┣ 📜config.py               # 환경 설정
 ┃ ┃ ┣ 📜item_vector_table.py    # 아이템 벡터 저장 테이블
 ┃ ┃ ┣ 📜mapping_store.py        # idx <=> artwork 맵핑
 ┃ ┃ ┣ 📜recommender.py          # 추천 시스템
 ┃ ┃ ┗ 📜schemas.py              # chromaDB 데이터 형식
 ┣ 📂artifacts                   # ⚠️ 런타임 필수 아티팩트
 ┃ ┣ 📂checkpoints
 ┃ ┃ ┣ 📜BEST_SASRec_model.pth
 ┃ ┃ ┗ 📜BEST_BestRecommend_model.pth
 ┃ ┣ 📂mappings
 ┃ ┃ ┣ 📜piece_index.json
 ┃ ┃ ┗ 📜idx_to_piece.json
 ┃ ┣ 📂chroma_db                 # ChromaDB 영속 데이터
 ┃ ┣ 📜item_vectors.bin          # 아이템 임베딩 벡터
 ┃ ┗ 📜item_vectors.meta.json
 ┣ 📜Dockerfile                  # 컨테이너 이미지 빌드 설정
 ┣ 📜bentofile.yaml              # BentoML 서비스 정의
 ┣ 📜requirements.txt            # Python 의존성
 ┗ 📜service.py                  # BentoML 서비스 엔트리포인트
```

</details>

## 📦 프로젝트 산출물

<a name="projectDeliverables"></a>

<h3>🖼️ 화면 설계서</h3>
<div align="center">

<img src="./readme-assets/Screen_Mockup.png"/>
</div>

<h3>🗄️ ERD</h3>
<div align="center">

<img src="./readme-assets/ERD.png"/>
</div>

<h3><a href="https://www.notion.so/2f6926a451c3807e9ec1c06bd03a3a27?source=copy_link" target="_blank">📋 요구 사항 명세서</a></h3>

<h3><a href="https://www.notion.so/API-2e3926a451c380bab87ec368e29a9d2c?source=copy_link" target="_blank">📡 API 명세서</a></h3>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 22.17.0+
- **Java** 17
- **Python** 3.9+
- **Docker** 최신 버전
- **MySQL** 8.0
- **Redis** 7.4

### Installation & Running

#### 1️⃣ Frontend

```bash
cd FE
npm install
npm run dev
```

#### 2️⃣ Backend

```bash
cd BE
./gradlew build
./gradlew bootRun
```

#### 3️⃣ AI Server

```bash
cd AI
docker build -t arnnect-reco:latest .
docker run --gpus all -p 8000:8000 arnnect-reco:latest
```

### Environment Variables

#### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_USE_MOCK=false
```

#### Backend (application.yml)
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/arnnect
    username: your_username
    password: your_password
  data:
    redis:
      host: localhost
      port: 6379
jwt:
  secret: your_jwt_secret
```

#### AI (.env)
```bash
ARTIFACTS_DIR=/workspace/artifacts
CHROMA_DIR=/workspace/artifacts/chroma_db
DEVICE=cuda:0
```

---

## 📝 주요 기술적 특징

### 🔐 보안
- JWT 기반 인증/권한 시스템
- Spring Security를 통한 API 보안
- CORS 정책 적용

### 🚀 성능 최적화
- Redis 캐싱 전략
- 이미지 CDN 활용 (AWS S3)
- React 코드 스플리팅 및 Lazy Loading
- 무한 스크롤 최적화

### 🤖 AI/ML
- SASRec (Self-Attentive Sequential Recommendation)
- Two-Tower 모델 기반 협업 필터링
- CLIP 기반 작품 임베딩
- ChromaDB를 통한 벡터 검색

### 🎨 3D 경험
- React Three Fiber 기반 3D 전시관
- Blender GLB 에셋 최적화
- 부드러운 카메라 이동 및 인터랙션

### 📦 CI/CD
- Jenkins 기반 자동 배포
- Docker 컨테이너화
- Nginx 리버스 프록시
- Blue-Green 배포 전략

---

<div align="center">

## 🎉 Thank You!

**ARNNECT** | 예술로 연결되는 세상

---

**© 2026 ARNNECT Team. All rights reserved.**

</div>
