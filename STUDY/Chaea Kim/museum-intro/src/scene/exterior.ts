import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type LoadExteriorArgs = {
  parent: THREE.Group;
  url: string;

  /**
   * 도트/패턴 바닥 제거용:
   * - GLB 안의 '바닥/그라운드'로 추정되는 메쉬를 숨기고,
   * - 아주 큰 플레인(단색)으로 덮어씌웁니다.
   */
  overrideFloorPattern?: boolean;
  floorColor?: string;

  onProgress?: (p01: number) => void;
  onLoaded?: (museumScene: THREE.Object3D, museumBox: THREE.Box3, animations?: THREE.AnimationClip[]) => void;
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
    (gltf: any) => {
      const museum: THREE.Object3D = gltf.scene;

      // 애니메이션 클립 추출
      const animations: THREE.AnimationClip[] = Array.isArray(gltf.animations) ? gltf.animations : [];

      // 1) 중심 정렬 (x,z 중심 기준)
      const box0 = new THREE.Box3().setFromObject(museum);
      const center = new THREE.Vector3();
      box0.getCenter(center);
      museum.position.sub(center);

      // 2) 바닥(minY) -> 0
      const box1 = new THREE.Box3().setFromObject(museum);
      museum.position.y -= box1.min.y;

      // 3) 바닥 패턴 제거(가장 큰/낮은 플랫 메쉬 숨김) + 단색 플레인 덮기
      if (overrideFloorPattern) {
        const museumBox = new THREE.Box3().setFromObject(museum);
        const floorY = museumBox.min.y;

        // 🔍 먼저 모든 메쉬 정보 출력 (디버깅용)
        console.log("=== 🔍 GLB 내부 메쉬 목록 ===");
        museum.traverse((child: THREE.Object3D) => {
          if (!(child instanceof THREE.Mesh)) return;
          const bbox = new THREE.Box3().setFromObject(child);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          console.log(`📦 ${child.name || "(unnamed)"}:`, {
            size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
            minY: bbox.min.y.toFixed(2),
            floorDiff: (bbox.min.y - floorY).toFixed(2)
          });
        });
        console.log("===================");

        // 기존 바닥만 제거 (계단, 벽 등은 보존)
        museum.traverse((child: THREE.Object3D) => {
          if (!(child instanceof THREE.Mesh)) return;

          const bbox = new THREE.Box3().setFromObject(child);
          const size = new THREE.Vector3();
          bbox.getSize(size);

          const name = (child.name || "").toLowerCase();

          // 계단, 벽 등 건물 구조물은 보존
          const isStairOrStructure =
            name.includes("stair") ||
            name.includes("step") ||
            name.includes("wall") ||
            name.includes("door") ||
            name.includes("window") ||
            name.includes("roof") ||
            name.includes("column") ||
            name.includes("pillar");

          if (isStairOrStructure) {
            console.log("✅ 구조물 보존:", child.name);
            return; // 건물 구조물은 건드리지 않음
          }

          // 바닥으로 의심되는 조건들 (더 공격적으로)
          const isFlat = size.y < 1.0; // 얇은 메쉬 (0.5 -> 1.0으로 완화)
          const isAtFloor = Math.abs(bbox.min.y - floorY) < 2; // 바닥 근처 (1 -> 2로 완화)

          // 크기 조건 완화: 작은 바닥 타일도 잡을 수 있도록
          const isLarge = size.x > 10 || size.z > 10; // 30 -> 10으로 완화

          const looksLikeFloorName =
            name.includes("floor") ||
            name.includes("ground") ||
            name.includes("plane") ||
            name.includes("base") ||
            name.includes("platform") ||
            name.includes("terrain") ||
            name.includes("tile") ||
            name.includes("dot") ||
            name.includes("pattern");

          // 이름이 바닥처럼 보이거나, (얇고 + 넓고 + 바닥 높이)면 제거
          if (looksLikeFloorName || (isFlat && isLarge && isAtFloor)) {
            console.log("🗑️ 바닥 메쉬 숨김:", child.name, "크기:", size);
            child.visible = false;
          }
        });

        // 잔디 바닥 추가
        const grassFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(10000, 10000),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(floorColor),
            roughness: 0.95,
            metalness: 0.0,
          })
        );
        grassFloor.name = "GRASS_FLOOR";
        grassFloor.rotation.x = -Math.PI / 2;
        grassFloor.position.set(0, floorY + 0.01, 0);
        grassFloor.receiveShadow = true;
        parent.add(grassFloor);

        // 🌸 산책로 (건물 정면)
        const pathMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#d4c4b0"),
          roughness: 0.85,
          metalness: 0.0,
        });

        const mainPath = new THREE.Mesh(
          new THREE.PlaneGeometry(25, 6), // 길이 25, 폭 6 (90도 회전)
          pathMaterial
        );
        mainPath.rotation.x = -Math.PI / 2;
        mainPath.position.set(15, floorY + 0.15, 0); // 건물 옆쪽 (x 양수)
        mainPath.receiveShadow = true;
        mainPath.renderOrder = 1;
        parent.add(mainPath);

        // 🌳 나무 만들기
        const addTree = (x: number, z: number, scale = 1, hue = 0.3) => {
          const treeY = floorY + 0.2;

          // 나무 기둥
          const trunkMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#6b4423"),
            roughness: 0.95,
          });
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 3.5 * scale, 8),
            trunkMat
          );
          trunk.position.set(x, treeY + 1.75 * scale, z);
          trunk.castShadow = true;
          parent.add(trunk);

          // 나뭇잎
          const leafColor = new THREE.Color().setHSL(hue, 0.6, 0.35);
          const leavesMat = new THREE.MeshStandardMaterial({
            color: leafColor,
            roughness: 0.85,
          });

          const leaves1 = new THREE.Mesh(
            new THREE.SphereGeometry(1.4 * scale, 12, 12),
            leavesMat
          );
          leaves1.position.set(x, treeY + 4 * scale, z);
          leaves1.castShadow = true;
          parent.add(leaves1);

          const leaves2 = new THREE.Mesh(
            new THREE.SphereGeometry(0.9 * scale, 10, 10),
            leavesMat
          );
          leaves2.position.set(x + 0.6 * scale, treeY + 3.5 * scale, z + 0.4 * scale);
          leaves2.castShadow = true;
          parent.add(leaves2);

          const leaves3 = new THREE.Mesh(
            new THREE.SphereGeometry(0.9 * scale, 10, 10),
            leavesMat
          );
          leaves3.position.set(x - 0.5 * scale, treeY + 3.6 * scale, z - 0.5 * scale);
          leaves3.castShadow = true;
          parent.add(leaves3);
        };

        // 나무 배치 (건물 옆쪽, x > 0)
        addTree(12, 8, 1.3, 0.32);
        addTree(12, -8, 1.1, 0.28);
        addTree(16, 10, 1.0, 0.30);
        addTree(16, -10, 1.2, 0.35);
        addTree(20, 6, 0.9, 0.29);
        addTree(20, -6, 1.4, 0.31);

        // 🌺 꽃밭
        const addFlowerGarden = (x: number, z: number, color: string, size = 1.8) => {
          const soilMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#8b7355"),
            roughness: 0.95,
          });
          const soil = new THREE.Mesh(
            new THREE.CircleGeometry(size, 20),
            soilMat
          );
          soil.rotation.x = -Math.PI / 2;
          soil.position.set(x, floorY + 0.2, z);
          soil.renderOrder = 3;
          parent.add(soil);

          const flowerMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness: 0.7,
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.2,
          });

          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = size * 0.5;
            const flower = new THREE.Mesh(
              new THREE.SphereGeometry(0.15, 8, 8),
              flowerMat
            );
            flower.position.set(
              x + Math.cos(angle) * radius,
              floorY + 0.35,
              z + Math.sin(angle) * radius
            );
            parent.add(flower);
          }
        };

        // 꽃밭 배치 (건물 옆쪽, x > 0)
        addFlowerGarden(9, 7, "#ff69b4", 1.8);
        addFlowerGarden(9, -7, "#ffa500", 1.6);
        addFlowerGarden(14, 9, "#da70d6", 1.7);
        addFlowerGarden(14, -9, "#ff6b9d", 1.9);
        addFlowerGarden(18, 5, "#ffb6c1", 1.5);
        addFlowerGarden(18, -5, "#ffd700", 1.5);

        // 🌿 덤불 (건물 옆쪽 반원, x > 0)
        const bushMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#5a8f3a"),
          roughness: 0.9,
        });

        for (let i = 0; i < 12; i++) {
          const bush = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 8, 8),
            bushMat
          );
          // 0 ~ π 범위 (반원, 옆쪽만)
          const angle = (i / 12) * Math.PI;
          const radius = 10 + Math.random() * 6; // 건물에서 더 멀리
          bush.position.set(
            Math.abs(Math.sin(angle) * radius), // x는 항상 양수
            floorY + 0.4,
            Math.cos(angle) * radius // z는 -radius ~ +radius
          );
          bush.scale.y = 0.6;
          parent.add(bush);
        }
      }

      parent.add(museum);

      const museumBox = new THREE.Box3().setFromObject(museum);
      onLoaded?.(museum, museumBox, animations);
    },
    (xhr: any) => {
      if (!xhr || !xhr.total) return;
      const p01 = Math.min(1, Math.max(0, xhr.loaded / xhr.total));
      onProgress?.(p01);
    },
    (err: any) => {
      onError?.(err);
    }
  );
}
