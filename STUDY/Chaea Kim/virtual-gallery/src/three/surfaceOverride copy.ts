import * as THREE from "three";

export type SurfaceOverrideOptions = {
  textureUrl: string;

  wallKeywords?: string[];
  floorKeywords?: string[];
  ceilingKeywords?: string[];

  wallRepeat?: [number, number];
  floorRepeat?: [number, number];
  ceilingRepeat?: [number, number];

  wallRoughness?: number;
  floorRoughness?: number;
  ceilingRoughness?: number;

  wallTint?: number;
  floorTint?: number;
  ceilingTint?: number;

  onlyPbrMaterials?: boolean;
  excludeKeywords?: string[];

  /**
   * ✅ 특정 메쉬(이름)만 "무광" 강제 튜닝
   * - 기본값: ["floor_5"] (대소문자 무시)
   * - 원치 않으면 [] 로 넘기면 됨
   */
  matteMeshNames?: string[];

  /** matteMeshNames에 적용될 roughness */
  matteRoughness?: number;

  /** matteMeshNames에 적용될 envMapIntensity (반사 억제) */
  matteEnvMapIntensity?: number;

  /** matteMeshNames에 roughnessMap이 있으면 끊어보기 (테스트 핵심) */
  matteRemoveRoughnessMap?: boolean;

  /** matteMeshNames에 clearcoat 있으면 제거 */
  matteDisableClearcoat?: boolean;
};

export type MatteByNameOptions = {
  names: string[]; // ex) ["Floor_5"]
  roughness?: number; // default 0.92
  metalness?: number; // default 0
  envMapIntensity?: number; // default 0.08
  removeRoughnessMap?: boolean; // default true
  disableClearcoat?: boolean; // default true
};

function lower(s: string) {
  return (s ?? "").toLowerCase();
}

function includesAny(name: string, kws: string[]) {
  const n = lower(name);
  return kws.some((k) => n.includes(lower(k)));
}

function isPbrMaterial(mat: THREE.Material) {
  return (mat as any).isMeshStandardMaterial || (mat as any).isMeshPhysicalMaterial;
}

function nameMatches(name: string, list: string[]) {
  const n = lower(name);
  return list.some((x) => n === lower(x));
}

function applyMatteToMaterial(mat: any, opts: Required<Pick<MatteByNameOptions,
  "roughness" | "metalness" | "envMapIntensity" | "removeRoughnessMap" | "disableClearcoat"
>>) {
  // PBR만
  if (mat.roughness === undefined) return;

  if (opts.removeRoughnessMap && mat.roughnessMap) mat.roughnessMap = null;

  mat.metalness = opts.metalness;
  mat.roughness = opts.roughness;

  if (mat.envMapIntensity !== undefined) {
    mat.envMapIntensity = opts.envMapIntensity;
  }

  if (opts.disableClearcoat && mat.clearcoat !== undefined) {
    mat.clearcoat = 0.0;
    mat.clearcoatRoughness = 1.0;
  }

  // three r152+에서 있을 수 있음
  if (mat.specularIntensity !== undefined) {
    mat.specularIntensity = Math.min(mat.specularIntensity ?? 1, 0.25);
  }

  mat.needsUpdate = true;
}

/**
 * ✅ GLB 로드 직후, 특정 메쉬 이름만 재질을 "무광"으로 강제
 * - Floor_5 같은 바닥만 반짝일 때 테스트/고정용
 */
export function applyMatteByName(root: THREE.Object3D, opts: MatteByNameOptions) {
  const names = (opts.names ?? []).map(lower);
  if (!names.length) return;

  const roughness = opts.roughness ?? 0.92;
  const metalness = opts.metalness ?? 0.0;
  const envMapIntensity = opts.envMapIntensity ?? 0.08;
  const removeRoughnessMap = opts.removeRoughnessMap ?? true;
  const disableClearcoat = opts.disableClearcoat ?? true;

  let touched = 0;

  root.traverse((obj) => {
    if (!(obj as any).isMesh) return;

    const mesh = obj as THREE.Mesh;
    if (!nameMatches(mesh.name, names)) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of materials) {
      if (!m) continue;
      if (!isPbrMaterial(m)) continue;

      applyMatteToMaterial(m as any, {
        roughness,
        metalness,
        envMapIntensity,
        removeRoughnessMap,
        disableClearcoat,
      });

      touched++;
    }

    // 바닥은 shadow 받는 게 자연스러움
    mesh.castShadow = false;
    mesh.receiveShadow = true;
  });

  console.log(`[MATTE_BY_NAME] touched=${touched} names=${names.join(",")}`);
}

export function applySurfaceTextureOverride(
  root: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  opts: SurfaceOverrideOptions
) {
  const {
    textureUrl,
    wallKeywords = ["wall"],
    floorKeywords = ["floor"],
    ceilingKeywords = ["ceiling", "ceil"],

    wallRepeat = [7, 7],
    floorRepeat = [4, 4],
    ceilingRepeat = [8, 8],

    // ✅ 너무 매트하면 빛을 먹어서 칙칙해짐
    wallRoughness = 0.72,
    floorRoughness = 0.55,
    ceilingRoughness = 0.85,

    // ✅ 전시장 벽 따뜻한 톤
    wallTint = 0xefe6da,
    floorTint = 0xffffff,
    ceilingTint = 0xffffff,

    onlyPbrMaterials = false,

    excludeKeywords = ["art_", "frame", "glass", "light", "spot", "bench", "chair", "table", "stand"],

    // ✅ 여기부터 Floor_5 무광 강제 기본값
    matteMeshNames = ["floor_5"],
    matteRoughness = 0.92,
    matteEnvMapIntensity = 0.08,
    matteRemoveRoughnessMap = true,
    matteDisableClearcoat = true,
  } = opts;

  const baseTex = new THREE.TextureLoader().load(textureUrl);
  baseTex.colorSpace = THREE.SRGBColorSpace;
  baseTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  baseTex.wrapS = baseTex.wrapT = THREE.RepeatWrapping;

  const wallTex = baseTex.clone();
  wallTex.repeat.set(wallRepeat[0], wallRepeat[1]);
  wallTex.needsUpdate = true;

  const floorTex = baseTex.clone();
  floorTex.repeat.set(floorRepeat[0], floorRepeat[1]);
  floorTex.needsUpdate = true;

  const ceilTex = baseTex.clone();
  ceilTex.repeat.set(ceilingRepeat[0], ceilingRepeat[1]);
  ceilTex.needsUpdate = true;

  let applied = 0;

  root.traverse((obj) => {
    if (!(obj as any).isMesh) return;
    const mesh = obj as THREE.Mesh;

    const name = lower(mesh.name);
    if (!name) return;

    if (includesAny(name, excludeKeywords)) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.length) return;

    if (onlyPbrMaterials) {
      const ok = materials.some((m) => m && isPbrMaterial(m));
      if (!ok) return;
    }

    const isWall = includesAny(name, wallKeywords);
    const isFloor = includesAny(name, floorKeywords);
    const isCeil = includesAny(name, ceilingKeywords);
    if (!isWall && !isFloor && !isCeil) return;

    const map = isFloor ? floorTex : isCeil ? ceilTex : wallTex;
    const rough = isFloor ? floorRoughness : isCeil ? ceilingRoughness : wallRoughness;
    const tint = isFloor ? floorTint : isCeil ? ceilingTint : wallTint;

    const next: any = new THREE.MeshStandardMaterial({
      map,
      color: tint,
      roughness: rough,
      metalness: 0.0,
    });

    // ✅ 블랙 전시장에서는 env 반사가 과하면 플라스틱/번쩍임이 커짐
    // (있을 때만)
    if (next.envMapIntensity !== undefined) next.envMapIntensity = 0.25;

    // ✅ 재질 교체
    mesh.material = next;
    next.needsUpdate = true;

    // ✅ 패턴/그림자 살리려면 receiveShadow
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    applied++;

    // ✅ Floor_5 같은 특정 메쉬는 "완전 무광"으로 한 번 더 강제
    if (matteMeshNames.length && nameMatches(mesh.name, matteMeshNames)) {
      applyMatteToMaterial(next, {
        roughness: matteRoughness,
        metalness: 0.0,
        envMapIntensity: matteEnvMapIntensity,
        removeRoughnessMap: matteRemoveRoughnessMap,
        disableClearcoat: matteDisableClearcoat,
      });
    }
  });

  console.log(`[SURFACE_OVERRIDE] applied=${applied} url=${textureUrl}`);
}
