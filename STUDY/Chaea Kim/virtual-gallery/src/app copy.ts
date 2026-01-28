import * as THREE from "three";

import { createViewer } from "./three/viewer";
import { loadGallery } from "./three/assets";
import { installDebugCapture } from "./three/debugCapture";
import { installFpsDebug } from "./three/fpsDebug";
import { createManualWaypoints, type WaypointId } from "./three/waypoints";
import { createTransitionController } from "./three/transition";

export async function startApp() {
  const canvas = ensureCanvas();
  const viewer = createViewer(canvas);

  /* ===============================
   * Target ref (단일 시야 기준)
   * =============================== */
  const targetRef = { current: new THREE.Vector3(0, 1.6, 0) };
  viewer.controls.target.copy(targetRef.current);

  installDebugCapture(viewer.camera, targetRef);

  const root = await loadGallery("/models/gallery1.glb");
  viewer.scene.add(root);

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

  /* ===============================
   * 🔴 시점 목록 (총 11개)
   * - 기존 WP_3 제거
   * - 새 시점 삽입
   * =============================== */
  const points = [
    // 0 시작 시점
    { pos: [-9.32, 1.6, 13.205], target: [-4.388, 0.784, 13.325] },

    // 1 작품1
    { pos: [-0.174, 1.6, 15.704], target: [0.038, 1.75, 20.697] },

    // 2 작품2
    { pos: [0.667, 1.6, 15.625], target: [5.661, 1.79, 15.767] },

    // 3 🔁 새로 교체된 시점 (기존 4번 자리)
    { pos: [0.914, 1.6, 8.192], target: [5.909, 1.79, 8.068] },

    // 4 작품5
    { pos: [11.045, 1.6, -1.357], target: [11.087, 1.8, 3.639] },

    // 5 작품6
    { pos: [14.474, 1.6, -1.299], target: [19.474, 1.62, -1.307] },

    // 6 작품7
    { pos: [14.249, 1.6, -3.934], target: [13.888, 0.982, -8.882] },

    // 7 작품8
    { pos: [13.098, 1.6, -3.677], target: [8.103, 1.44, -3.537] },

    // 8 작품9
    { pos: [6.423, 1.6, 1.985], target: [6.348, 1.61, -3.014] },

    // 9 작품10
    { pos: [-1.055, 1.6, 1.839], target: [-1.069, 0.972, -3.122] },

    // 10 작품11
    { pos: [-0.986, 1.6, 4.047], target: [-5.964, 2.059, 4.018] },
  ];

  const { waypoints, count } = createManualWaypoints(points);

  const transition = createTransitionController(
    viewer.camera,
    viewer.controls,
    targetRef
  );

  /* ===============================
   * 시점 번호 UI (DEBUG)
   * =============================== */
  const label = createViewIndexLabel();

  let index = 0;
  const updateLabel = () => {
    label.textContent = `VIEWPOINT ${index}`;
  };

  updateLabel();
  transition.goTo(waypoints[`WP_${index}` as WaypointId], { duration: 0 });

  /* ===============================
   * 방향키 좌/우 이동 (무한 루프)
   * =============================== */
  const go = (next: number) => {
    index = ((next % count) + count) % count;
    updateLabel();
    transition.goTo(waypoints[`WP_${index}` as WaypointId], {
      duration: 0.9,
    });
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
