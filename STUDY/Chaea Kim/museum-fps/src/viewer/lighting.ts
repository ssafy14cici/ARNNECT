import * as THREE from "three";

export type LightingOptions = {
  exposure?: number;        // default 1.35
  background?: string;      // default "#0f0f0f"
};

export function applyGalleryLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer, opts: LightingOptions = {}) {
  const exposure = opts.exposure ?? 1.35;
  const bg = opts.background ?? "#0f0f0f";

  scene.background = new THREE.Color(bg);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  // HemisphereLight 금지 (좌우 색차 커짐)
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(-120, 170, 80);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.85);
  fill.position.set(150, 130, 130);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.65);
  rim.position.set(0, 230, -170);
  scene.add(rim);

  const gap = new THREE.SpotLight(0xfff2d6, 1.2, 700, Math.PI * 0.12, 0.85, 1.0);
  gap.position.set(0, 240, 140);
  gap.target.position.set(0, 40, 95);
  scene.add(gap);
  scene.add(gap.target);
}
