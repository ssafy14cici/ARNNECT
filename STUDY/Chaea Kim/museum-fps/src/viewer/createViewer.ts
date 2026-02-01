// src/viewer/createViewer.ts
import * as THREE from "three";

export type TickFn = (dt: number) => void;

export type Viewer = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  addTick: (fn: TickFn) => () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

export function createViewer(canvas: HTMLCanvasElement): Viewer {
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

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 5000);
  camera.position.set(0, 1.6, 5);

  const ticks = new Set<TickFn>();
  let raf = 0;
  let last = performance.now();
  let running = false;

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  const loop = () => {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    for (const fn of ticks) fn(dt);
    renderer.render(scene, camera);

    raf = requestAnimationFrame(loop);
  };

  const addTick = (fn: TickFn) => {
    ticks.add(fn);
    return () => ticks.delete(fn);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    window.addEventListener("resize", onResize);
    onResize();
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    window.removeEventListener("resize", onResize);
  };

  const dispose = () => {
    stop();
    ticks.clear();
    renderer.dispose();
  };

  return { renderer, scene, camera, addTick, start, stop, dispose };
}
