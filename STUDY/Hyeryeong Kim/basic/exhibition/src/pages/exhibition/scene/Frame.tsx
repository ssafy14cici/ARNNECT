import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

const TMP_POS = new THREE.Vector3();
const TMP_N = new THREE.Vector3();
const TMP_Q = new THREE.Quaternion();

export default function Frame({
  texture,
  localPosition,
  localQuaternion,
  width,
  height,
  onFocus,
}: {
  texture: THREE.Texture;
  localPosition: THREE.Vector3;
  localQuaternion: THREE.Quaternion;
  width: number;
  height: number;
  onFocus: (worldPos: THREE.Vector3, worldNormal: THREE.Vector3) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  const mat = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.55,
      metalness: 0.0,
      side: THREE.DoubleSide, // 혹시 벽 방향 뒤집혀도 보이게
    });
  }, [texture]);

  return (
    <group position={localPosition} quaternion={localQuaternion}>
      {/* 액자 프레임 */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width + 0.08, height + 0.08]} />
        <meshStandardMaterial color="#f6f5f1" roughness={0.7} />
      </mesh>

      {/* 이미지 */}
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          if (!ref.current) return;

          // world position / normal 구해서 카메라 접근 벡터로 사용
          ref.current.getWorldPosition(TMP_POS);
          ref.current.getWorldQuaternion(TMP_Q);

          // plane normal(+Z) in world
          TMP_N.set(0, 0, 1).applyQuaternion(TMP_Q).normalize();

          onFocus(TMP_POS.clone(), TMP_N.clone());
        }}
      >
        <planeGeometry args={[width, height]} />
        <primitive object={mat} attach="material" />
      </mesh>
    </group>
  );
}
