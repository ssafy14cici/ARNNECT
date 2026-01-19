
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
```

---

## 5) 프로젝트 구조(뼈대) / 더 추가 예정

```txt
FE/
  public/
  src/
    app/
      providers.tsx
    router/
      index.tsx
      routes.tsx
      guards.ts
    layouts/
      RootLayout.tsx
      AuthLayout.tsx
    pages/
      home/Home.tsx
      artistGo/ArtistGo.tsx
      search/Search.tsx
      feed/Feed.tsx
      lounge/Lounge.tsx
      profile/Profile.tsx
      artwork/ArtworkDetail.tsx
      auth/Login.tsx
      auth/Signup.tsx
      menu/Menu.tsx
      notfound/NotFound.tsx
    components/
      menu/
        FullScreenMenu.tsx
        MenuButton.tsx
      common/
        Guard.tsx
        Loading.tsx
        Empty.tsx
      feed/
        FeedList.tsx
        FeedCard.tsx
        RecommendCard.tsx
      search/
        SearchTabs.tsx
        SearchSort.tsx
        SearchResultList.tsx
      artwork/
        CommentThread.tsx
        SimilarSection.tsx
    stores/
      authStore.ts
      uiStore.ts
    api/
      client.ts
      endpoints.ts
    types/
      models.ts
      auth.ts
      api.ts
    styles/
      global.css
      tokens.css
      layout.css
```

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


