// src/scene/index.ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import type { UiApi } from "../ui";

import type { Mode } from "./state";
import { buildInterior, applyArtworkTextureToSlot, type ArtSlot, type RoomAnchor } from "./interior";
import { attachFramesToArtSlots, refitExistingFrameForSlot } from "./frames";
import { loadMuseumExterior } from "./exterior";
import { runEnterSequence } from "./enterSequence";

export function createScene(canvas: HTMLCanvasElement, ui: UiApi) {
  const UI = ui as any;

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
  controls.minDistance = 10.0;
  controls.maxDistance = 200.0;

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(10, 20, 10);
  scene.add(sun);

  const exterior = new THREE.Group();
  const interior = new THREE.Group();
  interior.visible = false;
  scene.add(exterior, interior);

  let mode: Mode = "EXTERIOR";
  let isAnimating = false;
  let glbLoaded = false;
  let museumBounds: THREE.Box3 | null = null;

  const exteriorState = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: renderer.toneMappingExposure,
  };

  // ===== Interior =====
  const { artworks, artSlots, roomAnchors, setInteriorCamera } = buildInterior(interior);

  attachFramesToArtSlots({
    glbUrl: `${import.meta.env.BASE_URL}models/frame.glb`,
    artSlots,
    look: "wood",
  });

  // ===== UI loading =====
  UI.setLoadingVisible?.(true);
  UI.setLoadingProgress?.(0);
  UI.setEnterEnabled?.(false, "Loading…");
  UI.setHeroVisible?.(true);

  // ===== Exterior load =====
  loadMuseumExterior({
    parent: exterior,
    url: `${import.meta.env.BASE_URL}models/simu_museum.glb`,
    floorCover: { enabled: true, color: "#ffffff", size: 900, y: 0.06 },
    onProgress: (p) => UI.setLoadingProgress?.(p),
    onLoaded: (museumScene, bounds) => {
      frameFrontView(camera, controls, museumScene, { fill: 0.86, yawDeg: 90, pitchDeg: 0, lift: 0.1 });
      museumBounds = bounds;

      glbLoaded = true;
      UI.setLoadingVisible?.(false);
      UI.setLoadingProgress?.(1);
      UI.setEnterEnabled?.(true, "Hold ENTER for 1s");
    },
    onError: (err) => {
      console.error(err);
      UI.setLoadingVisible?.(false);
      UI.setEnterEnabled?.(false, "Load failed");
    },
  });

  // ===== Enter =====
  const enterHandler = () => {
    if (!glbLoaded) return;
    if (mode !== "EXTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";

    UI.setHeroVisible?.(false);
    UI.setEnterEnabled?.(false, "Entering…");

    exteriorState.cam.copy(camera.position);
    exteriorState.target.copy(controls.target);
    exteriorState.exposure = renderer.toneMappingExposure;

    runEnterSequence({
      camera,
      controls,
      renderer,
      scene,
      exterior,
      interior,
      setInteriorCamera,
      ui: UI,
      onDone: () => {
        mode = "INTERIOR";
        isAnimating = false;
        UI.setExitVisible?.(true);
      },
    });
  };

  UI.onEnterHold?.(enterHandler);

  // ===== Exit =====
  UI.onExit?.(() => {
    if (mode !== "INTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";

    UI.setExitVisible?.(false);
    UI.closePanel?.();

    const tl = gsap.timeline({
      onComplete: () => {
        mode = "EXTERIOR";
        isAnimating = false;
        UI.setHeroVisible?.(true);
        UI.setEnterEnabled?.(true, "Hold ENTER for 1s");

        // 외부 컨트롤 범위 복귀
        controls.minDistance = 10.0;
        controls.maxDistance = 200.0;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
      },
    });

    tl.to({}, { duration: 0.18, onStart: () => UI.flash?.(1) });

    tl.add(() => {
      interior.visible = false;
      exterior.visible = true;

      scene.background = new THREE.Color("#f6f4ef");
      scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);
      renderer.toneMappingExposure = exteriorState.exposure;

      camera.position.copy(exteriorState.cam);
      controls.target.copy(exteriorState.target);
      controls.update();
    });

    tl.to({}, { duration: 0.45, onUpdate: () => UI.flash?.(0) }, "+=0.04");
  });

  // ===== Artwork click =====
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "INTERIOR") return;

    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(artworks, true);
    if (hits.length === 0) return;

    const meta = hits[0].object.userData?.art as
      | { id: string; title: string; desc: string }
      | undefined;

    if (!meta) return;
    UI.openPanel?.(meta.title, meta.desc);
  });

  // ===== Upload hook =====
  UI.onArtworkUpload?.(async (slotId: string, payload: File | string) => {
    const slot = findSlot(artSlots, slotId);
    if (!slot) return;

    try {
      const tex = await loadTextureFromPayload(payload);
      applyArtworkTextureToSlot(slot, tex);
      refitExistingFrameForSlot(slot);
    } catch (err) {
      console.error("[upload] failed:", err);
      UI.toast?.("Image apply failed");
    }
  });

  // ===== Room navigation (ArrowLeft / ArrowRight) =====
  let roomIndex = 0;
  let navAnimating = false;

  window.addEventListener("keydown", (e) => {
    if (mode !== "INTERIOR") return;
    if (navAnimating) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();

      roomIndex += e.key === "ArrowRight" ? 1 : -1;
      if (roomIndex < 0) roomIndex = roomAnchors.length - 1;
      if (roomIndex >= roomAnchors.length) roomIndex = 0;

      const a = roomAnchors[roomIndex];
      navAnimating = true;

      gsap.to(camera.position, {
        duration: 0.65,
        x: a.cam.x,
        y: a.cam.y,
        z: a.cam.z,
        ease: "power2.inOut",
        onUpdate: () => controls.update(),
      });

      gsap.to(controls.target, {
        duration: 0.65,
        x: a.target.x,
        y: a.target.y,
        z: a.target.z,
        ease: "power2.inOut",
        onUpdate: () => controls.update(),
        onComplete: () => {
          navAnimating = false;
        },
      });
    }
  });

  // ===== Loop =====
  function tick() {
    controls.update();

    // 외부에서만 줌 침투 방지
    if (mode === "EXTERIOR" && museumBounds) {
      preventZoomPenetration(camera, controls, museumBounds);
    }

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

// ===== Helpers =====
function frameFrontView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  opts?: { fill?: number; yawDeg?: number; pitchDeg?: number; lift?: number }
) {
  const fill = opts?.fill ?? 0.86;
  const yaw = THREE.MathUtils.degToRad(opts?.yawDeg ?? 0);
  const pitch = THREE.MathUtils.degToRad(opts?.pitchDeg ?? 0);
  const lift = opts?.lift ?? 0.1;

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const dir = new THREE.Vector3(0, 0, 1);
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  dir.normalize();

  const target = center.clone();
  target.y = box.min.y + size.y * (0.5 + lift);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const distV = (size.y / (2 * Math.tan(vFov / 2))) / fill;
  const distH = (Math.max(size.x, size.z) / (2 * Math.tan(hFov / 2))) / fill;
  const dist = Math.max(distV, distH);

  camera.position.copy(target.clone().add(dir.multiplyScalar(dist)));
  camera.near = Math.max(0.1, dist / 200);
  camera.far = Math.max(4000, dist * 20);
  camera.updateProjectionMatrix();

  controls.target.copy(target);
  controls.update();
}

function preventZoomPenetration(camera: THREE.PerspectiveCamera, controls: OrbitControls, bounds: THREE.Box3) {
  if (!bounds.containsPoint(camera.position)) return;

  const dir = camera.position.clone().sub(controls.target);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
  dir.normalize();

  for (let i = 0; i < 120; i++) {
    if (!bounds.containsPoint(camera.position)) break;
    camera.position.addScaledVector(dir, 0.12);
  }

  if (bounds.containsPoint(camera.position)) {
    const MIN_DIST = Math.max(controls.minDistance ?? 10, 10);
    camera.position.copy(controls.target.clone().add(dir.multiplyScalar(MIN_DIST)));
  }
}

function findSlot(slots: ArtSlot[], id: string) {
  return slots.find((s) => s.id === id) ?? null;
}

async function loadTextureFromPayload(payload: File | string) {
  const loader = new THREE.TextureLoader();

  if (typeof payload !== "string") {
    const url = URL.createObjectURL(payload);
    try {
      const tex = await new Promise<THREE.Texture>((res, rej) => loader.load(url, res, undefined, rej));
      return tex;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const tex = await new Promise<THREE.Texture>((res, rej) => loader.load(payload, res, undefined, rej));
  return tex;
}
