// src/intro/waveField.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


export type WaveFieldHandle = {
  root: THREE.Group;
  tick: (dt: number) => void;
  dispose: () => void;
};

type CreateWaveFieldArgs = {
  url: string;

  /** 타일 이동 스냅 기준(보통 baseTarget) */
  centerRef: THREE.Vector3;

  /** ✅ 그라데이션 기준 카메라 */
  cameraRef: THREE.PerspectiveCamera;

  /** 바다 y 높이 */
  y: number;

  /** 타일 하나의 월드 크기 */
  tileWorldSize: number;

  /** half=4 => 9x9 */
  halfTiles: number;

  lift?: number;
  speed?: number;

  /** 끊김 숨김 */
  overlapRatio?: number;
  edgeFade?: number;

  /** 물 존재감 */
  opacity?: number;

  /** 근/원 밝기 */
  nearBoost?: number;
  farBoost?: number;
  gradientGamma?: number;

  /** ✅ 근/원 “색” 그라데이션 (좌우 조명차를 이걸로 덮어버림) */
  nearColor?: string; // 계단쪽(가까움) 밝은 바다
  farColor?: string; // 수평선(멀리) 어두운 바다
  colorMix?: number; // 0~1 (1에 가까울수록 조명 무시하고 그라데이션 색이 지배)

  /** 물 색감/질감 */
  tintColor?: string;
  tintStrength?: number;
  emissiveColor?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;

  /** seam cover 레이어 */
  useSeamCoverLayer?: boolean;
  coverOpacityMul?: number;
};

export async function createWaveField(args: CreateWaveFieldArgs): Promise<WaveFieldHandle> {
  const {
    url,
    centerRef,
    cameraRef,
    y,
    tileWorldSize,
    halfTiles,

    lift = 0.02,
    speed = 0.45,

    overlapRatio = 0.12,
    edgeFade = 0.05,
    opacity = 0.92,

    nearBoost = 1.55,
    farBoost = 0.55,
    gradientGamma = 1.25,

    // ✅ “계단쪽 밝고, 수평선 어둡게” 컬러를 강제로 만든다
    nearColor = "#dbe9ff",
    farColor = "#1f3b8f",
    colorMix = 0.75, // 0.65~0.85 추천

    tintColor = "#2a67ff",
    tintStrength = 0.65,
    emissiveColor = "#0a2c66",
    emissiveIntensity = 0.10,

    // ✅ 좌우 하이라이트(조명) 차이를 줄이려면 roughness 올리고 envMapIntensity 낮춰야 함
    roughness = 0.55,
    metalness = 0.04,
    envMapIntensity = 0.55,

    useSeamCoverLayer = true,
    coverOpacityMul = 0.78,
  } = args;

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  const root = new THREE.Group();
  root.name = "WaveField";

  // ---------- uniforms ----------
  const uNearDepth = { value: 0.0 };
  const uFarDepth = { value: 1.0 };
  const uNearBoost = { value: nearBoost };
  const uFarBoost = { value: farBoost };
  const uGamma = { value: gradientGamma };
  const uEdgeFade = { value: edgeFade };

  const uNearCol = { value: new THREE.Color(nearColor) };
  const uFarCol = { value: new THREE.Color(farColor) };
  const uColorMix = { value: THREE.MathUtils.clamp(colorMix, 0, 1) };

  // ---------- template ----------
  const source = gltf.scene;
  source.name = "WaveSource";
  source.updateMatrixWorld(true);

  // 1) 스케일: tileWorldSize에 맞추기 (XZ)
  {
    const box0 = new THREE.Box3().setFromObject(source);
    const size0 = new THREE.Vector3();
    box0.getSize(size0);

    const safeX = Math.max(size0.x, 1e-6);
    const safeZ = Math.max(size0.z, 1e-6);
    const baseXZ = Math.max(safeX, safeZ);
    const s = tileWorldSize / baseXZ;

    source.scale.setScalar(s);
    source.updateMatrixWorld(true);
  }

  // 2) 중심 XZ 정렬 + 바닥 Y 맞추기
  {
    const box1 = new THREE.Box3().setFromObject(source);
    const c1 = new THREE.Vector3();
    box1.getCenter(c1);

    source.position.x += -c1.x;
    source.position.z += -c1.z;

    const box2 = new THREE.Box3().setFromObject(source);
    const minY = box2.min.y;
    source.position.y += (y - minY) + lift;

    source.updateMatrixWorld(true);
  }

  // 3) step 계산 + far depth
  const boxF = new THREE.Box3().setFromObject(source);
  const sizeF = new THREE.Vector3();
  boxF.getSize(sizeF);

  const baseStepX = Math.max(sizeF.x, 1e-6);
  const baseStepZ = Math.max(sizeF.z, 1e-6);

  const stepX = Math.max(baseStepX * (1.0 - overlapRatio), 1e-6);
  const stepZ = Math.max(baseStepZ * (1.0 - overlapRatio), 1e-6);

  {
    const fieldRadius = Math.max(stepX, stepZ) * (halfTiles * 1.05);
    uFarDepth.value = Math.max(fieldRadius, 1e-3);
  }

  // ---------- material patch ----------
  const tint = new THREE.Color(tintColor);
  const emi = new THREE.Color(emissiveColor);

  const sourceMorphMeshes: THREE.Mesh[] = [];

  const patchStandard = (mat: THREE.MeshStandardMaterial, opacityMul: number) => {
    const anyM = mat as any;

    // ✅ 코드 수정 반영 강제 (안 바뀌면 숫자 올리면 됨)
    const PATCH_VER = 6;
    const sig = `${PATCH_VER}|${opacityMul.toFixed(3)}`;
    if (anyM.userData?.__wavePatchSig === sig) return;
    anyM.userData = anyM.userData || {};
    anyM.userData.__wavePatchSig = sig;

    mat.transparent = true;
    mat.opacity = THREE.MathUtils.clamp(opacity * opacityMul, 0, 1);

    mat.depthWrite = false;
    mat.depthTest = true;

    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;

    mat.roughness = roughness;
    mat.metalness = metalness;
    (mat as any).envMapIntensity = envMapIntensity;

    mat.color.lerp(tint, THREE.MathUtils.clamp(tintStrength, 0, 1));
    mat.emissive = emi.clone();
    mat.emissiveIntensity = emissiveIntensity;

    // 텍스처 wrap
    const texKeys: (keyof THREE.MeshStandardMaterial)[] = [
      "map",
      "normalMap",
      "roughnessMap",
      "metalnessMap",
      "aoMap",
      "emissiveMap",
      "alphaMap",
    ];
    for (const k of texKeys) {
      const t = mat[k] as any;
      if (t && t.isTexture) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
      }
    }

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uNearDepth = uNearDepth;
      shader.uniforms.uFarDepth = uFarDepth;
      shader.uniforms.uNearBoost = uNearBoost;
      shader.uniforms.uFarBoost = uFarBoost;
      shader.uniforms.uGamma = uGamma;
      shader.uniforms.uEdgeFade = uEdgeFade;

      shader.uniforms.uNearCol = uNearCol;
      shader.uniforms.uFarCol = uFarCol;
      shader.uniforms.uColorMix = uColorMix;

      // world pos varying
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        "varying vec3 vWorldPos;\nvoid main() {",
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
         vWorldPos = worldPosition.xyz;`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `uniform float uNearDepth;
         uniform float uFarDepth;
         uniform float uNearBoost;
         uniform float uFarBoost;
         uniform float uGamma;
         uniform float uEdgeFade;

         uniform vec3 uNearCol;
         uniform vec3 uFarCol;
         uniform float uColorMix;

         varying vec3 vWorldPos;
         void main() {`,
      );

      // ✅ 핵심: outgoingLight(최종 조명)에 근/원 그라데이션을 적용 + 좌우 조명차를 컬러로 덮기
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <output_fragment>",
        `
        // ---- edge fade ----
        #ifdef USE_UV
          float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
          float aFade = smoothstep(0.0, uEdgeFade, edge);
          diffuseColor.a *= aFade;
        #endif

        // ---- depth along camera view ----
        vec3 viewPos = (viewMatrix * vec4(vWorldPos, 1.0)).xyz;
        float depth = -viewPos.z;

        float tt = clamp((depth - uNearDepth) / max(1e-6, (uFarDepth - uNearDepth)), 0.0, 1.0);
        tt = pow(tt, uGamma);

        // 1) 밝기: 근처 밝고(nearBoost) 멀리 어둡게(farBoost)
        float bb = mix(uNearBoost, uFarBoost, tt);
        outgoingLight *= bb;

        // 2) 색: 근색 -> 원색으로 강제 믹스 (좌우 조명차를 이걸로 눌러버림)
        vec3 gradCol = mix(uNearCol, uFarCol, tt);
        outgoingLight = mix(outgoingLight, gradCol, uColorMix);

        #include <output_fragment>
        `,
      );
    };

    mat.needsUpdate = true; // ✅ 반드시
  };

  const prepObject = (obj: THREE.Object3D, renderOrderBase: number, opacityMul: number) => {
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.renderOrder = renderOrderBase;

      const mat = mesh.material;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        if ((m as any).isMeshStandardMaterial) patchStandard(m as THREE.MeshStandardMaterial, opacityMul);
        else {
          const any = m as any;
          if ("transparent" in any) any.transparent = true;
          if ("opacity" in any) any.opacity = THREE.MathUtils.clamp(opacity * opacityMul, 0, 1);
        }
      }

      const anyMesh = mesh as any;
      if (Array.isArray(anyMesh.morphTargetInfluences)) {
        if (obj === source) sourceMorphMeshes.push(mesh);
      }
    });
  };

  // source patch
  prepObject(source, -5, 1.0);

  // ---------- animation (source만) ----------
  const hasClips = (gltf.animations?.length ?? 0) > 0;
  const mixer = hasClips ? new THREE.AnimationMixer(source) : null;

  if (mixer && gltf.animations) {
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip);
      action.loop = THREE.LoopRepeat;
      action.clampWhenFinished = false;
      action.play();
    }
    mixer.timeScale = speed;
  }

  // ---------- tiles ----------
  type Tile = {
    obj: THREE.Object3D;
    morphMeshes: THREE.Mesh[];
    gx: number;
    gz: number;
    layer: 0 | 1;
  };

  const collectMorphMeshes = (obj: THREE.Object3D): THREE.Mesh[] => {
    const arr: THREE.Mesh[] = [];
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const any = m as any;
      if (Array.isArray(any.morphTargetInfluences)) arr.push(m);
    });
    return arr;
  };

  const cloneWithMaterials = (obj: THREE.Object3D): THREE.Object3D => {
    const c = obj.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as any;
      if (Array.isArray(mat)) mesh.material = mat.map((m) => (m?.clone ? m.clone() : m));
      else if (mat?.clone) mesh.material = mat.clone();
    });
    return c;
  };

  const tiles: Tile[] = [];

  // layer0: source를 (0,0)
  root.add(source);
  tiles.push({ obj: source, morphMeshes: collectMorphMeshes(source), gx: 0, gz: 0, layer: 0 });

  // layer0 clones
  for (let z = -halfTiles; z <= halfTiles; z++) {
    for (let x = -halfTiles; x <= halfTiles; x++) {
      if (x === 0 && z === 0) continue;
      const obj = source.clone(true);
      prepObject(obj, -5, 1.0);
      root.add(obj);
      tiles.push({ obj, morphMeshes: collectMorphMeshes(obj), gx: x, gz: z, layer: 0 });
    }
  }

  // layer1 seam-cover (half-step offset)
  if (useSeamCoverLayer) {
    for (let z = -halfTiles; z <= halfTiles; z++) {
      for (let x = -halfTiles; x <= halfTiles; x++) {
        const obj = cloneWithMaterials(source);
        prepObject(obj, -4, coverOpacityMul);
        root.add(obj);
        tiles.push({ obj, morphMeshes: collectMorphMeshes(obj), gx: x, gz: z, layer: 1 });
      }
    }
  }

  const tileEps = Math.max(tileWorldSize * 1e-5, 0.001);

  const updateTilePositions = () => {
    const snapX = Math.floor(centerRef.x / stepX) * stepX;
    const snapZ = Math.floor(centerRef.z / stepZ) * stepZ;

    const offX = stepX * 0.5;
    const offZ = stepZ * 0.5;

    for (const t of tiles) {
      const parity = (t.gx + t.gz) & 1;

      if (t.layer === 0) {
        t.obj.position.x = snapX + t.gx * stepX;
        t.obj.position.z = snapZ + t.gz * stepZ;
        t.obj.position.y = source.position.y + (parity ? tileEps : 0);
      } else {
        t.obj.position.x = snapX + offX + t.gx * stepX;
        t.obj.position.z = snapZ + offZ + t.gz * stepZ;
        t.obj.position.y = source.position.y + tileEps * 0.5 + (parity ? tileEps : 0);
      }
    }
  };

  const copyMorphInfluences = () => {
    for (const t of tiles) {
      const dstArr = t.morphMeshes;
      const n = Math.min(sourceMorphMeshes.length, dstArr.length);

      for (let i = 0; i < n; i++) {
        const src = (sourceMorphMeshes[i] as any).morphTargetInfluences as number[] | undefined;
        const dst = (dstArr[i] as any).morphTargetInfluences as number[] | undefined;
        if (!src || !dst) continue;

        const m = Math.min(src.length, dst.length);
        for (let k = 0; k < m; k++) dst[k] = src[k];
      }
    }
  };

  updateTilePositions();

  // ✅ tick: 반드시 매 프레임 호출해야 타일/애니 동기화됨
  const tick = (dt: number) => {
    updateTilePositions();
    if (mixer) mixer.update(dt);
    copyMorphInfluences();
    // cameraRef는 셰이더에서 viewMatrix로 쓰니까 별도 uniform 업데이트는 불필요
    // (그래도 cameraRef를 args로 받는 건 “이게 카메라 기준”임을 명확히 하기 위함)
    void cameraRef;
  };

  const disposeMaterial = (mat: any) => {
    if (!mat) return;
    const keys = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "envMap"];
    for (const k of keys) if (mat[k]?.dispose) mat[k].dispose();
    mat.dispose?.();
  };

  const dispose = () => {
    mixer?.stopAllAction();
    root.removeFromParent();

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as any;
      if (Array.isArray(mat)) mat.forEach(disposeMaterial);
      else disposeMaterial(mat);
    });
  };

  return { root, tick, dispose };
}
