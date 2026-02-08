import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function HoverModel({ shape }: { shape: string }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // 원본 CSS 애니메이션처럼 역동적인 회전과 흔들림
    meshRef.current.rotation.y = t * 0.4;
    meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
  });

  return (
    <group ref={meshRef}>
      {/* 별 모양 조형을 위해 Detail이 0인 Icosahedron(20면체) 사용. 
         이 형태는 모든 면이 삼각형으로 뾰족하게 살아있어 보석 느낌을 극대화합니다.
      */}
      <mesh>
        <icosahedronGeometry args={[4.5, 0]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.9}      // 투명도
          thickness={3}           // 굴절 두께
          roughness={0.05}
          ior={1.8}               // 수정된 보석 굴절률
          iridescence={1}         // 홀로그램 효과 (중요!)
          iridescenceIOR={2.5}
          iridescenceThicknessRange={[100, 800]}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* 내부에서 빛나는 코어 조형 (더 보석 같은 느낌을 위해) */}
      <mesh scale={0.4}>
        <dodecahedronGeometry args={[3, 0]} />
        <meshStandardMaterial
          emissive="#ff00ff"
          emissiveIntensity={2}
          color="#00ffff"
        />
      </mesh>
    </group>
  );
}