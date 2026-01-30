# React Scroll 기반 3D Room(전시관) 구현 개념 정리

> 목표: 스크롤을 “진행도(progress)”로 변환해 **카메라 이동**과 **작품 인터랙션(다가오기/조명)**을 연결하는 전시관 UI를 구현한다.

---

## 1. 전체 구조 한눈에 보기

스크롤 기반 3D 전시관 구현은 보통 아래 2개의 시스템으로 나뉜다.

* **Scroll System**: 스크롤 → progress(0~1) → 애니메이션/카메라 제어
* **3D Room System**: Room(벽/바닥/천장) + Frame(작품) + Light(핀조명) + Interaction(거리 기반 활성화)

```
User Scroll
   ↓
(scrollY → progress)
   ↓
Camera Move (x/y/z)
   ↓
Distance Check (camera ↔ frames)
   ↓
Active Frame → forward(Z) + spotlight on
```

---

## 2. Scroll System 개념

### 2.1 스크롤은 “이벤트”가 아니라 “진행도(progress)”

* 스크롤Y(px)는 그대로 쓰기 불편해서 보통 `0~1`로 정규화한다.
* 이 progress 값을 기반으로 **카메라, 오브젝트, 조명**을 컨트롤한다.

**핵심 수식(개념)**

* `progress = clamp(scrollY / scrollRange, 0, 1)`

> clamp는 0~1 범위를 넘지 않게 잘라주는 역할

---

### 2.2 Smooth Scroll(부드러운 스크롤) 도입 이유

브라우저 기본 스크롤은 끊김이 있어서 “공간 이동” 느낌이 약해질 수 있다.

* **Lenis** 같은 라이브러리로 스크롤 값을 부드럽게 만들고
* 그 값을 애니메이션 시스템이 읽는 구조가 흔하다.

**구조**

* 브라우저 스크롤 → Lenis가 완화 → “부드러운 scroll 값” 생성 → 카메라/애니메이션 적용

---

### 2.3 ScrollTrigger vs IntersectionObserver

둘 다 “스크롤 기반 인터랙션”에 쓰이지만 역할이 다르다.

#### ✅ GSAP ScrollTrigger

* 스크롤과 애니메이션 타임라인을 강하게 연결 (스크럽/핀/구간)
* “카메라 이동”, “섹션 이동” 같은 큰 흐름에 적합

#### ✅ IntersectionObserver

* 특정 요소가 뷰포트에 들어왔는지 감지
* “작품이 특정 구간에 들어오면 강조” 같은 트리거에 적합

> 전시관 UX에서는
> **큰 이동(카메라)** = ScrollTrigger / progress
> **작품 강조 on/off** = IntersectionObserver 또는 거리(distance) 기반
> 조합이 많이 쓰임.

---

### 2.4 리액트에서 추천 구조(훅 분리)

스크롤 로직은 컴포넌트에 박아 넣기보다 **훅으로 분리**하는 게 유지보수에 좋다.

* `useSmoothScroll()` : Lenis 초기화 + requestAnimationFrame 루프
* `useScrollProgress()` : scrollY → progress 변환
* `useSectionTriggers()` : 구간 진입/이탈 트리거 관리

---

## 3. 3D Room System 개념

### 3.1 3D 룸 구현 방식 2가지

#### 1) CSS 3D Transform (가짜 3D)

* 장점: 가볍고 빠르며 HTML/CSS 기반
* 단점: 광원/재질/깊이감(진짜 공간 느낌)에 한계

구성 개념:

* 컨테이너: `perspective`
* 룸: `transform-style: preserve-3d`
* 벽(plane)들을 `rotate + translateZ`로 배치

---

#### 2) Three.js / React Three Fiber (진짜 3D)

* 장점: 핀조명, 재질, 깊이감 등 “전시관 느낌”이 훨씬 잘 남
* 단점: 러닝커브 + 성능 고려 필요

구성 개념:

* Room = box(내부만 보이게) 또는 plane 6개
* Frame(작품) = plane + texture(material)
* Light = spotLight(핀조명), ambientLight(약하게)
* Camera = scroll progress로 position 이동

---

### 3.2 카메라 이동: progress → 카메라 좌표 매핑

전시관의 “이동감”은 거의 카메라가 만든다.

예: “휠 내리면 오른쪽으로 걸어간다”

* `camera.x = lerp(startX, endX, progress)`

카메라가 항상 벽을 보도록:

* `camera.lookAt(target)` 또는 controls 사용

---

### 3.3 작품 자동 강조: “거리(distance) 기반 활성화”

전시관 인터랙션 핵심(작품이 앞으로 쓱 + 조명 추가)은 보통 거리 기반으로 만든다.

**개념 흐름**

1. 카메라 위치와 작품 위치 거리 계산
2. 일정 임계값(threshold) 이내면 “활성화”
3. 활성화된 작품:

   * `z`를 앞으로 이동(벽에서 튀어나오기)
   * spotLight intensity 증가
4. 지나가면 원복

> 이 방식은 스크롤뿐 아니라 키보드 이동, 터치 이동에도 자연스럽게 적용 가능하다.

---

### 3.4 “상태(state)”보다 “연속 애니메이션 값”이 자연스럽다

작품의 위치/조명 같은 건 React state로 순간 변경하면 튀거나 딱딱해질 수 있다.

추천:

* R3F: `useFrame()`에서 매 프레임 `lerp`로 부드럽게 수렴
* GSAP: `gsap.to(mesh.position, { z: ... })`로 자연스럽게 전환

---

## 4. 추천 아키텍처 (전시관 컨셉에 맞는 정석)

### 4.1 전체 흐름

1. **Lenis**로 smooth scroll
2. scroll → progress 계산
3. progress로 카메라 이동
4. 매 프레임 distance 체크 → active 작품 선정
5. active 작품: 앞으로 이동 + 핀조명 강화
6. 클릭 시 디테일 페이지 라우팅

---

## 5. 선택 가이드

* **빠르게 비슷한 느낌**만 내고 싶다 → **CSS 3D Transform**
* **실제 전시관 공간감 + 핀조명 + 작품 튀어나오기** → **React Three Fiber 추천**

---

## 6. 내가 구현하고 싶은 전시관 UX 체크리스트

* [ ] 스크롤 시 카메라가 오른쪽으로 이동
* [ ] 가까운 작품이 자동으로 앞으로 쓱 이동(Z)
* [ ] 활성화된 작품 핀조명이 더 켜짐
* [ ] 지나가면 작품/조명 원복
* [ ] 작품 클릭 → 디테일 페이지 이동

---

## 참고 키워드

* scroll → progress normalization
* Lenis (smooth scroll)
* GSAP ScrollTrigger (scroll timeline)
* IntersectionObserver (enter/leave trigger)
* React Three Fiber (Three.js in React)
* distance-based interaction (camera ↔ object)

---

## ✅ 핵심 코드 스니펫: Lenis + progress + 카메라 이동(R3F)

### 1) `useLenisProgress.js` (스크롤 → progress(0~1))

```js
// src/hooks/useLenisProgress.js
import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function useLenisProgress({ scrollRange = 8000 } = {}) {
  const progressRef = useRef(0);
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      smoothTouch: false,
    });

    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time) => {
      lenis.raf(time);

      // ✅ Lenis가 만든 "부드러운" 현재 스크롤 값(px)
      const y = lenis.scroll;

      // ✅ px → 0~1 progress
      progressRef.current = clamp01(y / scrollRange);

      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [scrollRange]);

  return { progressRef, lenisRef };
}
```

---

### 2) `Exhibition3D.jsx` (progress → 카메라 이동)

```jsx
// src/pages/Exhibition3D.jsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useLenisProgress } from "../hooks/useLenisProgress";

function CameraRig({ progressRef }) {
  const { camera } = useThree();
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  // 전시관 이동 범위(오른쪽으로 걷기)
  const startX = 0;
  const endX = 40;

  useFrame(() => {
    const p = progressRef.current;

    // ✅ 스크롤 progress → 카메라 x 이동
    camera.position.x = THREE.MathUtils.lerp(startX, endX, p);
    camera.position.y = 1.6;
    camera.position.z = 6;

    // ✅ 살짝 앞을 보게 하면 "걷는 느낌" 더 남
    lookAt.set(camera.position.x + 4, 1.6, 0);
    camera.lookAt(lookAt);
  });

  return null;
}

export default function Exhibition3D() {
  const SCROLL_RANGE = 8000; // 길수록 스크롤 더 많이 해야 끝까지 감
  const { progressRef } = useLenisProgress({ scrollRange: SCROLL_RANGE });

  return (
    <>
      {/* ✅ 스크롤 길이 확보용 더미 영역 */}
      <div style={{ height: SCROLL_RANGE + window.innerHeight }} />

      {/* ✅ 3D 장면은 고정 */}
      <div style={{ position: "fixed", inset: 0 }}>
        <Canvas camera={{ position: [0, 1.6, 6], fov: 50 }}>
          <ambientLight intensity={0.2} />

          {/* ✅ 여기서 카메라가 스크롤에 맞춰 움직임 */}
          <CameraRig progressRef={progressRef} />

          {/* TODO: room / frames / lights 추가 */}
        </Canvas>
      </div>
    </>
  );
}
```


