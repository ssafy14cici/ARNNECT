import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type WaterWaveHandle = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  tick: (dt: number) => void;
  dispose: () => void;
};

type CreateWaterWaveArgs = {
  url: string;
  /** 물결을 깔 “가로 폭(월드 유닛)” */
  targetWidth: number;
  /** 물결을 깔 “세로(깊이, 월드 유닛)” */
  targetDepth: number;
  /** 바닥 기준 Y 위치 */
  y?: number;
  /** 월드 상에서 중심 위치 */
  center?: THREE.Vector3;
  /** 재생 속도(0.3~0.8 추천) */
  speed?: number;
  /** 바닥과 z-fighting 방지용으로 살짝 띄움 */
  lift?: number;
  /** 투명도(0~1). GLB 머티리얼이 이미 투명 세팅이면 이 값은 약하게만 적용됨 */
  opacity?: number;
};

export async function createWaterWave(args: CreateWaterWaveArgs): Promise<WaterWaveHandle> {
  const {
    url,
    targetWidth,
    targetDepth,
    y = 0,
    center = new THREE.Vector3(0, 0, 0),
    speed = 0.5,
    lift = 0.02,
    opacity = 0.75,
  } = args;

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  const root = new THREE.Group();
  root.name = "WaterWaveRoot";

  // GLB 원본 씬
  const waveScene = gltf.scene;
  waveScene.name = "WaterWaveScene";

  // 바운딩 박스로 자동 스케일 (targetWidth/targetDepth에 맞춰 “깔기”)
  const box = new THREE.Box3().setFromObject(waveScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  // 혹시 glb가 비어 있거나 이상하면 방어
  const safeW = Math.max(size.x, 1e-6);
  const safeD = Math.max(size.z, 1e-6);

  const sx = targetWidth / safeW;
  const sz = targetDepth / safeD;
  // XZ 비율 유지하면서 “면적에 맞게” 스케일: 너무 찌그러지는 게 싫으면 min/max 전략 바꿔도 됨
  const s = Math.min(sx, sz);

  waveScene.scale.setScalar(s);

  // 위치: 중심 맞추고, 바닥으로 내림
  const box2 = new THREE.Box3().setFromObject(waveScene);
  const center2 = new THREE.Vector3();
  box2.getCenter(center2);

  waveScene.position.x += center.x - center2.x;
  waveScene.position.z += center.z - center2.z;

  // 바닥(y)로 맞추기
  const minY = box2.min.y;
  waveScene.position.y += (y - minY) + lift;

  // 머티리얼 튜닝: 바닥에 깔리는 물 느낌 + z-fighting 완화
  const touchedMaterials: THREE.Material[] = [];
  waveScene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    const mat = mesh.material;
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const m of mats) {
      // 중복 push 방지
      if (!touchedMaterials.includes(m)) touchedMaterials.push(m);

      // 대부분 표준 머티리얼이면 아래가 먹힘
      const anyM = m as any;
      if ("transparent" in anyM) anyM.transparent = true;
      if ("opacity" in anyM) anyM.opacity = Math.min(Math.max(opacity, 0), 1);

      // 바닥 겹침 완화(특히 plane 위에 깔 때)
      if ("polygonOffset" in anyM) {
        anyM.polygonOffset = true;
        anyM.polygonOffsetFactor = -1;
        anyM.polygonOffsetUnits = -1;
      }

      // 물처럼 보이게 하려면 depthWrite를 끄는 게 도움이 되는 경우가 많음(상황에 따라 켜도 됨)
      if ("depthWrite" in anyM) anyM.depthWrite = false;
    }
  });

  root.add(waveScene);

  // ✅ GLB 애니메이션 재생 (이 파일은 morphTarget weights 애니메이션이 들어있음)
  const mixer = new THREE.AnimationMixer(waveScene);

  if (gltf.animations && gltf.animations.length > 0) {
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip);
      action.loop = THREE.LoopRepeat;
      action.clampWhenFinished = false;
      action.play();
    }
  } else {
    // 애니가 없다면 여기서 셰이더/CPU 변형으로 가야 함(현재 파일은 애니 있음)
    // console.warn("Water wave GLB has no animations.");
  }

  mixer.timeScale = speed;

  const tick = (dt: number) => {
    mixer.update(dt);
  };

  const dispose = () => {
    mixer.stopAllAction();
    root.remove(waveScene);

    waveScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    });
  };

  return { root, mixer, tick, dispose };
}
