import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

let pointLight: THREE.PointLight;
let lightHelperSphere: THREE.Mesh;

export function applyGalleryLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // 노출값: 내부 디테일을 살리기 위해 0.6으로 설정
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6; 
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 안개를 살짝 깔아 깊이감을 줌
  scene.fog = new THREE.FogExp2("#000000", 0.003);

  const loader = new RGBELoader();
  loader.load(`${import.meta.env.BASE_URL}textures/studio_small.hdr`, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = new THREE.Color("#000000");
  });

  // 💡 포인트 라이트: 잡으신 위치 [0.78, 119.2, -152.8] 고정
  // 내부가 보일 수 있도록 강도를 2000으로 적절히 유지
  pointLight = new THREE.PointLight(0xffffff, 2000, 800, 1.8); 
  pointLight.position.set(0.78, 119.2, -152.8); 
  pointLight.castShadow = true;
  scene.add(pointLight);

  // 💡 광원 확인용 헬퍼 (작은 하얀 공)
  const geometry = new THREE.SphereGeometry(0.4, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  lightHelperSphere = new THREE.Mesh(geometry, material);
  lightHelperSphere.position.copy(pointLight.position);
  scene.add(lightHelperSphere);

  // 환경광: 그림자 부분을 아주 미세하게 밝힘
  scene.add(new THREE.AmbientLight(0xffffff, 0.005));
}

// 💡 에러를 해결해줄 Export 함수
export function controlLight(keyCode: string) {
  if (!pointLight || !lightHelperSphere) return;
  const p = pointLight.position;
  const step = 1; 
  switch (keyCode) {
    case "Digit1": p.x -= step; break;
    case "Digit2": p.x += step; break;
    case "Digit3": p.y -= step; break;
    case "Digit4": p.y += step; break;
    case "Digit5": p.z -= step; break;
    case "Digit6": p.z += step; break;
    case "KeyM": console.log(`[LIGHT POS] ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`); break;
  }
  lightHelperSphere.position.copy(p);
}

export function optimizeMaterials(model: THREE.Group) {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      // 벽면 반사 억제 (내부가 더 잘 보이게 함)
      mat.roughness = 0.85; 
      mat.metalness = 0.1;
      mat.color.set("#252525"); 
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

export function createComposer(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  
  // 빛 번짐을 적절히 주어 틈새 느낌 강조
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    0.7, 0.4, 0.85
  );
  composer.addPass(bloomPass);
  return composer;
}