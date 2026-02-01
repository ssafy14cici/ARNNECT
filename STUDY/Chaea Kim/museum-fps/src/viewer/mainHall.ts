// src/viewer/mainHall.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

import { WAYPOINTS } from "./waypoints";

type Options = {
  glbUrl?: string;
  moveSpeed?: number;

  /** ✅ 시작 웨이포인트 id */
  startWaypointId?: number;

  /** ✅ 웨이포인트의 y(높이)를 유지할지 */
  lockYToWaypoint?: boolean;

  /** ✅ 시야각 */
  fov?: number;
};

function applyWaypoint(camera: THREE.PerspectiveCamera, wpId: number, fov = 65) {
  const wp = WAYPOINTS.find((w) => w.id === wpId);
  if (!wp) {
    console.warn("[Hall] waypoint not found:", wpId);
    return { fixedY: null as number | null };
  }

  const { pos, yaw, pitch } = wp.pose;

  camera.fov = fov;
  camera.updateProjectionMatrix();

  camera.position.set(pos[0], pos[1], pos[2]);

  // ✅ PointerLockControls와 맞추려면 rotation을 직접 세팅(lookAt보다 안정)
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  camera.updateMatrixWorld(true);

  console.log("[Hall] start waypoint =", wpId, "pos =", pos, "yaw/pitch =", yaw, pitch);

  return { fixedY: pos[1] };
}

export function mountMainHallViewer(canvas: HTMLCanvasElement, opts: Options = {}) {
  // ✅ 여기서 canvas가 진짜인지 강제 체크(이 에러가 다시 나면 여기서 바로 잡힘)
  if (!(canvas instanceof HTMLCanvasElement)) {
    console.error("[Hall] canvas is not HTMLCanvasElement:", canvas);
    throw new Error("mountMainHallViewer(canvas, ...) 첫 인자는 반드시 HTMLCanvasElement 여야 합니다.");
  }

  const glbUrl = opts.glbUrl ?? "/models/museum/mh_add_5.glb";
  const moveSpeed = opts.moveSpeed ?? 3.5;

  const startWaypointId = opts.startWaypointId ?? 0;
  const lockYToWaypoint = opts.lockYToWaypoint ?? true;
  const fov = opts.fov ?? 65;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(new THREE.Color("#111111"), 1);

  /* Scene / Camera */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111111");

  const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.05, 5000);

  /* Controls */
  const controls = new PointerLockControls(camera, renderer.domElement);

  const onClick = () => {
    if (!controls.isLocked) controls.lock();
  };
  renderer.domElement.addEventListener("click", onClick);

  const keys = { w: false, a: false, s: false, d: false, shift: false };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyW") keys.w = true;
    if (e.code === "KeyA") keys.a = true;
    if (e.code === "KeyS") keys.s = true;
    if (e.code === "KeyD") keys.d = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "KeyW") keys.w = false;
    if (e.code === "KeyA") keys.a = false;
    if (e.code === "KeyS") keys.s = false;
    if (e.code === "KeyD") keys.d = false;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  /* Lighting */
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 10, 5);
  scene.add(dir);
  const point = new THREE.PointLight(0xffffff, 0.6, 50);
  point.position.set(0, 4, 0);
  scene.add(point);

  /* Load GLB */
  const loader = new GLTFLoader();
  let hallRoot: THREE.Object3D | null = null;

  // ✅ 웨이포인트 y 고정용
  let fixedY: number | null = null;

  loader.load(
    glbUrl,
    (gltf) => {
      hallRoot = gltf.scene;

      // 텍스처 컬러스페이스 보정(선택)
      hallRoot.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as any;
        if (mat?.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      });

      scene.add(hallRoot);

      // ✅ 무조건 웨이포인트로 시작 포즈 적용
      const r = applyWaypoint(camera, startWaypointId, fov);
      fixedY = lockYToWaypoint ? r.fixedY : null;
    },
    undefined,
    (err) => console.error("[Hall] Failed to load GLB:", err)
  );

  /* Resize */
  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);

  /* Loop */
  const clock = new THREE.Clock();
  const v = new THREE.Vector3();

  let alive = true;
  function tick() {
    if (!alive) return;

    const dt = Math.min(clock.getDelta(), 0.033);

    if (controls.isLocked) {
      const speed = moveSpeed * (keys.shift ? 1.8 : 1.0);

      v.set(0, 0, 0);
      if (keys.w) v.z -= 1;
      if (keys.s) v.z += 1;
      if (keys.a) v.x -= 1;
      if (keys.d) v.x += 1;

      if (v.lengthSq() > 0) {
        v.normalize().multiplyScalar(speed * dt);
        controls.moveRight(v.x);
        controls.moveForward(v.z);
      }

      // ✅ 여기서 1.65로 고정하면 WAYPOINT y가 깨짐
      if (fixedY !== null) camera.position.y = fixedY;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* Cleanup */
  const destroy = () => {
    alive = false;

    renderer.domElement.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);

    if (hallRoot) {
      hallRoot.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as any;
        if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
        else mat?.dispose?.();
      });
    }

    renderer.dispose();
  };

  return { destroy };
}
