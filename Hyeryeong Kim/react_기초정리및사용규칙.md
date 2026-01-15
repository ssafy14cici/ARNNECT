# React 시작 방법

## 1) Node / npm  설치

설치 끝나면 **CMD 창 새로 열고**

```bash
node -v
npm -v

```

### 2) React(JavaScript) 프론트 폴더(frontend) 만들기

```bash
mkdir myproject
cd myproject

npm create vite@latest frontend -- --template react
cd frontend

npm install
npm run dev

```

## 3) 내부 폴더 구조 “명령어로” 싹 만들기

### ✅ Git Bash / WSL / Mac / Linux

```bash
cd frontend
mkdir -p src/{api,assets,components,constants,hooks,layouts,pages,router,stores,styles,utils}
mkdir -p src/components/{common,ui,forms}
mkdir -p src/pages/{home,auth,notfound}

touch src/api/http.js \
      src/router/index.jsx \
      src/styles/global.css \
      src/constants/index.js

```

### ✅ Windows PowerShell

```powershell
cd frontend
mkdir src\api,src\assets,src\components,src\constants,src\hooks,src\layouts,src\pages,src\router,src\stores,src\styles,src\utils
mkdir src\components\common,src\components\ui,src\components\forms
mkdir src\pages\home,src\pages\auth,src\pages\notfound

ni src\api\http.js -ItemType File
ni src\router\index.jsx -ItemType File
ni src\styles\global.css -ItemType File
ni src\constants\index.js -ItemType File

```

---

## 4) 라우터 설치 명령어

### 라우팅(React Router)

```bash
npm i react-router
```

### HTTP

```bash
npm i axios
```

### 서버상태/캐싱(React Query)

```bash
npm i @tanstack/react-query
```

### 전역 상태


# FRONTEND/src 폴더 사용 규칙 

## 0) 판단법 (어디에 둘지 바로 결정)

1. **URL(라우트) 하나를 대표하는 화면이다** → `pages/`
2. **여러 화면에서 재사용된다** → `components/`
3. **서버 통신이다** → `api/`
4. **전역으로 공유되는 상태다(로그인/테마/유저)** → `stores/`
5. **값이 고정(문자열/키/옵션/경로)** → `constants/`
6. **순수 함수(포맷/검증/로컬스토리지 래퍼)** → `utils/`
7. **공통 틀(헤더/사이드바/Outlet)** → `layouts/`
8. **라우트 정의/가드** → `router/`
9. **전역 css/변수** → `styles/`
10. **이미지/아이콘/폰트** → `assets/`

---

## 1) pages vs components (제일 헷갈리는 구간)

### ✅ pages에 두는 것 (화면)

- 주소(`/login`, `/`, `/movies/:id`)로 접근했을 때 뜨는 “페이지”
- 라우터에 등록되는 컴포넌트

**예시**

- `pages/auth/LoginPage.jsx`
- `pages/home/HomePage.jsx`

### ✅ components에 두는 것 (조각)

- 화면이 아니라, 화면 안에서 조립되는 “부품”
- 재사용 가능성이 높음

**예시**

- `components/common/Button.jsx`
- `components/ui/Card.jsx`
- `components/forms/LoginForm.jsx`

---

## 2) “페이지 전용 컴포넌트”는 어디에 두나?

이게 팀에서 진짜 많이 싸움 나는 지점이라 룰을 고정하자.

### ✅ 룰(추천)

- **처음엔 pages 안에 둔다**
- **두 군데 이상에서 쓰이기 시작하면 components로 승격한다**

### 예시 구조(권장)

```
pages/home/
  HomePage.jsx
  components/
    PostList.jsx        # 홈에서만 쓰면 여기

```

✅ “승격” 기준

- 다른 페이지에서도 쓰게 됐다 → `components/`로 이동
- 디자인 시스템처럼 공용 UI가 됐다 → `components/ui` or `components/common`

---

## 3) components/common vs components/ui vs components/forms 차이

여기도 헷갈림 많음 → 정의를 딱 잡자.

### `components/common/` (기능성 + 많이 씀)

- Button, Modal, Input, Spinner, Pagination, Toast
- “프로젝트 어디서든 쓰인다”

### `components/ui/` (모양/레이아웃 중심)

- Card, Badge, Divider, Section, EmptyState
- “디자인적으로 재사용되는 틀”

### `components/forms/` (입력 + 제출 단위)

- LoginForm, SignupForm, ProfileForm, SearchForm
- “input 여러 개 + submit 로직 묶음”

✅ 폼이 “그 페이지에서만 쓰면” pages 아래로 두는 것도 OK (팀 합의)

---

## 4) api vs utils (두 번째로 많이 헷갈리는 구간)

### ✅ api는 “서버 통신”

- axios 인스턴스 설정
- 서버 요청 함수들

**예시**

- `api/http.js` (baseURL, interceptors)
- `api/auth.api.js` (login, signup)
- `api/movie.api.js` (fetchMovies, fetchDetail)

### ✅ utils는 “순수 로직/헬퍼”

- 포맷팅, 검증, 로컬스토리지 래퍼
- 서버 호출 ❌
- 전역 상태 변경 ❌

**예시**

- `utils/format.js` (날짜/문자 자르기)
- `utils/validators.js` (email/password 검사)
- `utils/storage.js` (localStorage get/set)

📌 절대 규칙

- **API 호출은 무조건 api로**
- **components/pages에서 fetch/axios 직접 호출 금지**(api 함수로 감싸기)

---

## 5) stores는 “언제 써야 하나?”

전역 상태를 막 쓰면 코드가 더 복잡해짐.

### ✅ stores로 빼는 기준

- 여러 페이지에서 공유됨
- 새로고침/재방문 시 유지해야 함(토큰/테마)
- 상단바/사이드바처럼 여러 곳에 영향을 줌

**예시**

- auth(토큰/유저)
- theme(다크/라이트)
- global UI(toast, modal)

### ❌ stores로 빼면 안 되는 것

- “그 페이지 안에서만 쓰는 입력값”
- “그 페이지에서만 쓰는 fetch 결과”

→ 이런 건 해당 페이지의 `useState`로 충분

---

## 6) constants는 “뭐를 넣어야 하는가?”

여기도 기준 잡아줘야 함.

### ✅ constants에 두는 것

- ROUTES: `/login`, `/`
- STORAGE_KEYS: `access_token`
- 옵션 리스트: GENRES, THEMES
- 정규식/에러 메시지: REGEX, ERRORS

### ❌ constants에 두면 안 되는 것

- API 호출 함수(그건 api)
- 포맷 함수(그건 utils)
- 상태 값(그건 stores)

---

## 7) layouts는 “어디까지가 레이아웃?”

- 공통 틀: header/footer/sidebar + `<Outlet />`
- 페이지 내용은 절대 layouts에 넣지 않기

✅ 예시

- `RootLayout.jsx`: 상단바 + Outlet
- `AuthLayout.jsx`: 로그인/회원가입 공통 레이아웃

---

## 8) router는 “규칙이 있어야 안 꼬임”

### ✅ router에는 딱 2가지만

- 라우트 정의
- (선택) route guard(로그인 필요 페이지 제한)

**팁**

- 라우트 경로는 `constants/ROUTES`에서만 가져오기(하드코딩 금지)

---

## 9) styles는 “전역 vs 컴포넌트 스타일” 룰

### ✅ 전역 styles (`styles/`)

- reset, 공통 변수, 공통 유틸 클래스(예: `.container`, `.muted`)
- 페이지 전체에 영향을 주는 것만

### ✅ 컴포넌트 전용 스타일

팀 합의로 둘 중 하나:

- A) 컴포넌트 파일 안에서 className + global.css에 작성(단순 프로젝트)
- B) CSS Module로 컴포넌트 옆에 `Button.module.css` (규모 커질수록 추천)

---

## 10) “어디에 둘지 모르겠을 때” 최종 룰

1. **일단 pages에 둔다(해당 기능이 속한 화면 폴더)**
2. 재사용 2회 이상 생기면 `components`/`shared`로 승격
3. 서버 통신이면 무조건 api로 이동

---

# ✅ 팀 공통 체크리스트 (PR 올리기 전)

- [ ]  페이지에서 axios/fetch 직접 호출 안 했는가? → api로 뺐는가
- [ ]  하드코딩된 라우트/스토리지키 없나? → constants 사용했나
- [ ]  페이지에서만 쓰는 컴포넌트를 components에 무리하게 넣지 않았나?
- [ ]  전역 상태(store) 남발하지 않았나? (페이지 내부 상태는 useState)
- [ ]  레이아웃에 페이지 로직이 섞이지 않았나?

---

```bash
npm i zustand
```

### 폼 + 검증