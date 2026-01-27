import { CameraControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import Room from "./Room";
import FrameWall, { type FrameItem } from "./FrameWall";
import CeilingDecor from "./CeilingDecor";

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const WIDTH = 18;
const DEPTH = 60;
const HEIGHT = 12;

export default function GalleryScene({ selectedId, onSelect }: Props) {
  const controls = useRef<CameraControls>(null);

  // ✅ 데모 이미지(없어도 죽지 않게 Frame에서 안전 로딩)
  const images = useMemo(
    () => [
      "/demo/1.jpg",
      "/demo/2.jpg",
      "/demo/3.jpg",
      "/demo/4.jpg",
      "/demo/5.jpg",
      "/demo/6.jpg",
      "/demo/7.jpg",
      "/demo/8.jpg",
      "/demo/9.jpg",
      "/demo/10.jpg",
      "/demo/11.jpg",
      "/demo/12.jpg",
    ],
    []
  );

  // ✅ Back/Front 벽에만 배치
  const backFrames = useMemo<FrameItem[]>(() => {
    const urls = images.slice(0, Math.ceil(images.length / 2));
    return urls.map((url, i) => {
      const cols = 6;
      const gapX = WIDTH / (cols + 1);
      const x = -WIDTH / 2 + gapX * ((i % cols) + 1);
      const y = 2.2 + Math.floor(i / cols) * 1.6;
      const z = DEPTH / 2 - 0.02; // back wall (inside)
      return {
        id: `back-${i}`,
        url,
        position: [x, y, z],
        rotation: [0, Math.PI, 0],
        size: [2.4, 1.6],
      };
    });
  }, [images]);

  const frontFrames = useMemo<FrameItem[]>(() => {
    const urls = images.slice(Math.ceil(images.length / 2));
    return urls.map((url, i) => {
      const cols = 6;
      const gapX = WIDTH / (cols + 1);
      const x = -WIDTH / 2 + gapX * ((i % cols) + 1);
      const y = 2.2 + Math.floor(i / cols) * 1.6;
      const z = -DEPTH / 2 + 0.02; // front wall (inside)
      return {
        id: `front-${i}`,
        url,
        position: [x, y, z],
        rotation: [0, 0, 0],
        size: [2.4, 1.6],
      };
    });
  }, [images]);

  const allFrames = useMemo(() => [...backFrames, ...frontFrames], [backFrames, frontFrames]);

  // ✅ 시작 시점: Zone_Left 근처에서 시작(왼쪽 벽 x=-WIDTH/2)
  useEffect(() => {
    const c = controls.current;
    if (!c) return;

    // x는 왼쪽 벽 근처, z는 입구 쪽(앞쪽), 중앙을 바라보게
    c.setLookAt(-WIDTH / 2 + 2.2, 1.6, -DEPTH / 2 + 10, 0, 1.6, -DEPTH / 2 + 26, true);
  }, []);

  // ✅ 선택 시 카메라가 해당 작품 앞으로 이동
  useEffect(() => {
    const c = controls.current;
    if (!c) return;

    if (!selectedId) {
      c.setLookAt(-WIDTH / 2 + 2.2, 1.6, -DEPTH / 2 + 10, 0, 1.6, -DEPTH / 2 + 26, true);
      return;
    }

    const item = allFrames.find((f) => f.id === selectedId);
    if (!item) return;

    const pos = new THREE.Vector3(...item.position);
    const euler = new THREE.Euler(item.rotation[0], item.rotation[1], item.rotation[2]);
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(euler).normalize();

    // 작품 정면에서 거리 두고(2.4m) 조금 위에서 바라보게
    const camPos = pos.clone().add(normal.clone().multiplyScalar(2.4)).add(new THREE.Vector3(0, 0.15, 0));

    c.setLookAt(camPos.x, camPos.y, camPos.z, pos.x, pos.y, pos.z, true);
  }, [selectedId, allFrames]);

  return (
    <>
      <CameraControls ref={controls} makeDefault enabled={!selectedId} />

      <Room width={WIDTH} depth={DEPTH} height={HEIGHT} />

      {/* 천장 장식(은은한 라인) */}
      <CeilingDecor width={WIDTH} depth={DEPTH} height={HEIGHT} />

      <FrameWall items={backFrames} selectedId={selectedId} onSelect={onSelect} />
      <FrameWall items={frontFrames} selectedId={selectedId} onSelect={onSelect} />
    </>
  );
}
