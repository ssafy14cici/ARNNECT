// src/viewer/debugMainHall.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type DebugViewerOptions = {
  glbUrl?: string; // default "/models/main_hall0.glb"
};

export function mountDebugMainHall(canvas: HTMLCanvasElement, opts: DebugViewerOptions = {}) {
  const glbUrl = opts.glbUrl ?? "/models/main_hall0.glb";
  // =========================
  // Renderer (사이즈 강제)
  // =========================
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ✅ 캔버스 CSS를 믿지 않고, 윈도우 기준으로 강제 사이즈
  function applySize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // =========================
  // Scene / Camera
  // =========================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a1a1a");

  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 2000);
  camera.position.set(0, 1.6, 6);

  // =========================
  // Debug Helpers (무조건 보이게)
  // =========================
  scene.add(new THREE.AxesHelper(2));
  scene.add(new THREE.GridHelper(20, 20));

  const dbgBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "hotpink" })
  );
  dbgBox.position.set(0, 0.5, 0);
  scene.add(dbgBox);

  // =========================
  // Lighting (과하게 넣어서 "검게" 방지)
  // =========================
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 2.5);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  const point = new THREE.PointLight(0xffffff, 2.0, 300);
  point.position.set(0, 10, 0);
  scene.add(point);

  // =========================
  // Controls (OrbitControls로 먼저 확인)
  // =========================
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.2, 0);
  controls.update();

  // =========================
  // Load GLB (로그 + 바운딩박스로 카메라 자동배치)
  // =========================
  const loader = new GLTFLoader();

  console.log("[debug] start loading:", glbUrl);

  let root: THREE.Object3D | null = null;

  loader.load(
  glbUrl,
  (gltf) => {
    console.log("[debug] glb loaded ✅");

    root = gltf.scene;
    scene.add(root);

    // -----------------------------------------
    // 1) Mesh들의 "중심점"을 모아 중앙(centroid) 추정
    // -----------------------------------------
    const meshCenters: THREE.Vector3[] = [];
    const tmpBox = new THREE.Box3();
    const tmpCenter = new THREE.Vector3();
    const tmpSize = new THREE.Vector3();

    root.updateWorldMatrix(true, true);

    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.geometry) return;

      tmpBox.setFromObject(mesh);
      if (!isFinite(tmpBox.min.x) || !isFinite(tmpBox.max.x)) return;

      tmpBox.getSize(tmpSize);
      // 너무 작은 조각/노이즈는 제외 (필요시 숫자 조절)
      if (tmpSize.length() < 0.001) return;

      tmpBox.getCenter(tmpCenter);
      meshCenters.push(tmpCenter.clone());
    });

    console.log("[debug] mesh count:", meshCenters.length);

    // 메시가 거의 없으면 fallback: 전체 bbox로
    if (meshCenters.length === 0) {
      console.warn("[debug] no mesh centers; fallback to raw bbox");
      const box = new THREE.Box3().setFromObject(root);
      frameByBox(box);
      return;
    }

    // centroid 계산
    const centroid = new THREE.Vector3();
    for (const c of meshCenters) centroid.add(c);
    centroid.multiplyScalar(1 / meshCenters.length);
    console.log("[debug] centroid:", centroid);

    // -----------------------------------------
    // 2) centroid에서 너무 멀리 떨어진 outlier 제거
    //    - 거리 분포에서 "중간값" 기준으로 컷
    // -----------------------------------------
    const dists = meshCenters.map((c) => c.distanceTo(centroid)).sort((a, b) => a - b);
    const median = dists[Math.floor(dists.length * 0.5)];
    const cutoff = Math.max(median * 4.0, 1.0); // 4배는 꽤 관대. 필요시 2~6 조절
    console.log("[debug] dist median:", median, "cutoff:", cutoff);

    // inlier만으로 bbox 재구성
    const inlierBox = new THREE.Box3();
    inlierBox.makeEmpty();

    // inlier에 해당하는 mesh들만 bbox로 합치기
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      tmpBox.setFromObject(mesh);
      tmpBox.getCenter(tmpCenter);

      const d = tmpCenter.distanceTo(centroid);
      if (d > cutoff) return; // outlier 무시

      inlierBox.union(tmpBox);
    });

    // inlierBox가 비어있으면 fallback
    if (inlierBox.isEmpty()) {
      console.warn("[debug] inlier box empty; fallback to raw bbox");
      const box = new THREE.Box3().setFromObject(root);
      frameByBox(box);
      return;
    }

    // -----------------------------------------
    // 3) ✅ inlierBox 기준으로 스케일 정규화 + 카메라 프레이밍
    // -----------------------------------------
    const size0 = new THREE.Vector3();
    const center0 = new THREE.Vector3();
    inlierBox.getSize(size0);
    inlierBox.getCenter(center0);

    console.log("[debug] inlier bbox size(raw):", size0);
    console.log("[debug] inlier bbox center(raw):", center0);

    // 목표 높이로 스케일 정규화
    const targetHeight = 30; // 🔥 일단 크게 (원하면 20/50로)
    const rawHeight = Math.max(size0.y, 1e-6);
    const s = targetHeight / rawHeight;
    root.scale.setScalar(s);

    // 스케일 후 다시 inlier bbox 계산
    root.updateWorldMatrix(true, true);

    const boxScaled = new THREE.Box3();
    boxScaled.makeEmpty();

    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;

      tmpBox.setFromObject(mesh);
      tmpBox.getCenter(tmpCenter);

      // centroid도 스케일되므로 (대략) center0 기반으로 다시 outlier 제거
      // 여기선 간단하게 "center0 근처" 기준으로 다시 컷
      const d = tmpCenter.distanceTo(center0);
      if (d > cutoff * s) return;

      boxScaled.union(tmpBox);
    });

    if (boxScaled.isEmpty()) {
      console.warn("[debug] scaled inlier box empty; fallback to scaled raw bbox");
      const box = new THREE.Box3().setFromObject(root);
      frameByBox(box);
      return;
    }

    // bbox helper
    const helper = new THREE.Box3Helper(boxScaled, 0xffff00);
    scene.add(helper);

    console.log("[debug] scale applied:", s);
    frameByBox(boxScaled);

    // ---- local util: box로 카메라 프레이밍 ----
    function frameByBox(box: THREE.Box3) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      console.log("[debug] frame box size:", size);
      console.log("[debug] frame box center:", center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fitHeightDist = (maxDim / 2) / Math.tan(fov / 2);
      const fitWidthDist = fitHeightDist / camera.aspect;
      const dist = 1.05 * Math.max(fitHeightDist, fitWidthDist); // 더 가깝게

      camera.position.set(center.x, center.y + maxDim * 0.1, center.z + dist);
      camera.near = Math.max(0.01, dist / 1000);
      camera.far = Math.max(2000, dist * 50);
      camera.updateProjectionMatrix();

      controls.target.copy(center);
      controls.update();
    }
  },
  undefined,
  (err) => console.error("[debug] glb load failed ❌", err)
);


  // =========================
  // Resize / Animate
  // =========================
  applySize();
  const onResize = () => applySize();
  window.addEventListener("resize", onResize);

  let raf = 0;
  const clock = new THREE.Clock();

  function tick() {
    raf = requestAnimationFrame(tick);
    clock.getDelta(); // 필요시 사용
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  // =========================
  // Cleanup
  // =========================
  function destroy() {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    controls.dispose();
    renderer.dispose();

    if (root) {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as any;
        if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
        else mat?.dispose?.();
      });
    }
  }

  return { destroy, scene, camera, renderer, controls };
}
