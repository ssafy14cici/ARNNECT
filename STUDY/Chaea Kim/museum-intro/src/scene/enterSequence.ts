// src/scene/enterSequence.ts
import * as THREE from "three";
import gsap from "gsap";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  exterior: THREE.Group;
  interior: THREE.Group;
  setInteriorCamera: (camera: THREE.PerspectiveCamera, controls: OrbitControls) => void;
  ui: any;
  onDone: () => void;
}) {
  const { camera, controls, renderer, scene, exterior, interior, setInteriorCamera, ui, onDone } =
    args;

  const MOVE_T = 1.05;
  const FADE_IN = 0.25;
  const FADE_OUT = 0.55;

  const forwardPush = 6.5;
  const targetLift = 1.4;

  const forward = controls.target.clone().sub(camera.position).normalize();
  const endPos = camera.position.clone().add(forward.multiplyScalar(forwardPush));

  const endTarget = controls.target.clone();
  endTarget.y += targetLift;

  const tl = gsap.timeline({ onComplete: onDone });

  tl.to(
    camera.position,
    {
      duration: MOVE_T,
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    },
    0
  );

  tl.to(
    controls.target,
    {
      duration: MOVE_T,
      x: endTarget.x,
      y: endTarget.y,
      z: endTarget.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    },
    0
  );

  tl.to(
    {},
    {
      duration: FADE_IN,
      onStart: () => ui.flash?.(1),
    },
    MOVE_T * 0.75
  );

  tl.add(() => {
    // ✅ 스왑
    exterior.visible = false;
    interior.visible = true;

    // ✅ 내부 톤
    scene.background = new THREE.Color("#ffffff");
    scene.fog = null; // 내부에서 fog가 있으면 얇은 벽/디테일이 날아가 보일 수 있음
    renderer.toneMappingExposure = 1.12;

    // ✅ 내부 카메라 프리셋 "강제 적용"
    setInteriorCamera(camera, controls);

    // ✅ 내부 줌/각도 제한 "강제 적용"
    // - 줌아웃해도 방이 사라지지 않게
    // - 뒤로 너무 젖혀서 이상한 구도를 못 만들게
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;

    controls.minDistance = 1.8;
    controls.maxDistance = 14.0;
    controls.minPolarAngle = THREE.MathUtils.degToRad(10);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(85);

    controls.update();
  });

  tl.to({}, { duration: FADE_OUT, onUpdate: () => ui.flash?.(0) }, "+=0.05");
}
