// src/viewer/mainHall.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

type Options = {
  glbUrl?: string; // default: "/models/mh_add_5.glb"
  moveSpeed?: number; // units/sec
  lookSpeed?: number; // PointerLockControls는 내부적으로 처리, 여기선 따로 안 씀
};

export function mountMainHallViewer(canvas: HTMLCanvasElement, opts: Options = {}) {
  const glbUrl = opts.glbUrl ?? "/models/mh_add_5.glb";
  const moveSpeed = opts.moveSpeed ?? 3.5;

  /* ---------------------------
   * Renderer
   * --------------------------- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  // ✅ 색감(칙칙함) 관련 핵심: sRGB + 톤매핑
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  /* ---------------------------
   * Scene / Camera
   * --------------------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111111");

  const camera = new THREE.PerspectiveCamera(
    65,
    canvas.clientWidth / canvas.clientHeight,
    0.05,
    500
  );
  camera.position.set(0, 1.65, 4); // 사람 눈높이

  /* ---------------------------
   * Controls: PointerLock + WASD
   * --------------------------- */
  const controls = new PointerLockControls(camera, renderer.domElement);

  // 클릭하면 마우스룩 진입
  const onClick = () => {
    if (!controls.isLocked) controls.lock();
  };
  renderer.domElement.addEventListener("click", onClick);

  // WASD 입력
  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyW") keys.w = true;
    if (e.code === "KeyA") keys.a = true;
    if (e.code === "KeyS") keys.s = true;
    if (e.code === "KeyD") keys.d = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = true;
    // ESC는 PointerLockControls가 기본적으로 해제됨
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

  /* ---------------------------
   * Lighting (실내 기본)
   * --------------------------- */
  // 전체 기본광 (너무 어둡지 않게)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  // 천장 방향 디렉셔널
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // 살짝 포인트라이트 (공간감)
  const point = new THREE.PointLight(0xffffff, 0.6, 50);
  point.position.set(0, 4, 0);
  scene.add(point);

  /* ---------------------------
   * Load GLB
   * --------------------------- */
  const loader = new GLTFLoader();

  let hallRoot: THREE.Object3D | null = null;
  let hallBox = new THREE.Box3();
  let hallCenter = new THREE.Vector3();
  let hallSize = new THREE.Vector3();

  const setCommonGLTFFixes = (root: THREE.Object3D) => {
    root.traverse((obj) => {
      // Mesh만 처리
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      // 그림자 (원하면 켜도 됨. 일단 성능/아티팩트 때문에 기본 off)
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      // 물질 색공간/톤 이슈는 보통 텍스처쪽인데,
      // GLTFLoader가 sRGB 처리 해주긴 함. 그래도 MeshStandardMaterial 계열이면 OK.
      const mat = mesh.material as any;
      if (mat && mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
      }
    });
  };

  const placeCameraInside = (root: THREE.Object3D) => {
    hallBox = new THREE.Box3().setFromObject(root);
    hallBox.getCenter(hallCenter);
    hallBox.getSize(hallSize);

    // 공간 크기에 따라 카메라 초기 위치를 "중앙 + 약간 뒤"로
    // Z 방향이 반대일 수도 있어서, 가장 긴 축을 기준으로 적당히 배치
    const maxDim = Math.max(hallSize.x, hallSize.y, hallSize.z);
    const start = hallCenter.clone().add(new THREE.Vector3(0, 1.65, maxDim * 0.2));
    camera.position.copy(start);

    // 중앙 쪽을 바라보게
    camera.lookAt(hallCenter.x, 1.65, hallCenter.z);
  };

  loader.load(
    glbUrl,
    (gltf) => {
      hallRoot = gltf.scene;
      setCommonGLTFFixes(hallRoot);

      // 필요하면 여기서 scale 조정
      // hallRoot.scale.setScalar(1);

      scene.add(hallRoot);

      // 카메라를 내부로 배치
      placeCameraInside(hallRoot);
    },
    (ev) => {
      // console.log("loading", (ev.loaded / (ev.total || 1)) * 100);
    },
    (err) => {
      console.error("Failed to load GLB:", err);
    }
  );

  /* ---------------------------
   * Resize
   * --------------------------- */
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);

  /* ---------------------------
   * Animation loop
   * --------------------------- */
  const clock = new THREE.Clock();
  const v = new THREE.Vector3();

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.033);

    // 이동: PointerLock 상태에서만
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

      // "바닥에 박힘" 방지용: Y 고정(간단 버전)
      camera.position.y = 1.65;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  /* ---------------------------
   * Cleanup
   * --------------------------- */
  const destroy = () => {
    renderer.domElement.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", resize);

    // scene dispose (간단 처리)
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

  return { destroy, scene, camera, controls };
}
