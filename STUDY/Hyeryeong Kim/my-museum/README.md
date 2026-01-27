1. 프로젝트 세팅 (터미널)
먼저 프로젝트를 생성하고 필요한 라이브러리를 모두 설치합니다.

Bash

# 1. 프로젝트 생성 (TypeScript 선택)
npm create vite@latest my-museum -- --template react-ts
cd my-museum

# 2. 핵심 라이브러리 설치
# three: 3D 엔진
# @react-three/fiber: 리액트용 Three.js
# @react-three/drei: 유용한 컴포넌트 모음 (컨트롤, 이미지 등)
# zustand: 클릭 상태 관리 (3D에서 클릭 -> 2D 팝업 열기)
npm install three @types/three @react-three/fiber @react-three/drei zustand
npm install camera-controls gsap
npm install @react-three/postprocessing


2. 파일 구조 (File Structure)
src 폴더 안을 아래와 같이 구성하시면 됩니다. 제가 각 파일의 코드를 다 드릴 겁니다.



src/
├── assets/          (이미지 파일들은 여기에 넣으세요)
├── components/
│   ├── Player.tsx   (1인칭 이동 컨트롤 - WASD + 마우스)
│   ├── Frame.tsx    (전시물 액자 컴포넌트)
│   ├── Gallery.tsx  (전시장 벽과 공간 배치)
│   └── Overlay.tsx  (클릭하면 뜨는 2D 상세 팝업)
├── store.ts         (상태 관리 - "지금 어떤 그림이 열려있나?")
├── App.tsx          (메인 조립)
├── index.css        (스타일)
└── main.tsx         (기본 진입점)
