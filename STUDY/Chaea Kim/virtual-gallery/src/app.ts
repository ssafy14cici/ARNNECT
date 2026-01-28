import * as THREE from "three";

import { createViewer } from "./three/viewer";
import { loadGallery } from "./three/assets";
import { installInteraction } from "./three/interaction";
import { createTransitionController } from "./three/transition";
import { installDebugCapture } from "./three/debugCapture";
import { installFpsDebug } from "./three/fpsDebug";
import { createManualWaypoints } from "./three/waypoints";

export async function startApp() {
  const canvas = ensureCanvas();
  const viewer = createViewer(canvas);

  const targetRef = { current: new THREE.Vector3(0, 1.6, 0) };
  viewer.controls.target.copy(targetRef.current);

  installDebugCapture(viewer.camera, targetRef);

  const root = await loadGallery("/models/gallery1.glb");
  viewer.scene.add(root);

  const fps = installFpsDebug({
    canvas,
    camera: viewer.camera,
    targetRef,
    opts: { eyeHeight: 1.6, speed: 3.0, fastMult: 2.0, lookSpeed: 0.002 },
  });

  // ✅ 네가 찍어준 CAM 로그 중 "테스트용 8개"를 웨이포인트로 고정
  const points = [
    { pos: [14.008, 1.6, -3.437], target: [11.169, 1.67, -7.552] }, // WP_0 (오른쪽 시작 후보)
    { pos: [12.852, 1.6, -1.488], target: [12.828, 1.53, -6.487] }, // WP_1
    { pos: [6.828, 1.6, 2.056], target: [6.914, 1.41, -2.939] },    // WP_2
    { pos: [1.998, 1.6, 2.727], target: [1.814, 1.79, -2.266] },    // WP_3
    { pos: [-1.741, 1.6, 2.396], target: [-2.055, 1.67, -2.594] },  // WP_4
    { pos: [-1.671, 1.6, 2.391], target: [-6.665, 1.38, 2.301] },   // WP_5 (왼쪽/뒤쪽 보는 느낌)
    { pos: [-0.003, 1.6, 7.368], target: [-5.0, 1.68, 7.218] },     // WP_6
    { pos: [-0.822, 1.6, 6.996], target: [-5.819, 1.78, 6.916] },   // WP_7
  ];

  const { waypoints, hotspotGroup } = createManualWaypoints(points);
  viewer.scene.add(hotspotGroup);

  const transition = createTransitionController(viewer.camera, viewer.controls);

  installInteraction({
    canvas,
    camera: viewer.camera,
    scene: viewer.scene,
    controls: viewer.controls,
    onWaypointClick: (id) => transition.goTo(waypoints[id], { duration: 1.1 }),
  });

  // ✅ RIGHT에서 WP_0 시작
  transition.goTo(waypoints.WP_0, { duration: 0 });

  viewer.start(() => {
    viewer.controls.enabled = !fps.isEnabled();
    viewer.controls.target.copy(targetRef.current);
    fps.update();
  });
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
