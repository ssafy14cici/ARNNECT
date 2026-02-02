## 📁 프로젝트 구조 (Project Structure)

```text
src/
├── main.ts              # 엔트리포인트 (Intro → Hall → Exhibit 상태 전환 관리)
├── style.css            # 전역 스타일
├── intro/               # 1단계: 인트로 시퀀스 모듈
│   ├── mountIntro.ts    # 인트로 씬 초기화 및 마운트
│   ├── ui.ts            # 인트로 관련 UI 요소
│   ├── enterSequence.ts # 입장 애니메이션 시퀀스
│   ├── focusBox.ts      # 화면 중앙 포커스 효과
│   ├── hdri.ts          # 환경광(HDRI) 설정
│   ├── safeArea.ts      # 화면 안전 영역 계산
│   ├── waterWave.ts     # 수면 파동 효과
│   └── intro.css        # 인트로 전용 스타일
└── viewer/              # 2단계: 내부 뷰어 및 전시 시스템
    ├── mainHallFree.ts  # 메인 홀 (웨이포인트 이동 + FPS 자유 시점)
    ├── exhibitRoom.ts   # 개별 전시실 (전용 렌더러 및 이동 로직)
    ├── exhibitPoints.ts # 전시실 내 주요 관람 시점 데이터
    ├── panelArt.ts      # 작품 액자 및 패널 생성 시스템
    ├── waypoints.ts     # 메인 홀 이동 지점(Waypoint) 정의
    ├── navigator.ts     # 웨이포인트 네비게이션 로직
    ├── lighting.ts      # 내부 씬 조명 설정
    ├── exitOverlay.ts   # 나가기/복귀 UI 오버레이
    ├── createViewer.ts  # Viewer 객체 타입 및 공통 인터페이스
    └── intro.ts         # Intro 모듈 Re-export (외부 참조용)

public/
├── fonts/               # 폰트 자산 (.fixed.ttf)
├── models/              # 3D 모델 자산 (GLB 포맷)
└── textures/            # 텍스처 및 환경 맵 (HDRI 등)