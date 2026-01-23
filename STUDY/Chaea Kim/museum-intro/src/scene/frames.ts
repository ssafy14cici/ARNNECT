// src/scene/frames.ts
/**
 * frames.ts
 * - public/models/frame.glb 를 1회 로드
 * - 슬롯(slot)마다 프레임을 clone해서 부착
 * - 프레임 GLB 축이 제각각이어도 90도 단위 회전 후보를 평가해서
 *   (가로/세로) 목표에 맞고 (두께 Z)가 얇은 방향을 자동 선택
 *
 * 추가:
 * - 업로드로 plane(작품)이 비율에 따라 크기 변경되면,
 *   refitExistingFrameForSlot(slot) 로 기존 프레임을 다시 맞춤
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ArtSlot } from "./interior";

type Look = "wood" | "metal";

let _baseFrameScene: THREE.Object3D | null = null;
let _baseFrameLoaded = false;
let _baseFrameLoading: Promise<void> | null = null;

// base frame에 적용할 재질(룩)
function makeFrameMaterial(look: Look) {
  if (look === "metal") {
    return new THREE.MeshStandardMaterial({
      color: "#c9c9c9",
      roughness: 0.25,
      metalness: 0.85,
    });
  }
  // wood default
  return new THREE.MeshStandardMaterial({
    color: "#2b2217",
    roughness: 0.75,
    metalness: 0.05,
  });
}

/**
 * ✅ 외부에서 호출:
 * attachFramesToArtSlots({ glbUrl, artSlots, look })
 */
export function attachFramesToArtSlots(args: {
  glbUrl: string;
  artSlots: ArtSlot[];
  look?: Look;
}) {
  const { glbUrl, artSlots, look = "wood" } = args;

  // 로딩 중 재진입 방지
  if (_baseFrameLoaded && _baseFrameScene) {
    // 이미 로드됨 → 바로 붙임
    for (const slot of artSlots) attachOrReplaceFrameOnSlot(slot, look);
    return;
  }

  if (!_baseFrameLoading) {
    _baseFrameLoading = new Promise<void>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        glbUrl,
        (gltf) => {
          _baseFrameScene = gltf.scene;
          _baseFrameLoaded = true;
          resolve();
        },
        undefined,
        (err) => {
          reject(err);
        }
      );
    });
  }

  _baseFrameLoading
    .then(() => {
      for (const slot of artSlots) attachOrReplaceFrameOnSlot(slot, look);
    })
    .catch((err) => console.error("[frames] Frame GLB load failed:", err));
}

/**
 * ✅ 업로드 후 호출:
 * - plane geometry가 변경되어 currentW/currentH가 달라졌을 때
 * - 기존 프레임(slot.frame)을 제거하지 않고 “재스케일/재배치”만 수행
 *
 * index.ts에서 import하던 그 함수 이름 그대로 export.
 */
export function refitExistingFrameForSlot(slot: ArtSlot, look: Look = "wood") {
  if (!slot.frame || !_baseFrameScene) return;

  // 기존 프레임이 base clone이 아닐 수도 있으니 안전하게 재핏만 수행
  // (재질은 다시 한번 룩으로 맞춰줌)
  applyLookToFrame(slot.frame, look);

  fitFrameToSlot(slot, slot.frame);
}

/* ======================================================
 * Internal helpers
 * ====================================================== */

function attachOrReplaceFrameOnSlot(slot: ArtSlot, look: Look) {
  if (!_baseFrameScene) return;

  // slot에 기존 frame이 있으면 제거 후 교체(최초 부착 or 룩 변경 시)
  if (slot.frame) {
    slot.group.remove(slot.frame);
    disposeObject(slot.frame);
    slot.frame = null;
  }

  // base clone
  const frame = _baseFrameScene.clone(true);
  applyLookToFrame(frame, look);

  // 자동 방향 선택(축 보정)
  const targetW = slot.currentW * 1.16; // margin
  const targetH = slot.currentH * 1.16; // margin
  const bestRot = findBestAxisAlignedRotation(frame, targetW, targetH);

  frame.rotation.set(bestRot.x, bestRot.y, bestRot.z);

  // slot에 프레임 부착 + 정확 배치
  slot.group.add(frame);
  slot.frame = frame;

  fitFrameToSlot(slot, frame);
}

function fitFrameToSlot(slot: ArtSlot, frame: THREE.Object3D) {
  // ===== 튜닝 상수 =====
  // 벽에서 프레임을 얼마나 띄울지 (slot.group local +Z 방향)
  const FRAME_OUT = 0.09;

  // 프레임 앞면에서 작품 plane을 얼마나 앞에 붙일지
  const PLANE_GAP = 0.006;

  // 목표 프레임(plane보다 약간 큼)
  const targetW = slot.currentW * 1.16;
  const targetH = slot.currentH * 1.16;

  // 1) 현재 회전 기준 bbox → 스케일 산출
  const box0 = new THREE.Box3().setFromObject(frame);
  const size0 = new THREE.Vector3();
  box0.getSize(size0);

  const sx = targetW / Math.max(1e-6, size0.x);
  const sy = targetH / Math.max(1e-6, size0.y);
  const s = Math.min(sx, sy);
  frame.scale.setScalar(s);

  // 2) 스케일 후 중심 정렬
  const box1 = new THREE.Box3().setFromObject(frame);
  const center1 = new THREE.Vector3();
  box1.getCenter(center1);
  frame.position.sub(center1);

  // 3) 중심 정렬 후 bbox 다시 산출(정확한 back/front)
  const box2 = new THREE.Box3().setFromObject(frame);

  const backZ = box2.min.z;  // 가장 뒤(벽쪽)
  const frontZ = box2.max.z; // 가장 앞

  // 4) backZ를 0으로 맞추고 + 바깥으로 FRAME_OUT 만큼 이동
  frame.position.z += -backZ + FRAME_OUT;

  // 5) plane은 프레임 앞면 바로 앞에 붙임(튀어나옴 방지)
  const thickness = frontZ - backZ;
  const frameFrontFaceZ = frame.position.z + thickness;
  slot.plane.position.z = frameFrontFaceZ + PLANE_GAP;
}

function applyLookToFrame(frame: THREE.Object3D, look: Look) {
  const mat = makeFrameMaterial(look);

  frame.traverse((o: any) => {
    if (!o?.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;

    // 기존 재질 교체 (GLB 재질/텍스처 무시하고 룩을 통일)
    o.material = mat.clone();
  });
}

/**
 * 프레임이 어떤 축을 가로/세로/두께로 쓰는지 불명확 → 후보 회전 평가
 * - targetW/targetH에 가까울수록 좋고, size.z(두께)가 얇을수록 더 좋음
 */
function findBestAxisAlignedRotation(obj: THREE.Object3D, targetW: number, targetH: number) {
  const candidates = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

  let best = { x: 0, y: 0, z: 0, score: Number.POSITIVE_INFINITY };

  // 임시 컨테이너에 clone을 넣고 회전 평가(원본 훼손 방지)
  const tmp = obj.clone(true);

  for (const rx of candidates) {
    for (const ry of candidates) {
      for (const rz of candidates) {
        tmp.rotation.set(rx, ry, rz);

        const box = new THREE.Box3().setFromObject(tmp);
        const size = new THREE.Vector3();
        box.getSize(size);

        const errXY = Math.abs(size.x - targetW) + Math.abs(size.y - targetH);
        const thickPenalty = size.z * 4.0;

        const score = errXY + thickPenalty;

        if (score < best.score) best = { x: rx, y: ry, z: rz, score };
      }
    }
  }

  return { x: best.x, y: best.y, z: best.z };
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    if (o?.isMesh) {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    }
  });
}
