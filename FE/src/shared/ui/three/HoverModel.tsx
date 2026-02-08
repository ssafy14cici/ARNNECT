import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// ✅ 1. 어떤 모양들을 쓸지 타입 정의
type ShapeType = "knot" | "sphere" | "box" | "octahedron" | "torus";

type Props = {
  color?: string;
  shape?: ShapeType; // shape prop 추가
};

export default function HoverModel({ color = "#ffffff", shape = "knot" }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.6;
    }
  });

  // ✅ 2. shape 값에 따라 다른 도형(Geometry) 반환
  const renderGeometry = () => {
    switch (shape) {
      case "sphere": // 구
        return <sphereGeometry args={[0.7, 32, 32]} />;
      case "box": // 정육면체
        return <boxGeometry args={[1, 1, 1]} />;
      case "octahedron": // 정팔면체 (다이아몬드 느낌)
        return <octahedronGeometry args={[0.9, 0]} />;
      case "torus": // 도넛
        return <torusGeometry args={[0.6, 0.25, 16, 100]} />;
      case "knot": // 매듭 (기본값)
      default:
        return <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />;
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} color="blue" intensity={1} />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef} scale={2.5}>
          {/* ✅ 3. 선택된 도형 렌더링 */}
          {renderGeometry()}
          
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