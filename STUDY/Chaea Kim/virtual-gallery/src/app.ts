import * as THREE from "three";

import { createViewer } from "./three/viewer";
import { loadGallery } from "./three/assets";
import { installDebugCapture } from "./three/debugCapture";
import { installFpsDebug } from "./three/fpsDebug";
import { createManualWaypoints, type WaypointId } from "./three/waypoints";
import { createTransitionController } from "./three/transition";
import { createTempFramesRaycasted } from "./three/tempFrames";
import { createArtModal } from "./three/artModal";
import { installArtClick } from "./three/artClick";
import { createClickModal } from "./three/clickModal";

type Pose = { pos: THREE.Vector3; target: THREE.Vector3 };

export async function startApp() {
  const canvas = ensureCanvas();

  // ✅ HDR 없이도 따뜻한 프리셋
  const viewer = createViewer(canvas, {
    exposure: 1.3,
    useProceduralEnvironment: true,
    backgroundColor: 0xf2f2f2,
  });

  const targetRef = { current: new THREE.Vector3(0, 1.6, 0) };
  viewer.controls.target.copy(targetRef.current);

  installDebugCapture(viewer.camera, targetRef);

  const modal = createArtModal();
  installArtClick({
    canvas,
    camera: viewer.camera,
    scene: viewer.scene,
    openModal: modal.open,
  });

  // =========================
  // GLB 로드
  // =========================
  const root = await loadGallery("/models/gallery7.glb");
  viewer.scene.add(root);

  // ✅ 여기서 "칙칙/들쭉"의 원인을 정리함
  normalizeLoadedScene(root);

  const fps = installFpsDebug({
    canvas,
    camera: viewer.camera,
    targetRef,
    opts: {
      eyeHeight: 1.6,
      speed: 3.0,
      fastMult: 2.0,
      lookSpeed: 0.002,
      arrowLookSpeed: 1.6,
    },
  });

  const points = [
    { pos: [-9.32, 1.6, 13.205], target: [-4.388, 0.784, 13.325] },
    { pos: [-0.174, 1.6, 15.704], target: [0.038, 1.75, 20.697] },
    { pos: [0.667, 1.6, 15.625], target: [5.661, 1.79, 15.767] },
    { pos: [0.914, 1.6, 8.192], target: [5.909, 1.79, 8.068] },
    { pos: [11.045, 1.6, -1.357], target: [11.087, 1.8, 3.639] },
    { pos: [14.474, 1.6, -1.299], target: [19.474, 1.62, -1.307] },
    { pos: [14.249, 1.6, -3.934], target: [13.888, 0.982, -8.882] },
    { pos: [13.098, 1.6, -3.677], target: [8.103, 1.44, -3.537] },
    { pos: [6.423, 1.6, 1.985], target: [6.348, 1.61, -3.014] },
    { pos: [-1.055, 1.6, 1.839], target: [-1.069, 0.972, -3.122] },
    { pos: [-0.986, 1.6, 4.047], target: [-5.964, 2.059, 4.018] },
  ];

  const { waypoints, count } = createManualWaypoints(points);
  const transition = createTransitionController(viewer.camera, viewer.controls, targetRef);

  // poseList 만들기
  const poseList: Pose[] = [];
  for (let i = 0; i < count; i++) {
    const wp = waypoints[`WP_${i}` as WaypointId];
    poseList.push({ pos: wp.pos, target: wp.target });
  }

  // Raycast frames
  const frames = createTempFramesRaycasted(root, poseList, {
    basePath: "/art",
    skipFirst: true,
    width: 2.2,
    height: 1.6,
    offset: 0.08,
    border: 0.14,
    maxDistance: 250,
    fixedY: 1.85,
    fixedYMode: "center",
  });
  viewer.scene.add(frames);

  const clickModal = createClickModal();
  installArtClick({
    canvas,
    camera: viewer.camera,
    scene: viewer.scene,
    onClickArt: (p) => {
      console.log("[ART CLICK]", p);
      clickModal.open({ id: p.id, index: p.index, src: p.src });
    },
  });

  // UI label
  const label = createViewIndexLabel();
  let index = 0;

  const updateLabel = () => {
    label.textContent = `VIEWPOINT ${index}`;
  };

  updateLabel();
  transition.goTo(waypoints.WP_0, { duration: 0 });

  const go = (next: number) => {
    index = ((next % count) + count) % count;
    updateLabel();
    transition.goTo(waypoints[`WP_${index}` as WaypointId], { duration: 0.9 });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (fps.isEnabled()) return;

    if (e.code === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  window.addEventListener("keydown", onKeyDown, { passive: false });

  viewer.start(() => {
    viewer.controls.enabled = !fps.isEnabled();
    viewer.controls.target.copy(targetRef.current);
    fps.update();
  });
}

/* ===============================
 * GLB normalize
 * =============================== */

function normalizeLoadedScene(root: THREE.Object3D) {
  // 1) GLB 내부 라이트가 있으면 결과가 들쭉날쭉해짐 → 끈다
  root.traverse((o) => {
    if ((o as any).isLight) {
      const l = o as THREE.Light;
      l.visible = false; // 가장 확실
      // (원하면) l.intensity = 0;
    }
  });

  // 2) shadow receiver/caster 정리
  root.traverse((o) => {
    if (!(o as any).isMesh) return;
    const mesh = o as THREE.Mesh;
    const n = (mesh.name ?? "").toLowerCase();

    // 유리/프레임/작품/조명/벤치 등은 그림자 노이즈 원인 → 수신만 끄거나 둘 다 끔
    const noShadow =
      n.includes("glass") ||
      n.includes("frame") ||
      n.includes("art") ||
      n.includes("spot") ||
      n.includes("light") ||
      n.includes("bench") ||
      n.includes("chair") ||
      n.includes("table") ||
      n.includes("stand");

    // 바닥/벽/천장은 receiveShadow ON이 “햇빛 패턴” 핵심
    const isSurface = n.includes("floor") || n.includes("wall") || n.includes("ceiling") || n.includes("ceil");

    mesh.castShadow = !noShadow && !isSurface; // 구조물은 캐스터가 될 수 있음
    mesh.receiveShadow = isSurface && !noShadow;

    // 3) 텍스처 컬러스페이스 보정(혹시 누락된 경우 대비)
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const anyM = m as any;

      if (anyM.map) anyM.map.colorSpace = THREE.SRGBColorSpace;
      if (anyM.emissiveMap) anyM.emissiveMap.colorSpace = THREE.SRGBColorSpace;

      // 너무 검게 먹는 재질이 있으면 roughness 상한만 살짝 제한
      if (typeof anyM.roughness === "number") anyM.roughness = Math.min(anyM.roughness, 0.95);
      if (typeof anyM.metalness === "number") anyM.metalness = Math.max(anyM.metalness, 0.0);

      anyM.needsUpdate = true;
    }
  });
}

/* ===============================
 * UI helpers
 * =============================== */

function createViewIndexLabel(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.top = "20px";
  el.style.left = "50%";
  el.style.transform = "translateX(-50%)";
  el.style.padding = "8px 16px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  el.style.fontSize = "18px";
  el.style.fontWeight = "600";
  el.style.letterSpacing = "0.08em";
  el.style.borderRadius = "6px";
  el.style.pointerEvents = "none";
  el.style.zIndex = "9999";
  el.style.fontFamily = "monospace";
  document.body.appendChild(el);
  return el;
}

function ensureCanvas(): HTMLCanvasElement {
  const app =
    document.querySelector<HTMLDivElement>("#app") ??
    (() => {
      const div = document.createElement("div");
      div.id = "app";
      document.body.appendChild(div);
      return div;
    })();

  let canvas = app.querySelector<HTMLCanvasElement>("canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    app.appendChild(canvas);
  }

  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  return canvas;
}
