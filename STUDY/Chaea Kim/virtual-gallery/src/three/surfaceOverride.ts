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
};

function lower(s: string) {
  return (s ?? "").toLowerCase();
}

function includesAny(name: string, kws: string[]) {
  const n = lower(name);
  return kws.some((k) => n.includes(k));
}

function isPbrMaterial(mat: THREE.Material) {
  return (mat as any).isMeshStandardMaterial || (mat as any).isMeshPhysicalMaterial;
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

    const next = new THREE.MeshStandardMaterial({
      map,
      color: tint,
      roughness: rough,
      metalness: 0.0,
    });

    mesh.material = next;
    next.needsUpdate = true;

    // ✅ 패턴/그림자 살리려면 receiveShadow
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    applied++;
  });

  console.log(`[SURFACE_OVERRIDE] applied=${applied} url=${textureUrl}`);
}
