import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type LoadExteriorArgs = {
  parent: THREE.Group;
  url: string;

  // 도트/패턴 바닥 제거용: 큰 플레인으로 덮어버림(건물 색/재질 건드리지 않음)
  overrideFloorPattern?: boolean;
  floorColor?: string;

  onProgress?: (p01: number) => void;
  onLoaded?: (museumScene: THREE.Object3D, museumBox: THREE.Box3) => void;
  onError?: (err: unknown) => void;
};

export function loadMuseumExterior(args: LoadExteriorArgs) {
  const {
    parent,
    url,
    overrideFloorPattern = true,
    floorColor = "#f6f4ef",
    onProgress,
    onLoaded,
    onError,
  } = args;

  if (!parent) throw new Error("[loadMuseumExterior] parent group is required.");

  const loader = new GLTFLoader();

  loader.load(
    url,
    (gltf) => {
      const museum = gltf.scene;

      // 1) 중심 정렬 (x,z 중심 기준)
      const box0 = new THREE.Box3().setFromObject(museum);
      const center = new THREE.Vector3();
      box0.getCenter(center);
      museum.position.sub(center);

      // 2) 바닥(minY) -> 0
      const box1 = new THREE.Box3().setFromObject(museum);
      museum.position.y -= box1.min.y;

      parent.add(museum);

      // 3) 외부 도트/패턴 바닥 제거
      // - GLB 바닥이 반드시 y=0이 아닐 수 있어, "정확한 바닥 상면"을 추정해서 그 위에 덮개를 올립니다.
      if (overrideFloorPattern) {
        const museumBox = new THREE.Box3().setFromObject(museum);
        const floorTopY = museumBox.min.y; // 정렬 이후 minY가 0이 되도록 맞췄으니 보통 0
        // 다만 모델에 따라 minY가 미세하게 바뀔 수 있어 안정 오프셋을 크게 둠
        const coverY = floorTopY + 0.06;

        const cover = new THREE.Mesh(
          new THREE.PlaneGeometry(3200, 3200),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(floorColor),
            roughness: 0.96,
            metalness: 0.0,
            depthWrite: true,
          })
        );
        cover.name = "FLOOR_COVER";
        cover.rotation.x = -Math.PI / 2;
        cover.position.set(0, coverY, 0);
        cover.receiveShadow = false;
        cover.renderOrder = 999;

        const m = cover.material as THREE.MeshStandardMaterial;
        m.polygonOffset = true;
        m.polygonOffsetFactor = -4;
        m.polygonOffsetUnits = -16;

        parent.add(cover);
      }

      const finalBox = new THREE.Box3().setFromObject(museum);
      onLoaded?.(museum, finalBox);
    },
    (xhr) => {
      if (xhr.total && xhr.total > 0) onProgress?.(xhr.loaded / xhr.total);
    },
    (err) => {
      onError?.(err);
    }
  );
}
