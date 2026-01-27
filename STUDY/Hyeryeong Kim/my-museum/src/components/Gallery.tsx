import { MeshReflectorMaterial, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Frame from './Frame';

export default function Gallery() {
  const artworks = [
    { id: 1, title: "1. The Beginning", desc: "시작", url: "/img1.jpg" },
    { id: 2, title: "2. Challenge", desc: "도전", url: "/img2.jpg" },
    { id: 3, title: "3. Passion", desc: "열정", url: "/img3.jpg" },
    { id: 4, title: "4. Growth", desc: "성장", url: "/img4.jpg" },
    { id: 5, title: "5. Conflict", desc: "갈등", url: "/img5.jpg" },
    { id: 6, title: "6. Harmony", desc: "조화", url: "/img6.jpg" },
    { id: 7, title: "7. Insight", desc: "통찰", url: "/img7.jpg" },
    { id: 8, title: "8. Patience", desc: "인내", url: "/img8.jpg" },
    { id: 9, title: "9. Legacy", desc: "유산", url: "/img9.jpg" },
    { id: 10, title: "10. The End", desc: "끝", url: "/img10.jpg" },
  ];

  const HALL_LENGTH = 100; // 복도 길이 여유 있게
  const WALL_HEIGHT = 15;
  const WALL_THICKNESS = 2; 
  const FLOOR_THICKNESS = 1;  
  // ★ 복도 폭 수정: 좁아지는 정도를 완화
  const FRONT_WIDTH = 24; // 입구 폭
  const BACK_WIDTH = 14;  // 끝 폭

  // ★ 그림 높이: 3.0m (적당히 높고 웅장함)
  const ART_HEIGHT = 1.5;

  const NARROW_ANGLE = Math.atan2((FRONT_WIDTH - BACK_WIDTH) / 2, HALL_LENGTH);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.5, metalness: 0.1
  });

  return (
    <group position={[0, 0, -40]}>
      {/* 바닥 */}
      <mesh position={[0, -FLOOR_THICKNESS/2, 0]} receiveShadow>
        <boxGeometry args={[60, FLOOR_THICKNESS, HALL_LENGTH + 40]} />
        <MeshReflectorMaterial
          mirror={0.7} resolution={1024} mixBlur={8} mixStrength={3}
          roughness={0.6} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4}
          color="#e0e0e0" metalness={0.1}
        />
      </mesh>

      {/* 천장 */}
      <mesh position={[0, WALL_HEIGHT, 0]}>
        <boxGeometry args={[60, 1, HALL_LENGTH + 40]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      
      <ContactShadows resolution={1024} scale={100} blur={2} opacity={0.5} far={10} color="#000000" />

      {/* 왼쪽 벽 */}
      <group position={[-14, WALL_HEIGHT/2, 0]} rotation={[0, NARROW_ANGLE, 0]}>
        <mesh receiveShadow material={wallMaterial}>
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, HALL_LENGTH]} />
        </mesh>
        
        {artworks.filter((_, i) => i % 2 === 0).map((art, i) => {
          const z = 30 - (i * 15);
          return (
            <group key={art.id} position={[WALL_THICKNESS/2 + 0.05, ART_HEIGHT, z]} rotation={[0, Math.PI/2, 0]}>
               <Frame 
                 id={art.id} 
                 title={art.title} 
                 desc={art.desc} 
                 url={art.url} 
                 position={[0,0,0]} 
                 rotation={[0,0,0]} 
                 side="left"
               />
               <spotLight intensity={4} distance={12} angle={0.6} penumbra={1} color="#fff0dd" position={[0, 3, 5]} />
            </group>
          )
        })}
      </group>

      {/* 오른쪽 벽 */}
      <group position={[14, WALL_HEIGHT/2, 0]} rotation={[0, -NARROW_ANGLE, 0]}>
        <mesh receiveShadow material={wallMaterial}>
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, HALL_LENGTH]} />
        </mesh>

        {artworks.filter((_, i) => i % 2 !== 0).map((art, i) => {
          const z = 30 - (i * 15);
          return (
             <group key={art.id} position={[-WALL_THICKNESS/2 - 0.05, ART_HEIGHT, z]} rotation={[0, -Math.PI/2, 0]}>
               <Frame 
                 id={art.id} 
                 title={art.title} 
                 desc={art.desc} 
                 url={art.url} 
                 position={[0,0,0]} 
                 rotation={[0,0,0]} 
                 side="right"
               />
               <spotLight intensity={4} distance={12} angle={0.6} penumbra={1} color="#fff0dd" position={[0, 3, 5]} />
            </group>
          )
        })}
      </group>

      <gridHelper args={[40, 40, 0xcccccc, 0xffffff]} position={[0, WALL_HEIGHT - 0.1, 0]} scale={[1, 3, 1]} />
    </group>
  );
}