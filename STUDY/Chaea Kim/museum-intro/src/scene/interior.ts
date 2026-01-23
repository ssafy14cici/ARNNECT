// src/scene/interior.ts
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type ArtSlot = {
  id: string;
  group: THREE.Group;
  plane: THREE.Mesh;
  maxW: number;
  maxH: number;
  currentW: number;
  currentH: number;
  frame?: THREE.Object3D | null;
};

export type RoomAnchor = {
  id: string;
  cam: THREE.Vector3;
  target: THREE.Vector3;
};

export function buildInterior(root: THREE.Group) {
  const artworks: THREE.Object3D[] = [];
  const artSlots: ArtSlot[] = [];
  const roomAnchors: RoomAnchor[] = [];

  // =========================
  // Materials (톤 차이로 벽이 "보이게")
  // =========================
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.22,
    metalness: 0.02,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: "#f4f4f4",
    roughness: 0.9,
    metalness: 0.0,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: "#fbfbfb",
    roughness: 0.85,
    metalness: 0.0,
  });

  const baseboardMat = new THREE.MeshStandardMaterial({
    color: "#ededed",
    roughness: 0.8,
    metalness: 0.0,
  });

  // =========================
  // Gallery layout
  // =========================
  // 긴 복도 + 방(베이) 4개를 Z축으로 배열
  const G_W = 22;
  const G_H = 9.5;
  const G_D = 70;
  const WALL_T = 0.6;

  // 바닥(흰바닥 고정)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(G_W + 18, G_D + 25), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -25);
  root.add(floor);

  // 천장
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(G_W + 2, G_D + 10),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, G_H, -25);
  root.add(ceiling);

  // 좌/우 외벽
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, G_H, G_D + 10), wallMat);
  leftWall.position.set(-(G_W / 2), G_H / 2, -25);
  root.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, G_H, G_D + 10), wallMat);
  rightWall.position.set(G_W / 2, G_H / 2, -25);
  root.add(rightWall);

  // 뒤쪽(입구쪽) 벽 — “뒤는 못 보게” 느낌 대신, 뒤쪽에 구조물 보이게
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(G_W + 2, G_H, WALL_T), wallMat);
  backWall.position.set(0, G_H / 2, 8);
  root.add(backWall);

  // 정면(끝) 벽
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(G_W + 2, G_H, WALL_T), wallMat);
  frontWall.position.set(0, G_H / 2, -65);
  root.add(frontWall);

  // 걸레받이(좌/우)
  const baseH = 0.22;
  const baseT = 0.08;
  const baseLeft = new THREE.Mesh(new THREE.BoxGeometry(baseT, baseH, G_D + 10), baseboardMat);
  baseLeft.position.set(-(G_W / 2) + WALL_T / 2 + baseT / 2, baseH / 2, -25);
  root.add(baseLeft);

  const baseRight = new THREE.Mesh(new THREE.BoxGeometry(baseT, baseH, G_D + 10), baseboardMat);
  baseRight.position.set((G_W / 2) - WALL_T / 2 - baseT / 2, baseH / 2, -25);
  root.add(baseRight);

  // 천장 몰딩(좌/우)
  const crownT = 0.18;
  const crownH = 0.18;
  const crownLeft = new THREE.Mesh(new THREE.BoxGeometry(crownT, crownH, G_D + 10), trimMat);
  crownLeft.position.set(-(G_W / 2) + WALL_T / 2 + crownT / 2, G_H - crownH / 2, -25);
  root.add(crownLeft);

  const crownRight = new THREE.Mesh(new THREE.BoxGeometry(crownT, crownH, G_D + 10), trimMat);
  crownRight.position.set((G_W / 2) - WALL_T / 2 - crownT / 2, G_H - crownH / 2, -25);
  root.add(crownRight);

  // =========================
  // Lights (내부가 안 보이는 것 방지: 대비/그림자 느낌)
  // =========================
  root.add(new THREE.AmbientLight(0xffffff, 0.65));

  const key = new THREE.DirectionalLight(0xffffff, 0.25);
  key.position.set(2, 10, 4);
  root.add(key);

  // 코브 느낌
  const cove = new THREE.PointLight(0xffffff, 0.25, 120, 2.0);
  cove.position.set(0, G_H - 0.4, -25);
  root.add(cove);

  // =========================
  // Bay(방) 구성: 가벽 + 프레임 위치 앵커
  // =========================
  const BAY_COUNT = 4;
  const BAY_SPACING = 16; // Z 간격
  const BAY_START_Z = -8;

  // 작품 maxW/maxH (업로드되면 비율에 맞춰 plane이 변하고 프레임도 리핏됨)
  const MAX_W = 3.2;
  const MAX_H = 2.2;

  const baseArtMat = new THREE.MeshStandardMaterial({
    color: "#d8d8d8",
    roughness: 0.95,
    metalness: 0.0,
  });

  function addPartition(z: number) {
    // 중앙 가벽(전시 동선 분리)
    const p = new THREE.Mesh(new THREE.BoxGeometry(G_W - 6, G_H, 0.25), wallMat);
    p.position.set(0, G_H / 2, z);
    root.add(p);

    // 코너 기둥 느낌
    const colGeo = new THREE.BoxGeometry(0.28, G_H, 0.28);
    const c1 = new THREE.Mesh(colGeo, trimMat);
    const c2 = new THREE.Mesh(colGeo, trimMat);
    c1.position.set(-3.0, G_H / 2, z);
    c2.position.set(3.0, G_H / 2, z);
    root.add(c1, c2);
  }

  function makeSlot(id: string, pos: THREE.Vector3, rotY: number) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = rotY;
    root.add(g);

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(MAX_W, MAX_H), baseArtMat.clone());
    plane.position.set(0, 0, 0);
    plane.userData.art = { id, title: `Artwork ${id}`, desc: "Upload an image." };

    g.add(plane);
    artworks.push(plane);

    // 작품 스팟
    const s = new THREE.SpotLight(0xffffff, 0.62, 30, Math.PI / 10.5, 0.55, 1.6);
    s.position.set(0, 2.7, 2.8);
    s.target = plane;
    g.add(s);
    g.add(s.target);

    const slot: ArtSlot = {
      id,
      group: g,
      plane,
      maxW: MAX_W,
      maxH: MAX_H,
      currentW: MAX_W,
      currentH: MAX_H,
      frame: null,
    };
    artSlots.push(slot);
    return slot;
  }

  for (let i = 0; i < BAY_COUNT; i++) {
    const bayZ = BAY_START_Z - i * BAY_SPACING;

    // 방 구분 가벽(중간중간)
    addPartition(bayZ - BAY_SPACING / 2);

    // 좌/우 벽 슬롯 2개씩(= 베이당 4개)
    // 왼쪽(벽을 향해 정면)
    makeSlot(`L${i}-1`, new THREE.Vector3(-(G_W / 2) + 1.2, 4.0, bayZ - 4.0), Math.PI / 2);
    makeSlot(`L${i}-2`, new THREE.Vector3(-(G_W / 2) + 1.2, 4.0, bayZ - 10.0), Math.PI / 2);

    // 오른쪽
    makeSlot(`R${i}-1`, new THREE.Vector3((G_W / 2) - 1.2, 4.0, bayZ - 4.0), -Math.PI / 2);
    makeSlot(`R${i}-2`, new THREE.Vector3((G_W / 2) - 1.2, 4.0, bayZ - 10.0), -Math.PI / 2);

    // 방 이동 앵커(카메라/타겟)
    roomAnchors.push({
      id: `ROOM-${i + 1}`,
      cam: new THREE.Vector3(0, 2.2, bayZ + 6.5),
      target: new THREE.Vector3(0, 2.0, bayZ - 6.5),
    });
  }

  // 마지막 끝 벽에 정면 작품 2~3개(요청 반영: 정면에도 있음)
  makeSlot("B-1", new THREE.Vector3(-5.8, 4.0, -64.6), 0);
  makeSlot("B-2", new THREE.Vector3(0.0, 4.0, -64.6), 0);
  makeSlot("B-3", new THREE.Vector3(5.8, 4.0, -64.6), 0);

  // =========================
  // Interior camera preset
  // =========================
  function setInteriorCamera(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    // ✅ 첫 방 앵커로 고정 (내부 들어가자마자 “바닥만” 보이는 상황 차단)
    const first = roomAnchors[0];
    camera.position.copy(first.cam);
    controls.target.copy(first.target);
  }

  return { artworks, artSlots, roomAnchors, setInteriorCamera };
}

/**
 * 업로드 텍스처 적용: 비율 유지 fit + geometry 교체
 */
export function applyArtworkTextureToSlot(slot: ArtSlot, texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const img: any = texture.image;
  const iw = Math.max(1, img?.width ?? img?.videoWidth ?? 1);
  const ih = Math.max(1, img?.height ?? img?.videoHeight ?? 1);
  const aspect = iw / ih;

  const boxAspect = slot.maxW / slot.maxH;
  let w = slot.maxW;
  let h = slot.maxH;

  if (aspect >= boxAspect) {
    w = slot.maxW;
    h = slot.maxW / aspect;
  } else {
    h = slot.maxH;
    w = slot.maxH * aspect;
  }

  const oldGeo = slot.plane.geometry;
  slot.plane.geometry = new THREE.PlaneGeometry(w, h);
  oldGeo.dispose();

  slot.currentW = w;
  slot.currentH = h;

  const mat = slot.plane.material as THREE.MeshStandardMaterial;
  mat.map = texture;
  mat.color.set("#ffffff");
  mat.roughness = 0.95;
  mat.metalness = 0.0;
  mat.needsUpdate = true;
}
