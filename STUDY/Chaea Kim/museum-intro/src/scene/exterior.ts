// src/scene/exterior.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * 외관 로더
 * - 건물(미술관) GLB의 재질/색/텍스처를 절대 수정하지 않음
 * - 대신, 보기 싫은 바닥 패턴(도트 등)을 "흰색 덮개 Plane"으로 가림
 */
export function loadMuseumExterior(args: {
  parent: THREE.Group; // 외부 그룹(exterior)에 붙일 것
  url: string;
  floorCover?: {
    enabled: boolean;
    color?: string;  // 기본 흰색
    size?: number;   // 기본 900
    y?: number;      // 기본 0.06
  };
  onProgress?: (p01: number) => void;
  onLoaded: (museumScene: THREE.Object3D) => void;
  onError?: (err: unknown) => void;
}) {
  const { parent, url, floorCover, onProgress, onLoaded, onError } = args;

  if (!parent) {
    throw new Error("[loadMuseumExterior] parent(group) is required.");
  }

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      const museum = gltf.scene;

      // 1) 중심 정렬 (x,z)
      const box0 = new THREE.Box3().setFromObject(museum);
      const center0 = new THREE.Vector3();
      box0.getCenter(center0);
      museum.position.x -= center0.x;
      museum.position.z -= center0.z;

      // 2) 바닥(minY) -> 0
      const box1 = new THREE.Box3().setFromObject(museum);
      museum.position.y -= box1.min.y;

      parent.add(museum);

      // 3) 바닥 덮개(흰색) - GLB 바닥 패턴 가림
      const fc = floorCover ?? { enabled: true };
      if (fc.enabled) {
        const size = fc.size ?? 900;
        const y = fc.y ?? 0.06; // 너무 낮으면 비침, 너무 높으면 떠 보임 → 중간값
        const color = fc.color ?? "#ffffff";

        const cover = new THREE.Mesh(
          new THREE.PlaneGeometry(size, size),
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.95,
            metalness: 0.0,
          })
        );
        cover.rotation.x = -Math.PI / 2;
        cover.position.set(0, y, 0);

        // 렌더 우선순위로 "바닥 패턴 위"에 그려지게
        cover.renderOrder = 999;
        (cover.material as THREE.MeshStandardMaterial).depthWrite = true;

        parent.add(cover);
      }

      onLoaded(museum);
    },
    (xhr) => {
      if (onProgress && xhr.total && xhr.total > 0) {
        onProgress(xhr.loaded / xhr.total);
      }
    },
    (err) => {
      onError?.(err);
    }
  );
}
