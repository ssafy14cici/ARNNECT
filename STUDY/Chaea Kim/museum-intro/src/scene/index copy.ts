import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

import type { UiApi } from "../ui";
import type { Mode } from "./state";

import { loadMuseumExterior } from "./exterior";
import { runEnterSequence } from "./enterSequence";
import { frameFrontView } from "./math";

import { mountExhibition } from "../exhibition/mount";

export function createScene(canvas: HTMLCanvasElement, ui: UiApi) {
  const uiAny = ui as any;
  const uiCall = (name: string, ...args: any[]) => {
    const fn = uiAny?.[name];
    if (typeof fn === "function") fn(...args);
  };

  // const renderer = new THREE.WebGLRenderer({
  //   canvas,
  //   antialias: true,
  //   powerPreference: "high-performance",
  // });
  // renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  // renderer.outputColorSpace = THREE.SRGBColorSpace;
  // renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // renderer.toneMappingExposure = 1.05;

  // const scene = new THREE.Scene();
  // scene.background = new THREE.Color("#87ceeb");
  // scene.fog = new THREE.Fog("#a0d8ef", 200, 3000);

  const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,       // ✅ 추가
});
renderer.setClearColor(0x000000, 0); // ✅ 추가(완전 투명)
scene.background = null;             // ✅ 추가(배경색 끔)


  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 4000);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minPolarAngle = THREE.MathUtils.degToRad(25);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(80);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(10, 20, 10);
  scene.add(sun);

  const exterior = new THREE.Group();
  scene.add(exterior);

  let mode: Mode = "EXTERIOR";
  let isAnimating = false;
  let glbLoaded = false;

  let animationMixer: THREE.AnimationMixer | null = null;
  let doorAnimationAction: THREE.AnimationAction | null = null;
  let museumScene: THREE.Object3D | null = null;
  let enterTimeline: any = null;

  const exteriorStart = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: renderer.toneMappingExposure,
    minDistance: 0,
    maxDistance: 0,
  };

  // ✅ local images in src/exhibition/img
  const artUrl = (n: number) => new URL(`../exhibition/img/a${n}.jpg`, import.meta.url).toString();

  const exhibition = mountExhibition(document.body, {
    defaultRooms: [
      {
        back: [], // ✅ 리셉션 데스크는 별도 처리 (CSS로 바닥 중앙 배치)
        left: [],
        right: [],
        slide: { nameLines: ["welcome", "reception"], title: "Reception", roomLabel: "reception", date: "2026.01.26" },
        subject: "reception",
        location: "Welcome Desk",
      },
      {
        back: [artUrl(9), artUrl(10)],
        left: [artUrl(1), artUrl(2), artUrl(3)],
        right: [artUrl(4), artUrl(5), artUrl(6)],
        slide: { nameLines: ["main", "room"], title: "Room 1", roomLabel: "room1", date: "2026.01.26" },
        subject: "room1",
        location: "",
      },
      {
        back: [artUrl(11), artUrl(12)],
        left: [artUrl(7), artUrl(8), artUrl(1)],
        right: [artUrl(2), artUrl(3), artUrl(4)],
        slide: { nameLines: ["sub", "room"], title: "Room 2", roomLabel: "room2", date: "2026.01.26" },
        subject: "room2",
        location: "",
      },
    ],
    onExit: () => {
      if (mode !== ("EXHIBITION_CSS" as Mode)) return;
      restoreExterior();
    },
    onOpenArtwork: ({roomIndex, side, src}) => {
      console.log("=== 작품 클릭 ===");
      console.log("Room:", roomIndex, "Side:", side);
      console.log("Src:", src);
      // SPA 방식으로 페이지 이동 (새로고침 없음)
      const q = new URLSearchParams({room: String(roomIndex), side, src});
      const url = `/artwork?${q.toString()}`;
      console.log("이동할 URL:", url);
      history.pushState(null, "", url);
      // 커스텀 이벤트 발생시켜 라우터에 알림
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    // (payload) => {
    //   const q = new URLSearchParams({
    //     room: String(payload.roomIndex),
    //     side: payload.side,
    //     src: payload.src,
    //   });
    //   window.location.href = `/artwork?${q.toString()}`;
    // },
  });

  function restoreExterior() {
    mode = "TRANSITION";
    isAnimating = true;

    console.log("=== 전시장 복귀 시작 ===");
    console.log("복귀 전 카메라:", camera.position);
    console.log("복귀 전 타겟:", controls.target);

    // ✅ GSAP 애니메이션 완전히 중지 (배경색 덮어쓰기 방지)
    if (enterTimeline) {
      enterTimeline.kill();
      enterTimeline = null;
    }
    // 모든 scene 관련 GSAP 트윈 제거
    gsap.killTweensOf(scene);
    gsap.killTweensOf(scene.background);
    if (scene.fog) gsap.killTweensOf(scene.fog);
    gsap.killTweensOf(renderer);
    gsap.killTweensOf(camera);
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);

    exhibition.hide();
    canvas.style.display = "block";
    exterior.visible = true;

    // ✅ 문 애니메이션 리셋 (나갈 때 문 닫기)
    if (doorAnimationAction) {
      doorAnimationAction.stop();
      doorAnimationAction.time = 0;
    }

    // ✅ 배경과 안개를 완전히 새로 생성 (GSAP 참조 제거)
    scene.background = new THREE.Color("#87ceeb");
    scene.fog = new THREE.Fog("#a0d8ef", 200, 3000);
    renderer.toneMappingExposure = exteriorStart.exposure;

    camera.position.copy(exteriorStart.cam);
    controls.target.copy(exteriorStart.target);

    controls.enableZoom = true;
    controls.minDistance = exteriorStart.minDistance;
    controls.maxDistance = exteriorStart.maxDistance;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = THREE.MathUtils.degToRad(25);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(80);
    controls.update();

    console.log("복귀 후 카메라:", camera.position);
    console.log("복귀 후 타겟:", controls.target);
    console.log("배경 색상 (바로 후):", scene.background);
    console.log("안개 색상 (바로 후):", scene.fog ? (scene.fog as THREE.Fog).color : null);
    console.log("===================");

    uiCall("setHeroVisible", true);
    uiCall("setEnterEnabled", true, "Hold for 1s");

    uiCall("flash", 1);
    requestAnimationFrame(() => {
      uiCall("flash", 0);

      // ✅ 한 프레임 후 다시 한 번 배경색 강제 설정
      scene.background = new THREE.Color("#87ceeb");
      if (scene.fog && (scene.fog as THREE.Fog).isFog) {
        (scene.fog as THREE.Fog).color.set("#a0d8ef");
      }

      console.log("배경 색상 (1프레임 후):", scene.background);
      console.log("안개 색상 (1프레임 후):", scene.fog ? (scene.fog as THREE.Fog).color : null);

      mode = "EXTERIOR";
      isAnimating = false;
    });
  }

  // ✅ 전시장 배경 고정 함수 (디테일 페이지에서 복귀 시 사용)
  function applyExhibitionBackground() {
    // 전시장에서는 하늘색이 아니라 실내 톤으로 고정
    scene.background = new THREE.Color("#ffffff");
    scene.fog = null; // 전시장에서는 안개 불필요
    renderer.toneMappingExposure = 1.0;
  }

  // ✅ 디테일 페이지에서 전시장으로 복귀하는 함수
  function restoreExhibitionFromDetail() {
    mode = "EXHIBITION_CSS" as Mode;
    isAnimating = false;

    console.log("=== 디테일 페이지에서 전시장 복귀 ===");

    // GSAP 애니메이션 완전히 중지
    if (enterTimeline) {
      enterTimeline.kill();
      enterTimeline = null;
    }
    gsap.killTweensOf(scene);
    gsap.killTweensOf(scene.background);
    if (scene.fog) gsap.killTweensOf(scene.fog);
    gsap.killTweensOf(renderer);
    gsap.killTweensOf(camera);
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);

    // 배경을 전시장 톤으로 설정
    applyExhibitionBackground();

    // 한 프레임 후 다시 한 번 강제 설정
    requestAnimationFrame(() => {
      applyExhibitionBackground();
      console.log("전시장 배경 복원 완료:", scene.background);
    });
  }

  // ✅ 외부에서 호출할 수 있게 노출
  (window as any).__SCENE_API__ = {
    restoreExhibitionFromDetail,
    restoreExterior,
  };

  uiCall("setHeroVisible", true);
  uiCall("setLoadingVisible", true);
  uiCall("setLoadingProgress", 0);
  uiCall("setEnterEnabled", false, "Loading…");
  uiCall("flash", 0);

  loadMuseumExterior({
    parent: exterior,
    url: `${import.meta.env.BASE_URL}models/simu_museum.glb`,
    overrideFloorPattern: true,
    floorColor: "#5a9a48",
    onProgress: (p01) => uiCall("setLoadingProgress", p01),
    onLoaded: (loadedScene, museumBox, animations = []) => {
      museumScene = loadedScene;

      if (animations.length > 0) {
        animationMixer = new THREE.AnimationMixer(museumScene);

        const doorClip = animations.find((clip) => clip.name.toLowerCase().includes("door"));
        const clipToUse = doorClip ?? animations[0];
        if (clipToUse) {
          doorAnimationAction = animationMixer.clipAction(clipToUse);
          doorAnimationAction.setLoop(THREE.LoopOnce, 1);
          doorAnimationAction.clampWhenFinished = true;
        }
      }

      // ✅ 정원 방향을 정면으로 설정 (기존 90도에서 270도로 변경 = 180도 회전)
      const FRONT_YAW_DEG = 270;
      const { dist } = frameFrontView(camera, controls, museumScene, {
        fill: 1.5, // ✅ 값이 클수록 건물이 크게 보임 (카메라가 가까워짐)
        yawDeg: FRONT_YAW_DEG,
        pitchDeg: -15,
        lift: -0.1,
      });

      // 🔍 디버깅: 카메라 위치와 건물 크기 확인
      console.log("=== 초기 카메라 설정 ===");
      console.log("Camera position:", camera.position);
      console.log("Camera target:", controls.target);
      console.log("Distance:", dist);
      console.log("Camera FOV:", camera.fov);
      console.log("Min/Max distance:", controls.minDistance, controls.maxDistance);

      controls.enableZoom = true;
      controls.minDistance = Math.max(3, dist * 0.3);
      controls.maxDistance = dist * 3.5;

      exteriorStart.cam.copy(camera.position);
      exteriorStart.target.copy(controls.target);
      exteriorStart.exposure = renderer.toneMappingExposure;
      exteriorStart.minDistance = controls.minDistance;
      exteriorStart.maxDistance = controls.maxDistance;

      glbLoaded = true;

      uiCall("setLoadingVisible", false);
      uiCall("setLoadingProgress", 1);
      uiCall("setEnterEnabled", true, "Hold for 1s");
    },
    onError: (err) => {
      console.error("museum glb load failed:", err);
      uiCall("setLoadingVisible", false);
      uiCall("setEnterEnabled", false, "Load failed");
    },
  });

  const enterHandler = () => {
    if (!glbLoaded) return;
    if (mode !== "EXTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";

    uiCall("setEnterEnabled", false, "Entering…");
    uiCall("setHeroVisible", false);

    const prevZoom = controls.enableZoom;
    const prevRot = controls.enableRotate;
    controls.enableZoom = false;
    controls.enableRotate = false;

    if (doorAnimationAction) {
      doorAnimationAction.reset();
      doorAnimationAction.play();
    }

    // 문이 열리는 걸 더 잘 보이도록 1200ms 딜레이
    setTimeout(() => {
      enterTimeline = runEnterSequence({
        camera,
        controls,
        renderer,
        scene,
        exterior,
        ui: { flash: (a) => uiCall("flash", a) },
        onSwap: async () => {
          canvas.style.display = "none";
          exterior.visible = false;
          exhibition.show();
        },
        onDone: () => {
          controls.enableZoom = prevZoom;
          controls.enableRotate = prevRot;

          mode = "EXHIBITION_CSS" as Mode;
          isAnimating = false;

          // ✅ 전시장 진입 완료 후 배경을 전시장 톤으로 설정
          applyExhibitionBackground();
        },
      });
    }, 1200);
  };

  ui.onEnterHold(enterHandler);

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isAnimating) return;
    if (mode !== ("EXHIBITION_CSS" as Mode)) return;
    restoreExterior();
  });

  let lastTime = 0;
  function tick() {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (animationMixer) animationMixer.update(delta);

    controls.update();
    renderer.render(scene, camera);

    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
