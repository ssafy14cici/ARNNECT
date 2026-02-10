
````md
<div align="center">

<img src="https://via.placeholder.com/150" alt="ARNNECT FE Logo" width="120" height="120" />

# ARNNECT Frontend (FE)

**React + TypeScript + Vite 기반 프론트엔드**  
작품 탐색/커뮤니티/수집(콜렉트북)/취향 분석/3D 전시관까지 사용자 경험을 담당합니다.

<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=React&logoColor=black">
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=TypeScript&logoColor=white">
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white">
<br/>
<img src="https://img.shields.io/badge/React%20Router-CA4245?style=for-the-badge&logo=ReactRouter&logoColor=white">
<img src="https://img.shields.io/badge/Zustand-orange?style=for-the-badge&logo=Rss&logoColor=white">
<img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=Axios&logoColor=white">
<br/>
<img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=Three.js&logoColor=white">
<img src="https://img.shields.io/badge/React%20Three%20Fiber-000000?style=for-the-badge&logo=react&logoColor=white">
<img src="https://img.shields.io/badge/Blender-E87D0D?style=for-the-badge&logo=Blender&logoColor=white">

<!-- 필요하면 교체 -->
[🚀 Live Demo](https://i14e107.p.ssafy.io:8001)

</div>

<br/>

## 📋 Table of Contents
- [About FE](#-about-fe)
- [Key Features (FE Scope)](#-key-features-fe-scope)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Running Locally](#-running-locally)
- [Environment Variables](#-environment-variables)
- [Routing Overview](#-routing-overview)
- [Frontend Conventions](#-frontend-conventions)
- [Troubleshooting](#-troubleshooting)
- [Contribution Strategy](#-contribution-strategy)

---

## 🖼 About FE
ARNNECT Frontend는 다음 기능을 제공합니다.

- **Auth**: 로그인/회원가입(이메일 인증 포함), 세션 처리, 권한 분기(일반/아티스트)
- **Discover**: 작품 피드/상세/검색, 정렬/토글/무한 스크롤 등 탐색 UX
- **Community**: 리뷰·댓글 CRUD, 댓글 카운트/타겟 기반 조회
- **Interaction**: 팔로우, 팬레터(작성/조회/아티스트 답변)
- **CollectBook**: QR 티켓 발급(아티스트) / 스캔 수집(유저) → 콜렉트북 리스트/상세
- **Personalization**: ‘너의 취향은’(취향 분석/MBTI), 리마인드 퀴즈
- **3D**: R3F/Three.js 기반 3D 전시관(Hall/Exhibit), Blender GLB 에셋 활용

---

## ✨ Key Features (FE Scope)

### 1) Auth & Role
- 로그인/회원가입 UI 및 **세션/토큰 흐름**
- `Guard` 기반 접근 제어
  - `guestOnly`: 로그인 상태면 접근 차단
  - `requireAuth`: 인증 필요
  - `requireRole="artist" | "general"`: 역할별 페이지 제한

### 2) Discover & Search
- 작품 피드/상세/검색 화면
- 정렬/토글/무한 스크롤 등 콘텐츠 소비 UX

### 3) Community
- 리뷰 CRUD (작성/조회/수정/삭제)
- 댓글 CRUD + 댓글 카운트/타겟 기반 조회

### 4) Interaction
- 팔로우 토글/목록
- 팬레터 작성/조회 + 아티스트 답변 플로우

### 5) CollectBook (QR Ticket)
- 아티스트: QR 티켓 발급/관리(라운지 내부 탭)
- 유저: QR 스캔 수집 → 콜렉트북 리스트/상세

### 6) Personalization
- ‘너의 취향은’ 플로우 + MBTI 결과 페이지 매핑
- 리마인드 퀴즈

### 7) 3D Exhibition
- `/hall`, `/exhibit`, `/exhibit/:artistId` 기반 3D 전시 경험
- GLB(Blender) 에셋 로딩 및 전시 패널 앵커 기반 작품 노출

---

## 🧩 Tech Stack
| Category | Stack |
|:---:|:---|
| Core | React, TypeScript |
| Build | Vite |
| Routing | React Router (createBrowserRouter) |
| State | Zustand |
| Network | Axios |
| 3D | React Three Fiber, Three.js (Drei) |
| UX | ScrollToTop(라우터 컨텍스트 내부 1회 렌더), AppLayout, Navbar 변형(navVariant) |

---

## 📂 Project Structure
> 실제 레포 구조에 맞춘 대표 예시

```bash
FE/src
├── app
│   ├── layouts                 # AppLayout
│   └── router                  # routes.tsx, Guard, guards.ts
├── components
│   ├── layout                  # Navbar 등 전역 UI
│   └── charts                  # Radar6 등 차트
├── features
│   ├── auth                    # store / api / model
│   ├── artworks                # api / model / ui
│   ├── reviews                 # api / model / ui
│   ├── tickets                 # api + resolveTicketMedia
│   ├── collectbook             # api / ui
│   └── fanLetter               # api / ui
├── pages
│   ├── home                    # Home / HomePC / HomeMobile
│   ├── hall                    # Hall
│   ├── exhibit                 # Exhibit
│   ├── search                  # Search
│   ├── guide                   # Guide
│   ├── feed                    # Feed
│   ├── auth                    # Login / Signup
│   ├── artworks                # ArtworkCreate/Edit/Detail
│   ├── reviews                 # ReviewCreate/Edit/Detail
│   ├── lounge                  # Lounge / LoungeIndex / user/artist
│   ├── yourpreference          # YourPreference / Select / Result
│   ├── profile                 # Profile + tabs
│   ├── fanLetter               # FanLetterCompose / MyFanLetters
│   ├── legal                   # PrivacyPolicy / TermsOfService
│   └── notfound                # NotFound
├── museum                      # three viewer scripts
└── shared
    ├── api                     # http wrapper
    └── utils                   # ScrollToTop 등 공통 유틸
````

---

## 🛠 Running Locally

### 1) Install

```bash
cd FE
npm install
```

### 2) Env

```bash
# FE/ 루트에 .env 생성
VITE_API_BASE_URL=http://localhost:8080/api/v1

# mock mode (optional)
VITE_USE_MOCK=false
```

### 3) Run

```bash
npm run dev
```

### 4) Build

```bash
npm run build
```

---

## 🔐 Environment Variables

| Key                 | Example                        | Description                         |
| ------------------- | ------------------------------ | ----------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | API 서버 base url                     |
| `VITE_USE_MOCK`     | `false`                        | mock 모드 토글(목업에서만 localStorage 사용 등) |

---

## 🧭 Routing Overview

### Layout & Global UX

* `RootLayout`에서 **ScrollToTop을 라우터 컨텍스트 내부에서 1회 렌더**
* `AppLayout`에서 전역 레이아웃/네비게이션 적용
* 일부 라우트는 `handle.navVariant`로 Navbar 변형에 사용

  * `/` → `home`
  * `/home/mobile` → `home-mobile`
  * `/exhibit`, `/exhibit/:artistId` → `exhibit`

### Public Routes

| Path                 | Page           | Notes                     |
| -------------------- | -------------- | ------------------------- |
| `/`                  | Home           | `navVariant: home`        |
| `/home/pc`           | HomePC         | `navVariant: home`        |
| `/home/mobile`       | HomeMobile     | `navVariant: home-mobile` |
| `/search`            | Search         |                           |
| `/guide`             | Guide          |                           |
| `/hall`              | Hall           |                           |
| `/main-hall`         | HomePC         | alias                     |
| `/exhibit`           | Exhibit        | `navVariant: exhibit`     |
| `/exhibit/:artistId` | Exhibit        | `navVariant: exhibit`     |
| `/feed`              | Feed           |                           |
| `/legal/privacy`     | PrivacyPolicy  |                           |
| `/legal/terms`       | TermsOfService |                           |
| `/privacy`           | redirect       | → `/legal/privacy`        |
| `/terms`             | redirect       | → `/legal/terms`          |

### Guest Only (로그인 상태면 차단)

> `Guard guestOnly redirectTo="/hall"`

| Path      | Page   |
| --------- | ------ |
| `/login`  | Login  |
| `/signup` | Signup |

### Preference Flow (비로그인 1회 제한 Loader 포함)

* `/preference`는 비로그인 상태에서 “1회만” 진입 허용
* mock 모드(`VITE_USE_MOCK=true`)면 `localStorage`, 아니면 `sessionStorage` 사용
* 이미 사용한 경우 `/login`으로 redirect

| Path                 | Page                 |
| -------------------- | -------------------- |
| `/preference`        | YourPreference       |
| `/preference/select` | YourPreferenceSelect |
| `/preference/result` | YourPreferenceResult |

### Protected Routes (requireAuth)

> `Guard requireAuth`

#### Artworks

| Path                        | Page          | Role                 |
| --------------------------- | ------------- | -------------------- |
| `/artworks/create`          | ArtworkCreate | artist               |
| `/artworks/new`             | redirect      | → `/artworks/create` |
| `/artworks/:artworkId`      | ArtworkDetail | all(auth)            |
| `/artworks/:artworkId/edit` | ArtworkEdit   | artist               |

#### Reviews

| Path                      | Page         | Role                |
| ------------------------- | ------------ | ------------------- |
| `/reviews/create`         | ReviewCreate | general             |
| `/reviews/new`            | redirect     | → `/reviews/create` |
| `/reviews/:reviewId`      | ReviewDetail | all(auth)           |
| `/reviews/:reviewId/edit` | ReviewEdit   | general             |

#### Members(Profile)

| Path                              | Page          | Notes                |
| --------------------------------- | ------------- | -------------------- |
| `/members`                        | redirect      | → `/members/me`      |
| `/members/:memberUuid`            | Profile       | `memberUuid="me"` 허용 |
| `/members/:memberUuid/feed`       | FeedTab       | default              |
| `/members/:memberUuid/collection` | CollectionTab |                      |
| `/members/:memberUuid/portfolio`  | PortfolioTab  |                      |
| `/members/:memberUuid/fanletters` | FanLetterTab  |                      |

#### Analysis / RemindQuiz (Canonical)

> 현재 라우팅 상 경로가 대문자(`Analysis`, `RemindQuiz`)로 존재

| Path          | Page       |
| ------------- | ---------- |
| `/Analysis`   | Analysis   |
| `/RemindQuiz` | RemindQuiz |

#### Tickets / CollectBook / Fanletters (Canonical)

* Tickets는 “페이지 따로 뜨는 문제”를 막기 위해 lounge로 redirect 포함

| Path                 | Page              | Role                            |
| -------------------- | ----------------- | ------------------------------- |
| `/tickets`           | redirect          | artist → `/lounge/ticket`       |
| `/tickets/issue`     | redirect          | artist → `/lounge/ticket/issue` |
| `/tickets/scan`      | CollectBookScan   | general                         |
| `/tickets/portfolio` | Portfolio         | artist                          |
| `/collectbook`       | CollectBook       | general                         |
| `/collectbook/:id`   | CollectBookDetail | general                         |
| `/fanletters`        | FanLetter         | artist                          |

### Lounge (내부 렌더링 / role 분기)

`/lounge`는 role에 따라 탭이 분기되며, 내부 라우트로 화면이 렌더링됩니다.

#### general

| Path                       | Page              |
| -------------------------- | ----------------- |
| `/lounge/collectbook`      | CollectBook       |
| `/lounge/collectbook/scan` | CollectBookScan   |
| `/lounge/collectbook/:id`  | CollectBookDetail |
| `/lounge/Analysis`         | Analysis          |
| `/lounge/RemindQuiz`       | RemindQuiz        |
| `/lounge/my-fanletters`    | MyFanLetters      |

#### artist

| Path                   | Page      | Notes                    |
| ---------------------- | --------- | ------------------------ |
| `/lounge/ticket`       | QrEntry   |                          |
| `/lounge/ticket/issue` | TicketQr  | ✅ ticket 아래 issue 중첩     |
| `/lounge/qr/issue`     | redirect  | → `/lounge/ticket/issue` |
| `/lounge/portfolio`    | Portfolio |                          |
| `/lounge/fan-letter`   | FanLetter |                          |

#### fanletter compose (general)

| Path                             | Page             |
| -------------------------------- | ---------------- |
| `/lounge/fanletters/compose/:id` | FanLetterCompose |

### Legacy Redirects

* `/profile/:id` → `/members/:id` (또는 `/members/me`)
* `/posts/*`는 삭제되었고 기존 링크는 redirect 처리

  * `/posts/create` → `/members/me`
  * `/posts/create/artist` → `/artworks/create`
  * `/posts/create/user` → `/reviews/create`
  * `/posts/:id` → `/feed`

---

## 📐 Frontend Conventions

### 1) Guard 사용 규칙

* 공개 페이지: Public 라우트에 추가
* 로그인/회원가입: `guestOnly`
* 로그인 필수: `requireAuth`
* 역할 제한: `requireRole="artist"` 또는 `requireRole="general"`

### 2) Navbar 변형(navVariant)

* 라우트 `handle.navVariant`로 Navbar 스타일/노출 변형을 제어합니다.
* `home` / `home-mobile` / `exhibit` 등을 기준으로 UI를 분기합니다.

### 3) Preference Once Loader

* 비로그인에서 `/preference` 진입을 1회로 제한합니다.
* mock 모드: localStorage / real 모드: sessionStorage(탭 단위)

### 4) API/Type 안정성

* Axios 공통 래퍼를 통해 `/api/v1` 호출을 통일합니다.
* 응답 DTO가 불안정한 경우 mapper/type-guard로 안전 파싱합니다.

### 5) Media URL

* 이미지 경로는 `resolveMediaUrl` 계열 유틸로 정규화하여 환경(dev/prod), 절대/상대 경로 혼재를 흡수합니다.

---

## 🧯 Troubleshooting

### 이미지가 깨질 때

* 응답 imageUrl이 절대/상대/경로 prefix가 섞여 들어오는지 확인
* `resolveMediaUrl` 적용 여부 확인
* dev 환경에서 프록시/BASE_URL 영향 여부 확인

### 라운지에서 티켓이 새 페이지로 뜰 때

* `/tickets`, `/tickets/issue`는 canonical로 남겨두고 lounge로 redirect 처리 중
* 실제 사용 경로는 `/lounge/ticket`, `/lounge/ticket/issue` 사용

### 권한 페이지 접근이 막힐 때

* auth store의 role 값이 `"general" | "artist"`인지 확인
* Guard 조건(`requireRole`)과 라우트 위치 확인

---

## 🤝 Contribution Strategy

* Branch: `main`(배포) → `develop`(개발) → `feat/기능명`
* Commit: Conventional Commits

  * `feat`: 기능 추가
  * `fix`: 버그 수정
  * `style`: 스타일 변경(로직 변경 없음)
  * `refactor`: 리팩토링
  * `chore`: 설정/빌드/패키지

<div align="center">
ARNNECT Frontend README | ⓒ 2026
</div>
```

