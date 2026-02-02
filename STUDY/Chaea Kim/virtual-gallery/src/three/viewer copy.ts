import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Viewer = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  start: (onTick?: () => void) => void;
};

type ViewerOpts = {
  exposure?: number;
  backgroundColor?: number;
  /** HDR 없이도 PBR이 죽지 않게 (권장 true) */
  useProceduralEnvironment?: boolean;
};

export function createViewer(canvas: HTMLCanvasElement, opts: ViewerOpts = {}): Viewer {
  const exposure = opts.exposure ?? 1.0; // ✅ 기본을 밝게
  const backgroundColor = opts.backgroundColor ?? 0xf2f2f2;
  const useProceduralEnvironment = opts.useProceduralEnvironment ?? true;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.physicallyCorrectLights = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);

  // ✅ HDR 없이도 재질(표준/피지컬) “회색 플라스틱” 방지
  if (useProceduralEnvironment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();
  } else {
    scene.environment = null;
  }

  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 5000);
  camera.position.set(0, 1.8, 6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.minDistance = 0.6;
  controls.maxDistance = 80;

  /* =========================
   * Lights (HDR 없이도 따뜻하게)
   * ========================= */

  // 베이스는 약하게(과하면 평면 됨)
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d9d9, 0.35));

  // ✅ 태양광: 따뜻한 색 + 그림자 ON
  const sun = new THREE.DirectionalLight(0xfff2dc, 3.2);
  sun.position.set(12, 18, 6);
  sun.castShadow = true;

  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 140;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;

  sun.shadow.bias = -0.00008;
  sun.shadow.normalBias = 0.02;

  scene.add(sun);

  // 보조광(대비 완화)
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-10, 8, -6);
  fill.castShadow = false;
  scene.add(fill);

  /* =========================
   * Resize
   * ========================= */
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(resize);
  requestAnimationFrame(resize);

  const start = (onTick?: () => void) => {
    renderer.setAnimationLoop(() => {
      onTick?.();
      controls.update();
      renderer.render(scene, camera);
    });
  };

  return { renderer, scene, camera, controls, start };
}
