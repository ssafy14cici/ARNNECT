// STUDY/Hyeryeong Kim/exhibition/src/pages/ExhibitionPage.tsx
// - hall_v2.glb 로드
// - 시작점: Wall_Left 쪽 "입장" 시점 고정
// - 천장(메쉬) 흰색 + 위쪽 조명 밝게 / 실내는 덜 밝게(과노출 방지)
// - Wall_Front / Wall_Back 에 각 4장(2x2) 규칙 배치
// - 클릭: 작품 확대(카메라 도리로 줌) + ESC/뒤로가기 버튼으로 복귀
// - OrbitControls TS 에러( args ) 제거 + 타입 에러( axis ) 제거

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------
const MODEL_URL = "/models/hall_v2.glb";

// public/demo 폴더 활용 (Vite: public 기준 절대경로)
const FRONT_IMAGES = ["/demo/1.jpg", "/demo/2.jpg", "/demo/3.jpg", "/demo/4.png"];
const BACK_IMAGES = ["/demo/5.jpg", "/demo/6.jpg", "/demo/7.jpg", "/demo/8.jpg"];

type FocusState = {
  active: boolean;
  // camera animation
  fromPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPos: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number; // 0..1
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getFirstMeshByNamePrefix(scene: THREE.Object3D, prefix: string) {
  let found: THREE.Object3D | undefined;
  scene.traverse((o) => {
    if (found) return;
    if (o.name?.startsWith(prefix)) found = o;
  });
  return found;
}

function getObjectByExactName(scene: THREE.Object3D, name: string) {
  let found: THREE.Object3D | undefined;
  scene.traverse((o) => {
    if (found) return;
    if (o.name === name) found = o;
  });
  return found;
}

// -----------------------------------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------------------------------
export default function ExhibitionPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#e9e9e9" }}>
      <CanvasScene />
    </div>
  );
}

// -----------------------------------------------------------------------------
// CANVAS SCENE
// -----------------------------------------------------------------------------
function CanvasScene() {
  // NOTE: toneMappingExposure로 과노출 방지
  return (
    <Canvas
      shadows={false}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 4, 10] }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.72,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      <SceneInner />
    </Canvas>
  );
}

function SceneInner() {
  const controlsRef = useRef<any>(null);

  // focus(확대) 상태
  const [focus, setFocus] = useState<FocusState | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 모델/벽 참조
  const [room, setRoom] = useState<{
    roomBox?: THREE.Box3;
    center?: THREE.Vector3;
    wallFront?: THREE.Object3D;
    wallBack?: THREE.Object3D;
    wallLeft?: THREE.Object3D;
  }>({});

  const { camera } = useThree();

  // ESC로 복귀
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetView();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, isFocused, focus]);

  const resetView = useCallback(() => {
    if (!room.roomBox || !room.center) return;

    // 시작점(입장)으로 복귀
    const { startPos, startTarget } = computeEntryPose(room.roomBox, room.center);

    const curTarget = controlsRef.current?.target?.clone?.() ?? new THREE.Vector3();
    const curPos = camera.position.clone();

    setFocus({
      active: true,
      fromPos: curPos,
      fromTarget: curTarget,
      toPos: startPos,
      toTarget: startTarget,
      t: 0,
    });
    setIsFocused(false);
  }, [camera.position, room.center, room.roomBox]);

  const onFocusArtwork = useCallback(
    (planeWorldPos: THREE.Vector3, planeWorldNormal: THREE.Vector3, planeHeight: number) => {
      if (!room.center) return;

      // 카메라가 작품을 "정면"으로 보도록 normal 방향 반대로 떨어진 지점으로
      const distance = Math.max(2.4, planeHeight * 1.35); // 너무 가까우면 깨짐 방지
      const toTarget = planeWorldPos.clone();
      const toPos = planeWorldPos.clone().add(planeWorldNormal.clone().multiplyScalar(distance));

      const curTarget = controlsRef.current?.target?.clone?.() ?? new THREE.Vector3();
      const curPos = camera.position.clone();

      setFocus({
        active: true,
        fromPos: curPos,
        fromTarget: curTarget,
        toPos,
        toTarget,
        t: 0,
      });
      setIsFocused(true);
    },
    [camera.position, room.center]
  );

  // focus 애니메이션
  useFrame((_, delta) => {
    if (!focus || !focus.active) return;

    // 0.6초 정도로
    const speed = 1 / 0.6;
    const nextT = clamp01(focus.t + delta * speed);
    const k = easeInOutCubic(nextT);

    const pos = focus.fromPos.clone().lerp(focus.toPos, k);
    const tgt = focus.fromTarget.clone().lerp(focus.toTarget, k);

    camera.position.copy(pos);
    camera.lookAt(tgt);

    if (controlsRef.current) {
      controlsRef.current.target.copy(tgt);
      controlsRef.current.update();
    }

    if (nextT >= 1) {
      setFocus(null);
    } else {
      setFocus((prev) => (prev ? { ...prev, t: nextT } : prev));
    }
  });

  // OrbitControls: 실내에서 너무 뚫고 나가지 않게 제한
  // (룸 bbox 기반 min/maxDistance는 GLB 로드 후 설정)
  const maxDist = useMemo(() => {
    if (!room.roomBox) return 50;
    const size = room.roomBox.getSize(new THREE.Vector3());
    return Math.max(size.x, size.z) * 1.2;
  }, [room.roomBox]);

  const minDist = useMemo(() => 1.2, []);

  return (
    <>
      {/* 조명 (천장 밝게 / 실내 덜 밝게) */}
      <ambientLight intensity={0.12} />
      <hemisphereLight args={["#ffffff", "#9a9a9a", 0.35]} />
      {/* 천장 조명 느낌 */}
      <directionalLight position={[0, 14, 0]} intensity={3.2} />
      <directionalLight position={[10, 6, 8]} intensity={0.25} />

      {/* 모델 */}
      <RoomModel
        onReady={(info) => {
          setRoom(info);

          // 시작점 카메라/타겟 설정
          if (!info.roomBox || !info.center) return;
          const { startPos, startTarget } = computeEntryPose(info.roomBox, info.center);

          camera.position.copy(startPos);
          camera.lookAt(startTarget);

          if (controlsRef.current) {
            controlsRef.current.target.copy(startTarget);
            controlsRef.current.update();
          }
        }}
      />

      {/* 작품 - Front/Back 벽 기준 2x2 배치 */}
      {room.wallFront && room.center && (
        <ArtworkWall
          wall={room.wallFront}
          images={FRONT_IMAGES}
          roomCenter={room.center}
          onFocus={onFocusArtwork}
        />
      )}
      {room.wallBack && room.center && (
        <ArtworkWall
          wall={room.wallBack}
          images={BACK_IMAGES}
          roomCenter={room.center}
          onFocus={onFocusArtwork}
        />
      )}

      {/* 컨트롤 */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.8}
        panSpeed={0.6}
        // 실내에서 패닝 과도 제한 (너무 벽만 보이는거 방지)
        enablePan={!isFocused}
        enableRotate={true}
        enableZoom={true}
        minDistance={minDist}
        maxDistance={maxDist}
      />

      {/* UI */}
      <Hud
        focused={isFocused}
        onReset={() => resetView()}
        onBack={() => resetView()}
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// MODEL LOADER + MATERIAL OVERRIDE
// -----------------------------------------------------------------------------
function RoomModel({
  onReady,
}: {
  onReady: (info: {
    roomBox?: THREE.Box3;
    center?: THREE.Vector3;
    wallFront?: THREE.Object3D;
    wallBack?: THREE.Object3D;
    wallLeft?: THREE.Object3D;
  }) => void;
}) {
  const gltf = useGLTF(MODEL_URL) as any;

  useEffect(() => {
    const scene = gltf.scene as THREE.Object3D;

    // ✅ Zone_* 는 배치용 가이드면 숨김
    scene.traverse((obj: any) => {
      const name = obj.name ?? "";

      if (name.startsWith("Zone_")) obj.visible = false;

      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = true;

        // ✅ 천장/벽/바닥 재질 강제
        if (name.startsWith("Ceiling")) {
          obj.material = new THREE.MeshStandardMaterial({
            color: "#ffffff",
            roughness: 0.85,
            metalness: 0.0,
          });
        } else if (name.startsWith("Wall_")) {
          obj.material = new THREE.MeshStandardMaterial({
            color: "#f4f4f4",
            roughness: 0.95,
            metalness: 0.0,
          });
        } else if (name.startsWith("Floor")) {
          obj.material = new THREE.MeshStandardMaterial({
            color: "#e9e9e9",
            roughness: 1.0,
            metalness: 0.0,
          });
        }
      }
    });

    // Room bbox / center
    const roomBox = new THREE.Box3().setFromObject(scene);
    const center = roomBox.getCenter(new THREE.Vector3());

    // 벽 오브젝트 이름은 네가 보여준대로: Wall_Front / Wall_Back / Wall_Left / Wall_Right
    const wallFront = getObjectByExactName(scene, "Wall_Front") ?? getFirstMeshByNamePrefix(scene, "Wall_Front");
    const wallBack = getObjectByExactName(scene, "Wall_Back") ?? getFirstMeshByNamePrefix(scene, "Wall_Back");
    const wallLeft = getObjectByExactName(scene, "Wall_Left") ?? getFirstMeshByNamePrefix(scene, "Wall_Left");

    onReady({ roomBox, center, wallFront, wallBack, wallLeft });
  }, [gltf, onReady]);

  return <primitive object={gltf.scene} />;
}

useGLTF.preload(MODEL_URL);

// -----------------------------------------------------------------------------
// ENTRY POSE (Wall_Left 입장 시점)
// -----------------------------------------------------------------------------
function computeEntryPose(roomBox: THREE.Box3, center: THREE.Vector3) {
  const size = roomBox.getSize(new THREE.Vector3());

  // Wall_Left 쪽에서 조금 안쪽으로 들어온 위치
  // x: 왼쪽(min.x) 근처, z: 중앙보다 약간 앞(사용자 시야 확보)
  const eyeY = roomBox.min.y + size.y * 0.42;

  const startPos = new THREE.Vector3(
    roomBox.min.x + size.x * 0.10,
    eyeY,
    center.z + size.z * 0.18
  );

  // 시선은 방 중앙
  const startTarget = new THREE.Vector3(center.x, eyeY, center.z);

  return { startPos, startTarget };
}

// -----------------------------------------------------------------------------
// ARTWORK WALL (2x2 규칙 배치)
// -----------------------------------------------------------------------------
function ArtworkWall({
  wall,
  images,
  roomCenter,
  onFocus,
}: {
  wall: THREE.Object3D;
  images: string[];
  roomCenter: THREE.Vector3;
  onFocus: (pos: THREE.Vector3, normal: THREE.Vector3, planeHeight: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // 벽 월드 bbox
  const { wallCenter, wallSize, wallQuat, wallNormal } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(wall);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const quat = new THREE.Quaternion();
    wall.getWorldQuaternion(quat);

    // 벽의 "정면" normal 추정:
    // local +Z가 벽 정면이라고 가정 -> 월드 변환
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(quat).normalize();

    // roomCenter를 기준으로 "안쪽(방 내부)"로 향하는 normal로 뒤집기
    // (벽 바깥쪽 normal이면 roomCenter 방향과 반대라서)
    const toCenter = roomCenter.clone().sub(center).normalize();
    if (n.dot(toCenter) < 0) n.multiplyScalar(-1);

    return { wallCenter: center, wallSize: size, wallQuat: quat, wallNormal: n };
  }, [wall, roomCenter]);

  // 2x2 배치 파라미터
  const layout = useMemo(() => {
    const W = wallSize.x; // 벽 가로
    const H = wallSize.y; // 벽 세로

    // 벽이 너무 크거나 작아도 보기 좋게
    const marginX = Math.max(0.6, W * 0.10);
    const marginY = Math.max(0.6, H * 0.12);
    const gapX = Math.max(0.6, W * 0.08);
    const gapY = Math.max(0.6, H * 0.10);

    // 2열 2행: 가능한 영역에서 계산
    const usableW = Math.max(0.1, W - marginX * 2 - gapX);
    const usableH = Math.max(0.1, H - marginY * 2 - gapY);

    const tileW = usableW / 2;
    const tileH = usableH / 2;

    // 너무 세로로 길거나 가로로 길면 깨져보여서 고정 비율로
    // 작품 비율: 16:9 느낌
    const aspect = 16 / 9;
    let frameW = tileW;
    let frameH = frameW / aspect;
    if (frameH > tileH) {
      frameH = tileH;
      frameW = frameH * aspect;
    }

    // 벽에 살짝 띄우기 (z-fighting 방지)
    const offset = 0.03;

    // 2x2 중심 좌표(로컬 기준 X/Y)
    const xs = [
      -((gapX / 2) + frameW / 2),
      +((gapX / 2) + frameW / 2),
    ];
    const ys = [
      +((gapY / 2) + frameH / 2),
      -((gapY / 2) + frameH / 2),
    ];

    return { frameW, frameH, xs, ys, offset };
  }, [wallSize.x, wallSize.y]);

  // 이미지가 4장보다 많아도 4장만 (2x2)
  const selected = images.slice(0, 4);

  return (
    <group ref={groupRef}>
      {selected.map((src, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);

        const localX = layout.xs[col];
        const localY = layout.ys[row];

        // 벽 중심 기준으로 local XY를 world로 변환:
        // wallQuat이 벽의 회전이므로 local (x,y,0)을 quat으로 회전하고 wallCenter에 더함
        const pLocal = new THREE.Vector3(localX, localY, layout.offset);
        const pWorld = pLocal.applyQuaternion(wallQuat).add(wallCenter);

        return (
          <ArtworkPlane
            key={src}
            src={src}
            position={pWorld}
            quaternion={wallQuat}
            width={layout.frameW}
            height={layout.frameH}
            normal={wallNormal}
            onFocus={onFocus}
          />
        );
      })}
    </group>
  );
}

// -----------------------------------------------------------------------------
// SINGLE ARTWORK PLANE
// -----------------------------------------------------------------------------
function ArtworkPlane({
  src,
  position,
  quaternion,
  width,
  height,
  normal,
  onFocus,
}: {
  src: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  width: number;
  height: number;
  normal: THREE.Vector3;
  onFocus: (pos: THREE.Vector3, normal: THREE.Vector3, planeHeight: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // texture
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const t = loader.load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [src]);

  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.cursor = "pointer" as any;
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={quaternion}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onFocus(position.clone(), normal.clone(), height);
      }}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.9}
        metalness={0.0}
        // 살짝 띄워서 "작품 느낌"
        emissive={hovered ? new THREE.Color("#111111") : new THREE.Color("#000000")}
        emissiveIntensity={hovered ? 0.25 : 0.0}
      />
    </mesh>
  );
}

// -----------------------------------------------------------------------------
// HUD
// -----------------------------------------------------------------------------
function Hud({
  focused,
  onReset,
  onBack,
}: {
  focused: boolean;
  onReset: () => void;
  onBack: () => void;
}) {
  return (
    <Html fullscreen>
      {/* 좌상단: 뒤로/리셋 */}
      <div style={{ position: "fixed", left: 16, top: 16, display: "flex", gap: 10 }}>
        <button
          onClick={onBack}
          style={btnStyle()}
          title="뒤로가기(시작 위치)"
        >
          ←
        </button>
        <button onClick={onReset} style={btnStyle()} title="리셋">
          ↻
        </button>
      </div>

      {/* 우상단: 안내 */}
      <div style={{ position: "fixed", right: 16, top: 16, display: "flex", gap: 10 }}>
        <div style={pillStyle()}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>
            드래그: 회전 · 휠: 줌 · 패닝: Shift+드래그(또는 우클릭) · 클릭: 작품 확대 · ESC: 뒤로
          </span>
        </div>
        {focused && (
          <button onClick={onBack} style={btnStyle()} title="확대 해제">
            ✕
          </button>
        )}
      </div>
    </Html>
  );
}

function btnStyle(): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.9)",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: "44px",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  };
}

function pillStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.88)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    maxWidth: 620,
  };
}
