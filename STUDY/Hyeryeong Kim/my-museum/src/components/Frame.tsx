import { useState } from 'react';
import { Image, Text } from '@react-three/drei';
import { useStore } from '../store';
import * as THREE from 'three';

interface FrameProps {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
  url: string;
  title: string;
  desc: string;
  side?: 'left' | 'right';
}

export default function Frame(props: FrameProps) {
  const { viewState, activeArt, focusArt, openPopup } = useStore();
  const [hovered, setHover] = useState(false);

  const isSelected = activeArt?.id === props.id;

  const handleClick = (e: any) => {
    e.stopPropagation();

    if (viewState === 'WALK') {
      const targetVec = new THREE.Vector3();
      e.object.getWorldPosition(targetVec);

      // 복도 중앙 방향 계산
      const centerPos = new THREE.Vector3(0, targetVec.y, targetVec.z);
      const directionToCenter = new THREE.Vector3().subVectors(centerPos, targetVec).normalize();
      
      // 그림에서 8.5m 떨어진 곳으로 이동
      const cameraVec = targetVec.clone().add(directionToCenter.multiplyScalar(5));

      // ★ [핵심 해결책] 카메라 높이를 그림 높이와 똑같이(targetVec.y) 맞춤!
      // 이렇게 하면 올려다보거나 내려다보지 않고, '정면'을 보게 됨.
      cameraVec.y = targetVec.y; 

      focusArt({
        id: props.id,
        title: props.title,
        desc: props.desc,
        image: props.url,
        cameraPos: [cameraVec.x, cameraVec.y, cameraVec.z],
        targetPos: [targetVec.x, targetVec.y, targetVec.z]
      });

    } else if (viewState === 'FOCUS' && isSelected) {
      openPopup();
    }
  };

  return (
    <group position={props.position} rotation={props.rotation}>
      
      {/* 테두리 */}
      <mesh 
        onClick={handleClick}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        position={[0, 0, 0]}
      >
        <boxGeometry args={[4.4, 5.4, 0.15]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* 매트 */}
      <mesh position={[0, 0, 0.08]} onClick={handleClick}>
        <boxGeometry args={[4.2, 5.2, 0.05]} />
        <meshStandardMaterial color="#eeeeee" roughness={0.9} />
      </mesh>

      {/* 그림 */}
      <Image 
        url={props.url} 
        position={[0, 0, 0.11]} 
        scale={[3.8, 4.8]} 
        onClick={handleClick}
      />

      {/* 유리 */}
      <mesh position={[0, 0, 0.12]} onClick={handleClick}>
        <planeGeometry args={[3.8, 4.8]} />
        <meshPhysicalMaterial 
          transmission={1} opacity={1} roughness={0} ior={1.5} thickness={0.1} color="white" transparent
        />
      </mesh>

      {/* 텍스트 */}
      <Text 
        position={[0, -3.5, 0]} 
        fontSize={0.25} 
        color="#333" 
        anchorX="center"
        font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
      >
        {props.title.toUpperCase()}
      </Text>

      {/* 호버 효과 */}
      {hovered && viewState === 'WALK' && (
        <Text position={[0, -3.8, 0]} fontSize={0.15} color="#d4af37">
          CLICK TO VIEW
        </Text>
      )}
    </group>
  );
}