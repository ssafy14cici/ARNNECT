
# FE (Vite + React + TypeScript)

E107 SSATY 프론트엔드 프로젝트 기본 뼈대(라우팅/레이아웃/가드/전체화면 메뉴) 및 협업 규칙
---

## 1) 기술 스택
- Vite + React + TypeScript
- React Router DOM (라우팅)
- Zustand (상태 관리)
- ESLint (기본 린트)

---

## 2) 실행 환경
- Node.js 18+ 권장
- npm 사용 (package-lock.json 커밋)

---

## 3) 설치 및 실행

### 3-1. 의존성 설치
```bash
cd FE
npm install
````

### 3-2. 개발 서버 실행

```bash
npm run dev
```

* 기본 접속: [http://localhost:5173](http://localhost:5173)

### 3-3. 빌드

```bash
npm run build
```

### 3-4. 빌드 결과 미리보기

```bash
npm run preview
```

---

## 4) 이번 기본 세팅(추가 설치된 패키지)

라우팅/상태관리 세팅을 위해 아래 패키지를 설치합니다.

```bash
npm i react-router-dom zustand
npm i gsap @studio-freight/lenis
npm i react-qr-code @zxing/browser


```

---

## 5) 프로젝트 구조(뼈대) / 더 추가 예정


### Root

```
FE/
 ├─ public/
 ├─ src/
 ├─ index.html
 ├─ vite.config.ts
 ├─ tsconfig*.json
 ├─ eslint.config.js
 └─ Dockerfile
```

* `public/` : 빌드 시 정적 자원 (favicon, 이미지 등)

  * `public/art/` : 전시/작품 관련 정적 리소스
  * `arnnect_logo_ver1.png`, `NotFound.png`, `vite.svg`

---

### `src/` Overview

```
src/
 ├─ api/
 ├─ app/
 ├─ assets/
 ├─ components/
 ├─ data/
 ├─ hooks/
 ├─ layouts/
 ├─ mocks/
 ├─ pages/
 ├─ router/
 ├─ stores/
 ├─ styles/
 ├─ types/
 ├─ utils/
 ├─ App.tsx
 └─ main.tsx
```

---

### `src/api/` — API layer (HTTP 요청 모듈)

```
src/api/
 ├─ http.ts
 ├─ auth.ts
 ├─ feed.ts
 ├─ lounge.ts
 ├─ fanLetter.ts
 └─ tickets.ts
```

* `http.ts` : axios 인스턴스/인터셉터/공통 에러 처리의 엔트리 포인트(권장)
* 각 도메인별 API 파일:

  * `auth.ts` : 로그인/회원가입/토큰 관련
  * `feed.ts` : 메인/피드
  * `lounge.ts` : 라운지(마이페이지 성격 기능)
  * `fanLetter.ts` : 팬레터
  * `tickets.ts` : 티켓/QR

**규칙**

* API 함수는 “UI 로직” 없이 **순수 요청/응답 변환만** 담당
* 요청/응답 타입은 `src/types/`에서 import

---

### `src/app/` — App-level providers

```
src/app/
 └─ {providers.tsx}
```

* 전역 Provider(예: Router/QueryClient/Theme 등)를 한 곳에서 관리

---

### `src/assets/` — Bundled assets

```
src/assets/
 ├─ basicprofile.png
 └─ react.svg
```

* 번들에 포함되는 이미지/아이콘 보관 (`import ... from` 형태로 사용)

---

### `src/components/` — Reusable UI components

도메인/기능별로 재사용 가능한 컴포넌트를 모아둔다.

#### `components/artwork/` (댓글 UI)

```
components/artwork/
 ├─ CommentForm.tsx
 ├─ CommentItem.tsx
 ├─ CommentList.tsx
 └─ ReplyList.tsx
```

#### `components/feed/` (피드 카드)

```
components/feed/
 ├─ FeedCard.tsx
 └─ FeedCard.css
```

#### `components/common/` (공통)

```
components/common/
 └─ Guard.tsx
```

* `Guard.tsx` : 인증/권한 라우팅 가드

#### `components/charts/` (차트)

```
components/charts/
 └─ Radar6.tsx
```

#### `components/legal/` (약관/정책)

```
components/legal/
 ├─ PrivacyPolicyContent.tsx
 └─ TermsOfServiceContent.tsx
```

#### `components/lounge/` (라운지 재사용 컴포넌트)

```
components/lounge/
 ├─ TicketCardModern.tsx
 └─ ticketCardModern.css
```

#### `components/main/` (홈 섹션 구성요소)

```
components/main/
 ├─ Hero.tsx
 ├─ AboutSection.tsx
 ├─ ShowcaseStage.tsx
 ├─ ScrollIndicator.tsx
 └─ HerRingLoader.tsx
```

**규칙**

* 페이지에 종속되지 않는 UI는 무조건 `components/`로 올린다.
* CSS는 해당 컴포넌트 옆에 붙이거나(`*.css`), 전역 스타일은 `styles/`로.

---

### `src/data/` — Local dummy/mock data

```
src/data/
 ├─ artworks.ts
 ├─ users.ts
 ├─ mockFeeds.ts
 └─ mockPosts.ts
```

* 백엔드 미연동/개발 테스트용 데이터

---

### `src/hooks/` — Custom hooks

```
src/hooks/
 └─ useReveal.js
```

---

### `src/layouts/` — Layout components

```
src/layouts/
 ├─ AppLayout.tsx
 ├─ Navbar.tsx
 ├─ Footer.tsx
 └─ ...
```

* 페이지 골격(네비/푸터/공통 프레임)을 담당

---

### `src/mocks/` — Mock auth & utilities

```
src/mocks/
 └─ authMock.ts
```

---

### `src/pages/` — Route-level pages (화면 단위)

라우트와 1:1로 매핑되는 “페이지” 컴포넌트들.

#### `pages/auth/`

```
pages/auth/
 ├─ Login.tsx
 ├─ Signup.tsx
 ├─ UserSignup.tsx
 ├─ ArtistSignup.tsx
 ├─ Recover.tsx
 ├─ auth.css
 ├─ components/
 └─ utils/
     ├─ validation.ts
     └─ emailDupCheck.ts
```

#### `pages/feed/`

```
pages/feed/
 ├─ Feed.tsx
 └─ feed.css
```

#### `pages/lounge/` (라운지/마이페이지 성격)

```
pages/lounge/
 ├─ Lounge.tsx
 ├─ LoungeIndex.tsx
 ├─ LoungeLayout.tsx
 ├─ lounge.css
 ├─ artist/
 │   ├─ Portfolio.tsx
 │   ├─ FanLetter.tsx
 │   ├─ TicketQr.tsx
 │   └─ qr/
 │       └─ QrEntry.tsx
 └─ user/
     ├─ CollectBook.tsx
     ├─ CollectBookDetail.tsx
     ├─ CollectBookScan.tsx
     ├─ Quiz.tsx
     └─ Taste.tsx
```

#### `pages/artwork/`

```
pages/artwork/
 ├─ ArtworkDetail.tsx
 ├─ ArtworkDetailView.tsx
 ├─ artworkDetail.helpers.ts
 └─ artworkDetail.css
```

#### `pages/profile/`

```
pages/profile/
 ├─ Profile.tsx
 ├─ profile.css
 ├─ types.ts
 ├─ api.ts
 ├─ components/
 │   ├─ ProfileHeader.tsx
 │   ├─ ArtistInfo.tsx
 │   └─ UserInfo.tsx
 └─ tabs/
     ├─ FeedTab.tsx
     ├─ CollectionTab.tsx
     ├─ PortfolioTab.tsx
     └─ (PortfolioTab 2.tsx)   // 중복 파일 정리 필요
```

#### `pages/search/`

```
pages/search/
 ├─ Search.tsx
 └─ search.css
```

#### `pages/posts/`

```
pages/posts/
 ├─ PostCreate.tsx
 ├─ PostCreateRedirect.tsx
 ├─ PostDetail.tsx
 └─ postCreate.css
```

#### `pages/notfound/`

```
pages/notfound/
 └─ NotFound.tsx
```

**규칙**

* “라우트 단위 화면”은 `pages/`에만 둔다.
* 페이지에서만 쓰이는 조각 UI는 `pages/**/components`에 둔다.
* 페이지 로직/뷰 분리는 이미 `ArtworkDetail.tsx + ArtworkDetailView.tsx` 패턴으로 적용됨.

---

### `src/router/` — Routing

```
src/router/
 ├─ index.tsx
 ├─ routes.tsx
 └─ guards.ts
```

* `routes.tsx`: RouteObject 구성
* `guards.ts`: Role 타입 및 가드 정책(현재 Role: `"general" | "artist"`)

---

### `src/stores/` — State management

```
src/stores/
 ├─ authStore.ts
 └─ uiStore.ts
```

---

### `src/styles/` — Global styles

```
src/styles/
 ├─ global.css
 ├─ theme.css
 ├─ navbar.css
 ├─ footer.css
 ├─ home.css
 ├─ hero.css
 ├─ legal.css
 └─ notfound.css
```

* 레이아웃/공통 UI/테마 관련 전역 스타일

---

### `src/types/` — Type definitions

```
src/types/
 ├─ auth.ts
 ├─ collectbook.ts
 ├─ fanLetter.ts
 ├─ models.ts
 └─ vendor.d.ts
```

* API request/response + 도메인 모델 타입 정의

---

### `src/utils/` — Utilities

```
src/utils/
 ├─ collectbookStorage.ts
 ├─ issuedTicketsStorage.ts
 ├─ ticketMockStorage.ts
 ├─ localPosts.ts
 ├─ qrDownload.ts
 └─ networkProgress.ts
```

* localStorage 기반 임시 저장/목업 로직이 여기로 모여 있음


---

## 6) Git 협업 규칙

### 6-1. 브랜치 구조 (3단계)

* `master`: 최종 통합 브랜치 (**직접 작업 금지**)
* 역할 브랜치: `FE`, `BE`, `AI`, `CI-CD`, `STUDY`
* 기능 브랜치: 각자 실제 개발 브랜치 (완료 후 역할 브랜치로 MR)

### 6-2. 브랜치 네이밍 (⚠️ FE/feat 충돌 방지 포함)

역할 브랜치가 이미 `FE`로 존재하므로, 기능 브랜치는 `FE/feat/...` 형태를 사용하지 않습니다.

✅ 권장

* `FE-feat/<feature>`
* `FE-fix/<bug>`
* `FE-refactor/<target>`

예시

* `FE-feat/scaffold-router-menu`
* `FE-feat/search-tabs-sort`
* `FE-fix/login-redirect`

❌ 금지

* `FE/feat/...` (Git ref 충돌 발생)
* `[FE]/feat/...` (특수문자 → CI/URL/스크립트 문제 가능)

### 6-3. 작업 흐름 (기능 브랜치 → FE → master)

1. 기능 브랜치 생성

```bash
git switch FE
git pull origin FE
git switch -c FE-feat/<feature>
```

2. 커밋 & 푸시

```bash
git add FE
git commit -m "FEAT: (한글 제목)

- 변경 내용 1
- 변경 내용 2"
git push -u origin FE-feat/<feature>
```

3. GitLab Merge Request

* `FE-feat/<feature>` → `FE` 로 MR
* FE에서 통합/테스트 후, **리더가** `FE` → `master` 로 MR

---

## 7) 커밋 메시지 컨벤션

### 7-1. 커밋 타입(대문자)

| 타입                 | 의미                             |
| ------------------ | ------------------------------ |
| `FEAT`             | 새로운 기능 추가                      |
| `FIX`              | 버그 수정                          |
| `DOCS`             | 문서 수정                          |
| `STYLE`            | formatting/세미콜론 누락 등(로직 변경 없음) |
| `REFACTOR`         | 리팩토링                           |
| `TEST`             | 테스트 코드                         |
| `CHORE`            | 패키지/설정/.gitignore 등 기타         |
| `DESIGN`           | CSS 등 UI 디자인 변경                |
| `COMMENT`          | 주석 추가/변경                       |
| `RENAME`           | 파일/폴더명 변경                      |
| `REMOVE`           | 파일 삭제                          |
| `!BREAKING CHANGE` | 큰 API 변경                       |
| `!HOTFIX`          | 치명 버그 긴급 수정                    |

### 7-2. 작성 규칙

* 제목/본문은 **빈 줄로 분리**
* 제목은 **한글**, 50자 이내, 끝에 `.` 금지
* 본문은 “무엇 & 왜” 중심, 글머리 기호 사용

### 7-3. 예시

```bash
git commit -m "FEAT: 프론트 초기 뼈대 구조 추가

- Vite+TS 기반 폴더 구조 생성
- 라우터/레이아웃/가드 기본 연결
- 전체화면 메뉴 기본 틀 추가"
```

---

## 8) 주의사항

* `node_modules/`, `dist/`, `.env*` 는 커밋하지 않습니다. (`.gitignore` 적용)
* Windows 환경에서 `LF will be replaced by CRLF` 경고는 일반적으로 무시해도 됩니다(동작 문제 없음).

```


