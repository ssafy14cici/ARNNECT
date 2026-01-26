// src/scene/index.ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { UiApi } from "../ui";
import type { Mode } from "./state";

import { loadMuseumExterior } from "./exterior";
import { runEnterSequence } from "./enterSequence";
import { frameFrontView } from "./math";

// ✅ CSS 전시장
import { mountExhibition } from "../exhibition/mount";

export function createScene(canvas: HTMLCanvasElement, ui: UiApi) {
  const uiAny = ui as any;
  const uiCall = (name: string, ...args: any[]) => {
    const fn = uiAny?.[name];
    if (typeof fn === "function") fn(...args);
  };

  /* ======================================================
   * Renderer / Scene / Camera
   * ====================================================== */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#87ceeb");
  scene.fog = new THREE.Fog("#a0d8ef", 200, 3000);

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

  /* ======================================================
   * Mode / Flags
   * ====================================================== */
  let mode: Mode = "EXTERIOR";
  let isAnimating = false;
  let glbLoaded = false;

  let animationMixer: THREE.AnimationMixer | null = null;
  let doorAnimationAction: THREE.AnimationAction | null = null;
  let museumScene: THREE.Object3D | null = null;

  const exteriorStart = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: renderer.toneMappingExposure,
    minDistance: 0,
    maxDistance: 0,
  };

  /* ======================================================
   * ✅ CSS Exhibition setup
   * - images: src/exhibition/img/a1..a12.jpg 를 Vite URL로 변환
   * ====================================================== */
  const artUrl = (n: number) => new URL(`../exhibition/img/a${n}.jpg`, import.meta.url).toString();

  const exhibition = mountExhibition(document.body, {
    defaultRooms: [
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
      // ✅ CSS 전시장에서 Exit/Back 누르면 외부로 복귀
      if (mode !== ("EXHIBITION_CSS" as Mode)) return;
      restoreExterior();
    },
    onOpenArtwork: (payload) => {
      console.log("🖼️ open artwork:", payload);
      // TODO: 상세 화면 라우팅 연결 가능
    },
  });

  /* ======================================================
   * Restore exterior
   * ====================================================== */
  function restoreExterior() {
    mode = "TRANSITION";
    isAnimating = true;

    exhibition.hide();
    canvas.style.display = "block";
    exterior.visible = true;

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

    uiCall("setHeroVisible", true);
    uiCall("setEnterEnabled", true, "Hold for 1s");

    uiCall("flash", 1);
    requestAnimationFrame(() => {
      uiCall("flash", 0);
      mode = "EXTERIOR";
      isAnimating = false;
    });
  }

  /* ======================================================
   * UI init
   * ====================================================== */
  uiCall("setHeroVisible", true);
  uiCall("setLoadingVisible", true);
  uiCall("setLoadingProgress", 0);
  uiCall("setEnterEnabled", false, "Loading…");
  uiCall("flash", 0);

  /* ======================================================
   * Load exterior GLB
   * ====================================================== */
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

      const FRONT_YAW_DEG = 90;
      const { dist } = frameFrontView(camera, controls, museumScene, {
        fill: 0.86,
        yawDeg: FRONT_YAW_DEG,
        pitchDeg: -15,
        lift: -0.1,
      });

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

  /* ======================================================
   * Enter handler: EXTERIOR -> enterSequence -> CSS exhibition
   * ====================================================== */
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

    setTimeout(() => {
      runEnterSequence({
        camera,
        controls,
        renderer,
        scene,
        exterior,
        ui: { flash: (a) => uiCall("flash", a) },

        // ✅ 여기서 CSS로 스왑
        onSwap: async () => {
          canvas.style.display = "none";
          exterior.visible = false;
          exhibition.show();
        },

        // ✅ onDone은 하나만
        onDone: () => {
          controls.enableZoom = prevZoom;
          controls.enableRotate = prevRot;

          mode = "EXHIBITION_CSS" as Mode;
          isAnimating = false;
        },
      });
    }, 500);
  };

  ui.onEnterHold(enterHandler);

  /* ======================================================
   * ESC: CSS 전시장일 때 외부 복귀
   * ====================================================== */
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isAnimating) return;
    if (mode !== ("EXHIBITION_CSS" as Mode)) return;
    restoreExterior();
  });

  /* ======================================================
   * Render loop
   * ====================================================== */
  let lastTime = 0;
  function tick() {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (animationMixer) animationMixer.update(delta);

    // CSS 전시장에서도 Three는 렌더 돌려도 되지만,
    // canvas가 display:none이면 실제 그려지지 않음.
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
