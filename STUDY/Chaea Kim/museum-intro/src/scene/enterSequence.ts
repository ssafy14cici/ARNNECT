import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

export function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  exterior: THREE.Group;
  interior: THREE.Group;

  setInteriorCamera: (camera: THREE.PerspectiveCamera, controls: OrbitControls) => void;
  ui: {
    flash?: (a01: number) => void;
    setExitVisible?: (v: boolean) => void;
    setNavVisible?: (v: boolean) => void;
  };

  onDone: () => void;
}) {
  const { camera, controls, renderer, scene, exterior, interior, setInteriorCamera, ui, onDone } = args;

  // "swoosh" + white flash + swap to interior
  const MOVE_T = 1.0;
  const FLASH_IN = 0.22;
  const FLASH_OUT = 0.50;

  // Conservative forward push (avoid seeing GLB interior)
  const forwardPush = 3.2;
  const targetLift = 1.2;

  const forward = controls.target.clone().sub(camera.position).normalize();
  const endPos = camera.position.clone().add(forward.multiplyScalar(forwardPush));
  const endTarget = controls.target.clone().add(new THREE.Vector3(0, targetLift, 0));

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

  // Flash in
  tl.to(
    {},
    {
      duration: FLASH_IN,
      onStart: () => ui.flash?.(1),
    },
    MOVE_T * 0.78
  );

  // Swap while flash is ON (no visual glitch)
  tl.add(() => {
    exterior.visible = false;
    interior.visible = true;

    scene.background = new THREE.Color("#ffffff");
    scene.fog = new THREE.Fog("#ffffff", 12, 220);

    renderer.toneMappingExposure = 1.08;

    setInteriorCamera(camera, controls);
    controls.update();

    ui.setExitVisible?.(true);
    ui.setNavVisible?.(true);
  });

  // Flash out
  tl.to({}, { duration: FLASH_OUT, onUpdate: () => ui.flash?.(0) }, "+=0.04");
}
