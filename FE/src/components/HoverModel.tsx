import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

export default function HoverModel({ color = "#ffffff" }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // 매 프레임마다 실행 (애니메이션)
  useFrame((state, delta) => {
    if (meshRef.current) {
      // 1. 계속 회전
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <>
      {/* 조명 설정 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} color="blue" intensity={1} />

      {/* 둥둥 떠다니는 효과 (Float) */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef} scale={2.5}>
          {/* ✅ 여기에 나중에 .glb 모델을 넣으면 됩니다.
             지금은 임시로 'TorusKnot(매듭 모양)' 도형을 넣었습니다. 
          */}
          <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />
          
          {/* 재질(Material) - 금속 느낌 */}
          <meshStandardMaterial 
            color={color} 
            roughness={0.1} 
            metalness={0.8} 
          />
        </mesh>
      </Float>
    </>
  );
}