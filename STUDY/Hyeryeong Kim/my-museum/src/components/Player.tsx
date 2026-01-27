import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store';
import * as THREE from 'three';

// 마우스 드래그로 시점 조작하는 커스텀 컨트롤
function DragControls() {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  // 회전 감도 조절
  const sensitivity = 0.002; 

  useEffect(() => {
    const domElement = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // 좌클릭만 허용
        isDragging.current = true;
        previousMousePosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      // Y축 회전 (좌우 둘러보기) -> 카메라 자체를 회전
      camera.rotation.y -= deltaX * sensitivity;
      
      // X축 회전 (위아래 둘러보기) -> 카메라의 X축을 기준으로 회전 (짐벌락 방지)
      camera.rotateX(-deltaY * sensitivity);
      // 위아래 각도 제한 (너무 젖혀지지 않게)
      camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camera.rotation.x));
      // Z축 회전이 생기지 않도록 고정
      camera.rotation.z = 0;

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };
    
    // 캔버스 요소에 이벤트 연결
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [camera, gl]);

  return null;
}


export default function Player() {
  const { camera } = useThree();
  const activeArt = useStore((state) => state.activeArt);
  const moveSpeed = 0.2; 
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    // 팝업이 열려있으면 조작 금지
    if (activeArt) return; 

    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': keys.current.w = true; break;
        case 'KeyA': keys.current.a = true; break;
        case 'KeyS': keys.current.s = true; break;
        case 'KeyD': keys.current.d = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': keys.current.w = false; break;
        case 'KeyA': keys.current.a = false; break;
        case 'KeyS': keys.current.s = false; break;
        case 'KeyD': keys.current.d = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeArt]);

  useFrame(() => {
    if (activeArt) return; 
    
    // 카메라가 바라보는 방향을 기준으로 이동 벡터 계산
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; // 하늘로 날지 않게 Y축 제거
    direction.normalize();

    const sideDirection = new THREE.Vector3();
    sideDirection.crossVectors(camera.up, direction).normalize();

    if (keys.current.w) camera.position.addScaledVector(direction, moveSpeed);
    if (keys.current.s) camera.position.addScaledVector(direction, -moveSpeed);
    if (keys.current.a) camera.position.addScaledVector(sideDirection, moveSpeed);
    if (keys.current.d) camera.position.addScaledVector(sideDirection, -moveSpeed);
    
    // 눈높이 고정
    camera.position.y = 1.7;
  });

  // 팝업 없을 때만 드래그 컨트롤 활성화
  return !activeArt ? <DragControls /> : null;
}