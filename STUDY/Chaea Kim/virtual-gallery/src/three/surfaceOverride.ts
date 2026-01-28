import * as THREE from "three";

export type SurfaceOverrideOptions = {
  /** public 기준 경로 */
  textureUrl: string; // "/assets/floor.png"
  /** 이름 매칭 키워드(소문자 기준) */
  wallKeywords?: string[];
  floorKeywords?: string[];
  ceilingKeywords?: string[];

  /** 반복 타일링 */
  wallRepeat?: [number, number];
  floorRepeat?: [number, number];
  ceilingRepeat?: [number, number];

  /** 밝기/질감 */
  wallRoughness?: number;
  floorRoughness?: number;
  ceilingRoughness?: number;

  /** 전부 덮어쓰기 대신, 기존 재질이 Standard/Physical일 때만 교체하고 싶으면 true */
  onlyPbrMaterials?: boolean;

  /** 적용 제외 키워드 (예: frame, art, glass 등) */
  excludeKeywords?: string[];
};

function lower(s: string) {
  return (s ?? "").toLowerCase();
}

function includesAny(name: string, kws: string[]) {
  const n = lower(name);
  return kws.some((k) => n.includes(k));
}

function isPbrMaterial(mat: THREE.Material) {
  // MeshStandardMaterial / MeshPhysicalMaterial 계열만 “PBR”
  return (mat as any).isMeshStandardMaterial || (mat as any).isMeshPhysicalMaterial;
}

/**
 * ✅ 벽/바닥/천장에 공통 텍스처를 덮어씌우는 유틸
 * - mesh.name 기반으로 필터링
 * - repeat/roughness를 surface 타입별로 다르게 줌
 */
export function applySurfaceTextureOverride(root: THREE.Object3D, renderer: THREE.WebGLRenderer, opts: SurfaceOverrideOptions) {
  const {
    textureUrl,
    wallKeywords = ["wall"],
    floorKeywords = ["floor"],
    ceilingKeywords = ["ceiling", "ceil"],

    wallRepeat = [7, 7],
    floorRepeat = [4, 4],
    ceilingRepeat = [8, 8],

    wallRoughness = 0.92,
    floorRoughness = 0.65,
    ceilingRoughness = 0.96,

    onlyPbrMaterials = false,

    excludeKeywords = ["art_", "frame", "glass", "light", "spot", "bench", "chair", "table", "stand"],
  } = opts;

  const tex = new THREE.TextureLoader().load(textureUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  // 표면별 텍스처 인스턴스를 분리(각각 repeat 다르게)
  const wallTex = tex.clone();
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(wallRepeat[0], wallRepeat[1]);
  wallTex.needsUpdate = true;

  const floorTex = tex.clone();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(floorRepeat[0], floorRepeat[1]);
  floorTex.needsUpdate = true;

  const ceilTex = tex.clone();
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(ceilingRepeat[0], ceilingRepeat[1]);
  ceilTex.needsUpdate = true;

  let applied = 0;

  root.traverse((obj) => {
    if (!(obj as any).isMesh) return;
    const mesh = obj as THREE.Mesh;

    const name = lower(mesh.name);
    if (!name) return;

    // 제외
    if (includesAny(name, excludeKeywords)) return;

    // 다중 재질 지원
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.length) return;

    // onlyPbrMaterials면 PBR 아니면 스킵
    if (onlyPbrMaterials) {
      const ok = materials.some((m) => m && isPbrMaterial(m));
      if (!ok) return;
    }

    // 표면 타입 판별
    const isWall = includesAny(name, wallKeywords);
    const isFloor = includesAny(name, floorKeywords);
    const isCeil = includesAny(name, ceilingKeywords);

    if (!isWall && !isFloor && !isCeil) return;

    const map = isFloor ? floorTex : isCeil ? ceilTex : wallTex;
    const rough = isFloor ? floorRoughness : isCeil ? ceilingRoughness : wallRoughness;

    // 재질 교체(단색 벽을 살리려면 StandardMaterial이 가장 무난)
    const next = new THREE.MeshStandardMaterial({
      map,
      roughness: rough,
      metalness: 0.0,
    });

    mesh.material = Array.isArray(mesh.material) ? next : next;
    (mesh.material as THREE.Material).needsUpdate = true;

    // shadow 옵션(필요 시)
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    applied++;
  });

  console.log(`[SURFACE_OVERRIDE] applied=${applied} url=${textureUrl}`);
}
