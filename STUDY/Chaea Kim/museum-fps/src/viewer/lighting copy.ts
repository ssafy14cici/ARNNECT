import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

let sunLight: THREE.DirectionalLight;

export function applyGalleryLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // 1. 전체적인 노출 설정 (실내 분위기 조절)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.4; 
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 안개를 통해 빛이 닿지 않는 뒤쪽 너머를 어둡게 처리
  scene.fog = new THREE.FogExp2("#000000", 0.004);

  const loader = new RGBELoader();
  loader.load(`${import.meta.env.BASE_URL}textures/studio_small.hdr`, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = new THREE.Color("#000000");
  });

  // 2. 💡 광원 위치 (첫 번째 좌표 근처: 빛이 시작되는 곳)
  // 사용자님이 어두워야 한다고 하신 지점보다 살짝 더 앞/위에서 뒤를 향해 쏩니다.
  sunLight = new THREE.DirectionalLight(0xffffff, 10.0); 
  sunLight.position.set(1.5, 150, 160); // Z를 160으로 밀어내어 앞에서 뒤를 보게 함
  sunLight.castShadow = true;

  // 3. 💡 타겟 위치 (두 번째 좌표: 밝아야 할 곳)
  // 빛이 정확히 이 지점을 조준하여 뒤쪽 공간을 밝힙니다.
  const targetObject = new THREE.Object3D();
  targetObject.position.set(3.1, 140, -130); 
  scene.add(targetObject);
  sunLight.target = targetObject;

  // 그림자 범위 설정 (공간이 길기 때문에 far 값을 충분히 줌)
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 1000;
  sunLight.shadow.camera.left = -200;
  sunLight.shadow.camera.right = 200;
  sunLight.shadow.camera.top = 200;
  sunLight.shadow.camera.bottom = -200;

  scene.add(sunLight);

  // 최소한의 윤곽만 보이게 하는 아주 약한 환경광
  scene.add(new THREE.AmbientLight(0xffffff, 0.005));
}

export function controlLight(keyCode: string) {
  if (!sunLight) return;
  const moveStep = 5;
  const p = sunLight.position;
  switch (keyCode) {
    case "Digit1": p.x -= moveStep; break;
    case "Digit2": p.x += moveStep; break;
    case "Digit3": p.y -= moveStep; break;
    case "Digit4": p.y += moveStep; break;
    case "Digit5": p.z -= moveStep; break;
    case "Digit6": p.z += moveStep; break;
    case "KeyM": console.log(`CURRENT LIGHT POS: ${p.x}, ${p.y}, ${p.z}`); break;
  }
}

export function optimizeMaterials(model: THREE.Group) {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mesh.name.toLowerCase().includes("pcube1")) { // 바닥
        mat.roughness = 0.1;
        mat.metalness = 0.4;
        mat.color.set("#0a0a0a");
      } else { // 벽면
        mat.roughness = 0.9;
        mat.color.set("#050505");
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

export function createComposer(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // 밝은 곳(뒤쪽)에서 빛이 은은하게 퍼져나오도록 설정
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.9);
  composer.addPass(bloomPass);
  return composer;
}