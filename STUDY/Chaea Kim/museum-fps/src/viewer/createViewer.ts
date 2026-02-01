import * as THREE from "three";

export type Viewer = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  /** 화면 크기/비율 갱신 */
  resize: () => void;

  /** renderer dispose (페이지 leaving용) */
  dispose: () => void;
};

export function createViewer(canvas: HTMLCanvasElement): Viewer {
  // full-screen canvas
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(new THREE.Color("#000000"), 1);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 8000);
  camera.position.set(0, 1.6, 5);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener("resize", resize);

  const dispose = () => {
    window.removeEventListener("resize", resize);
    renderer.dispose();
  };

  return { canvas, renderer, scene, camera, resize, dispose };
}
