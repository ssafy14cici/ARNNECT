import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

type ShapeType = "knot" | "sphere" | "box" | "octahedron" | "torus";
type StylePreset = "default" | "marble-gold" | "iridescent-glass" | "deep-velvet";

type Props = {
  color?: string;
  shape?: ShapeType;
  stylePreset?: StylePreset;
};

export default function HoverModel({
  color = "#ffffff",
  shape = "knot",
  stylePreset = "default",
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.6;
    }
  });

  const renderGeometry = () => {
    switch (shape) {
      case "sphere":
        return <sphereGeometry args={[0.7, 32, 32]} />;
      case "box":
        return <boxGeometry args={[1, 1, 1]} />;
      case "octahedron":
        return <octahedronGeometry args={[0.9, 0]} />;
      case "torus":
        return <torusGeometry args={[0.6, 0.25, 16, 100]} />;
      case "knot":
      default:
        return <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />;
    }
  };

  const renderLights = () => {
    switch (stylePreset) {
      case "marble-gold":
        return (
          <>
            <ambientLight intensity={0.35} />
            <directionalLight position={[6, 8, 4]} intensity={1.25} color="#ffe7c2" />
            <pointLight position={[-6, -4, -6]} intensity={0.6} color="#d4af37" />
          </>
        );
      case "iridescent-glass":
        return (
          <>
            <ambientLight intensity={0.2} />
            <directionalLight position={[5, 6, 5]} intensity={0.8} color="#d8f1ff" />
            <pointLight position={[-5, -2, -6]} intensity={1.2} color="#b49bff" />
          </>
        );
      case "deep-velvet":
        return (
          <>
            <ambientLight intensity={0.05} />
            <directionalLight position={[-6, 6, -6]} intensity={1.6} color="#ffffff" />
            <pointLight position={[4, -6, 3]} intensity={0.5} color="#1a1a1a" />
          </>
        );
      case "default":
      default:
        return (
          <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, -5, -5]} color="blue" intensity={1} />
          </>
        );
    }
  };

  const renderMaterial = () => {
    switch (stylePreset) {
      case "marble-gold":
        return <meshStandardMaterial color={color} roughness={0.85} metalness={0.15} />;
      case "iridescent-glass":
        return (
          <meshPhysicalMaterial
            color={color}
            metalness={0}
            roughness={0.08}
            transmission={0.9}
            thickness={0.6}
            iridescence={0.9}
            iridescenceIOR={1.4}
            iridescenceThicknessRange={[120, 380]}
          />
        );
      case "deep-velvet":
        return <meshStandardMaterial color={color} roughness={1} metalness={0} />;
      case "default":
      default:
        return <meshStandardMaterial color={color} roughness={0.1} metalness={0.8} />;
    }
  };

  return (
    <>
      {renderLights()}

      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef} scale={2.5}>
          {renderGeometry()}
          {renderMaterial()}
        </mesh>
      </Float>
    </>
  );
}
