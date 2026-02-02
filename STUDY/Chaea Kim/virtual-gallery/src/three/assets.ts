import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function hasParentNamed(obj: THREE.Object3D, targetLower: string) {
  let p: THREE.Object3D | null = obj.parent;
  while (p) {
    const n = (p.name ?? "").toLowerCase();
    if (n === targetLower || n.startsWith(targetLower)) return true;
    p = p.parent;
  }
  return false;
}

export async function loadGallery(url: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;
  root.name = root.name || "GLB_ROOT";

  // ✅ “무광 블랙” 바닥 재질: Standard로는 한계가 있어서 Physical + specularIntensity=0
  const matteBlackFloor = new THREE.MeshPhysicalMaterial({
    color: 0x1f1f1f,        // 더 블랙: 0x070707 / 살짝 밝게: 0x111111
    roughness: 1.0,
    metalness: 0.0,
    clearcoat: 0.0,
    ior: 1.0,
    specularIntensity: 0.0, // ✅ 핵심: 스펙 반사 자체를 0으로
  });
  matteBlackFloor.envMapIntensity = 0.0;
  matteBlackFloor.emissive.setHex(0x000000);
  matteBlackFloor.emissiveIntensity = 0;

  // ✅ 바닥 타겟들: 너 케이스에서 바닥 메쉬가 Object_19였음
  const targetNames = new Set(["object_19", "object_10"]); // 혹시 같은 머티리얼 공유로 Object_10도 바닥일 수 있어서

  let applied = 0;

  root.traverse((o) => {
    if (!(o as any).isMesh) return;
    const mesh = o as THREE.Mesh;

    const n = (mesh.name ?? "").toLowerCase();

    // 1) 이름 정확히 매칭
    // 2) 또는 부모 그룹이 Floor_5인 경우(블렌더 계층 유지될 때)
    const isFloor =
      targetNames.has(n) ||
      hasParentNamed(mesh, "floor_5");

    if (!isFloor) return;

    // ✅ 기존 텍스처/맵 영향 끊고 “무광 블랙” 강제
    mesh.material = matteBlackFloor;
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    applied++;
  });

  console.log(`[FLOOR_MATTE_BLACK] applied=${applied}`);

  return root;
}
