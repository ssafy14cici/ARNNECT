import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { UiApi } from "../ui";
import type { Mode } from "./state";

import { loadMuseumExterior } from "./exterior";
import { runEnterSequence } from "./enterSequence";
import { frameFrontView } from "./math";
import { mountExhibition } from "../exhibition/mount";

/**
 * scene/index.ts
 * - 외부(Three) 유지
 * - 내부는 CSS 3D 오버레이로 전환(show/hide)
 */
export function createScene(canvas: HTMLCanvasElement, ui: UiApi) {
  const uiAny = ui as any;
  const uiCall = (name: string, ...args: any[]) => {
    const fn = uiAny?.[name];
    if (typeof fn === "function") fn(...args);
  };

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
  scene.background = new THREE.Color("#f6f4ef");
  scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 4000);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

  // ✅ 외부: 줌 가능
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

  const exteriorStart = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: renderer.toneMappingExposure,
    minDistance: 0,
    maxDistance: 0,
  };

  // ===== CSS Exhibition overlay
  const exhibition = mountExhibition(document.body, {
    defaultRooms: [
      {
        back: [
          "https://tympanus.net/Development/Exhibition/img/set4/3.jpg",
          "https://tympanus.net/Development/Exhibition/img/set4/6.jpg",
        ],
        left: [
          "https://tympanus.net/Development/Exhibition/img/set4/7.jpg",
          "https://tympanus.net/Development/Exhibition/img/set4/1.jpg",
          "https://tympanus.net/Development/Exhibition/img/set4/2.jpg",
        ],
        right: [
          "https://tympanus.net/Development/Exhibition/img/set4/4.jpg",
          "https://tympanus.net/Development/Exhibition/img/set4/5.jpg",
          "https://tympanus.net/Development/Exhibition/img/set4/8.jpg",
        ],
        slide: { nameLines: ["Aiko", "Akiyama"], title: "Faces of Peace", roomLabel: "Suijin", date: "31 Mar – 25 Apr 2017" },
        subject: "モダンアート",
        location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
      },
      {
        back: [
          "https://tympanus.net/Development/Exhibition/img/set2/1.jpg",
          "https://tympanus.net/Development/Exhibition/img/set2/6.jpg",
        ],
        left: [
          "https://tympanus.net/Development/Exhibition/img/set2/3.jpg",
          "https://tympanus.net/Development/Exhibition/img/set2/4.jpg",
          "https://tympanus.net/Development/Exhibition/img/set2/5.jpg",
        ],
        right: [
          "https://tympanus.net/Development/Exhibition/img/set2/8.jpg",
          "https://tympanus.net/Development/Exhibition/img/set2/7.jpg",
          "https://tympanus.net/Development/Exhibition/img/set2/2.jpg",
        ],
        slide: { nameLines: ["Kato", "Yatsumoto"], title: "Understanding Life", roomLabel: "Tenjin", date: "25 Mar – 11 May 2017" },
        subject: "モダンアート",
        location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
      },
      {
        back: [
          "https://tympanus.net/Development/Exhibition/img/set3/1.jpg",
          "https://tympanus.net/Development/Exhibition/img/set3/6.jpg",
        ],
        left: [
          "https://tympanus.net/Development/Exhibition/img/set3/3.jpg",
          "https://tympanus.net/Development/Exhibition/img/set3/4.jpg",
          "https://tympanus.net/Development/Exhibition/img/set3/5.jpg",
        ],
        right: [
          "https://tympanus.net/Development/Exhibition/img/set3/8.jpg",
          "https://tympanus.net/Development/Exhibition/img/set3/7.jpg",
          "https://tympanus.net/Development/Exhibition/img/set3/2.jpg",
        ],
        slide: { nameLines: ["Misako", "Shiraishi"], title: "Instant Gratification", roomLabel: "Izanami", date: "4 Apr – 30 Apr 2017" },
        subject: "モダンアート",
        location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
      },
    ],
    onExit: () => {
      if (mode !== "EXHIBITION_CSS") return;
      restoreExterior();
    },
  });

  function restoreExterior() {
    mode = "TRANSITION";
    isAnimating = true;

    exhibition.hide();
    canvas.style.display = "block";
    exterior.visible = true;

    scene.background = new THREE.Color("#f6f4ef");
    scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);
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

  uiCall("setHeroVisible", true);
  uiCall("setLoadingVisible", true);
  uiCall("setLoadingProgress", 0);
  uiCall("setEnterEnabled", false, "Loading…");
  uiCall("flash", 0);

  loadMuseumExterior({
    parent: exterior,
    url: `${import.meta.env.BASE_URL}models/simu_museum.glb`,
    overrideFloorPattern: true,
    floorColor: "#f6f4ef",
    onProgress: (p01) => uiCall("setLoadingProgress", p01),
    onLoaded: (museumScene) => {
      const FRONT_YAW_DEG = 90;
      const { dist } = frameFrontView(camera, controls, museumScene, {
        fill: 0.86,
        yawDeg: FRONT_YAW_DEG,
        pitchDeg: 0,
        lift: 0.1,
      });

      // ✅ 외부 줌 허용 + "내부 뚫기" 방지 거리 클램프
      controls.enableZoom = true;
      controls.minDistance = Math.max(6, dist * 0.62);
      controls.maxDistance = dist * 1.75;

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

    runEnterSequence({
      camera,
      controls,
      renderer,
      scene,
      exterior,
      ui: { flash: (a) => uiCall("flash", a) },
      onSwap: () => {
        canvas.style.display = "none";
        exhibition.show();
      },
      onDone: () => {
        controls.enableZoom = prevZoom;
        controls.enableRotate = prevRot;
        mode = "EXHIBITION_CSS";
        isAnimating = false;
      },
    });
  };

  ui.onEnterHold(enterHandler);

  function tick() {
    if (canvas.style.display !== "none") {
      controls.update();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
