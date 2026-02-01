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

  /**
   * ✅ 무광 블랙 전시장(레퍼런스 톤) 원하면 false가 정답
   * RoomEnvironment는 검은 바닥/벽을 회색으로 띄우는 원흉임
   */
  useProceduralEnvironment?: boolean;
};

export function createViewer(canvas: HTMLCanvasElement, opts: ViewerOpts = {}): Viewer {
  // ✅ 레퍼런스 같은 다크 톤 기본값
  const exposure = opts.exposure ?? 0.9;
  const backgroundColor = opts.backgroundColor ?? 0x0b0b0b;

  // ✅ 기본 false: 환경광(바운스) 제거 -> 블랙이 회색으로 뜨는 것 방지
  const useProceduralEnvironment = opts.useProceduralEnvironment ?? false;

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

  // ✅ 환경광은 기본 OFF (무광 블랙 목표)
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
   * Lights (Dark gallery)
   * ========================= */

  // ✅ 바닥/벽이 회색으로 뜨는 원인은 “바운스성 조명”이 많아서임
  // Ambient/Hemisphere를 극도로 약하게
  scene.add(new THREE.AmbientLight(0xffffff, 0.01));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.05));

  // ✅ Key light(스포트/키) 느낌: 강도 낮게
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
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

  // ✅ Fill: 대비만 조금 풀기
  const fill = new THREE.DirectionalLight(0xffffff, 0.15);
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
