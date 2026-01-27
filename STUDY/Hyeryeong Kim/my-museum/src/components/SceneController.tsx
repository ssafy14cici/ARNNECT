import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { useStore } from '../store';
import * as THREE from 'three';

export default function SceneController() {
  const controlsRef = useRef<CameraControls>(null);
  const { viewState, activeArt } = useStore();
  const { camera, gl } = useThree();

  // ★ 눈높이 수정: 2.5m (그림의 중심 높이와 일치시켜 편안한 시야 확보)
  const EYE_LEVEL = 7.5; 
  
  const START_POS = new THREE.Vector3(0, EYE_LEVEL, 10); 
  const START_LOOK = new THREE.Vector3(0, EYE_LEVEL, -50); 

  // 1. 스크롤 이동
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (viewState !== 'WALK' || !controlsRef.current) return;

      const moveSpeed = 0.01; 
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0; 
      forward.normalize();

      const nextPos = camera.position.clone().addScaledVector(forward, e.deltaY * -moveSpeed);

      if (nextPos.x > 5) nextPos.x = 5;
      if (nextPos.x < -5) nextPos.x = -5;
      if (nextPos.z > 12) nextPos.z = 12; 
      
      // ★ 이동 중에도 높이 2.5m 절대 사수
      nextPos.y = EYE_LEVEL; 

      camera.position.copy(nextPos);
      
      controlsRef.current.setLookAt(
        camera.position.x, EYE_LEVEL, camera.position.z,
        camera.position.x + forward.x, EYE_LEVEL, camera.position.z + forward.z,
        false
      );
    };

    gl.domElement.addEventListener('wheel', handleWheel);
    return () => gl.domElement.removeEventListener('wheel', handleWheel);
  }, [viewState, camera, gl]);


  // 2. 상태별 이동
  useEffect(() => {
    if (!controlsRef.current) return;

    if (viewState === 'WALK') {
      controlsRef.current.setLookAt(
        START_POS.x, START_POS.y, START_POS.z,
        START_LOOK.x, START_LOOK.y, START_LOOK.z,
        true 
      );
      controlsRef.current.mouseButtons.left = 1; 
      controlsRef.current.mouseButtons.right = 0; 
      controlsRef.current.mouseButtons.wheel = 0; 

      // 시야각 제한 (정면 위주)
      controlsRef.current.minPolarAngle = Math.PI / 2 - 0.2; 
      controlsRef.current.maxPolarAngle = Math.PI / 2 + 0.2; 
    } 
    else if (viewState === 'FOCUS' && activeArt && activeArt.cameraPos && activeArt.targetPos) {
      controlsRef.current.setLookAt(
        activeArt.cameraPos[0], activeArt.cameraPos[1], activeArt.cameraPos[2], 
        activeArt.targetPos[0], activeArt.targetPos[1], activeArt.targetPos[2], 
        true 
      );
      
      controlsRef.current.mouseButtons.left = 0;
      controlsRef.current.mouseButtons.right = 0;
      controlsRef.current.mouseButtons.wheel = 0;
    }
  }, [viewState, activeArt]);

  return (
    <CameraControls 
      ref={controlsRef} 
      minDistance={1} 
      maxDistance={100}
      dollySpeed={0} 
      smoothTime={1.0}
    />
  );
}