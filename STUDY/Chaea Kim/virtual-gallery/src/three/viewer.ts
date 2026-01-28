import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export function createViewer(canvas: HTMLCanvasElement) {
  /* ======================================================
   * Renderer
   * ====================================================== */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // ✅ 색/톤매핑 (Blender와 가장 “비슷한 계열”로 맞추기)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15; // 필요하면 0.9 ~ 1.6 사이로 튜닝

  /* ======================================================
   * Scene
   * ====================================================== */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111");

  // ✅ 환경광(IBL) 추가: PBR 머티리얼 색감/명암이 안정됨
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ======================================================
   * Camera
   * ====================================================== */
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 5000);
  camera.position.set(0, 2, 6);

  /* ======================================================
   * Controls
   * ====================================================== */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  /* ======================================================
   * Lights
   * ====================================================== */
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  /* ======================================================
   * Resize
   * ====================================================== */
  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  /* ======================================================
   * Loop
   * ====================================================== */
  let running = false;

  const start = (onTick?: () => void) => {
    if (running) return;
    running = true;

    renderer.setAnimationLoop(() => {
      onTick?.();
      controls.update();
      renderer.render(scene, camera);
    });
  };

  const stop = () => {
    if (!running) return;
    running = false;
    renderer.setAnimationLoop(null);
  };

  const dispose = () => {
    stop();
    window.removeEventListener("resize", onResize);
    controls.dispose();
    pmrem.dispose();
    renderer.dispose();
  };

  return { renderer, scene, camera, controls, start, stop, dispose };
}
