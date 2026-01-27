import { MeshReflectorMaterial } from "@react-three/drei";

type Props = {
  width: number;
  depth: number;
  height: number;
};

export default function Room({ width, depth, height }: Props) {
  const wallColor = "#f2f1ed";
  const trimColor = "#e7e5df";

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <MeshReflectorMaterial
          resolution={1024}
          mirror={0.22}
          blur={[400, 120]}
          mixBlur={0.6}
          mixStrength={10}
          roughness={0.9}
          metalness={0.05}
          color="#f9f8f4"
        />
      </mesh>

      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>

      {/* walls (inside faces) */}
      {/* back z = +depth/2 */}
      <mesh position={[0, height / 2, depth / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>

      {/* front z = -depth/2 */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>

      {/* left x = -width/2 */}
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>

      {/* right x = +width/2 */}
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>

      {/* top trim (light band 느낌) */}
      <mesh position={[0, height - 0.18, 0]}>
        <boxGeometry args={[width + 0.02, 0.12, depth + 0.02]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
    </group>
  );
}
