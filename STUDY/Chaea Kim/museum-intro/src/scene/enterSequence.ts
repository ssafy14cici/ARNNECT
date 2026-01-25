import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

/**
 * 외부(Three) -> CSS 전시장 오버레이 전환
 * - onSwap는 화이트 플래시가 1에 도달했을 때 호출(이 시점에 canvas 숨기고 overlay show)
 * - 내부(Three)는 렌더하지 않으므로, "미리 보임"이 발생하지 않음.
 */
export function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  exterior: THREE.Group;
  ui?: { flash?: (a01: number) => void };

  // flash=1 구간에서 스왑
  onSwap: () => void;
  onDone: () => void;
}) {
  const { camera, controls, scene, renderer, exterior, ui, onSwap, onDone } = args;

  // 카메라가 "문 쪽으로 빨려 들어가는" 느낌: 약간 더 크게 전진 + 이징 가속
  const MOVE_T = 0.95;
  const FLASH_IN = 0.18;
  const FLASH_HOLD = 0.06;
  const FLASH_OUT = 0.40;

  const forwardPush = 5.0; // 더 빨려 들어가게(외부만 보이므로 과감 가능)
  const targetLift = 1.1;

  const forward = controls.target.clone().sub(camera.position).normalize();
  const endPos = camera.position.clone().add(forward.multiplyScalar(forwardPush));
  const endTarget = controls.target.clone().add(new THREE.Vector3(0, targetLift, 0));

  let swapped = false;

  const tl = gsap.timeline({
    onComplete: () => onDone(),
  });

  // 살짝 노출/안개를 화이트 쪽으로(스무스)
  const startFogColor = (scene.fog as THREE.Fog | null)?.color?.clone() ?? new THREE.Color("#f6f4ef");
  const startBg = (scene.background as THREE.Color | null)?.clone() ?? new THREE.Color("#f6f4ef");
  const fogObj = { t: 0 };
  tl.to(fogObj, {
    duration: MOVE_T,
    t: 1,
    ease: "power3.inOut",
    onUpdate: () => {
      // 0 -> 1로 갈수록 하얗게
      const c = startBg.clone().lerp(new THREE.Color("#ffffff"), fogObj.t * 0.55);
      scene.background = c;
      if (scene.fog && (scene.fog as THREE.Fog).isFog) {
        (scene.fog as THREE.Fog).color.copy(startFogColor.clone().lerp(new THREE.Color("#ffffff"), fogObj.t * 0.55));
      }
      renderer.toneMappingExposure = 1.05 + fogObj.t * 0.08;
    },
  }, 0);

  tl.to(camera.position, {
    duration: MOVE_T,
    x: endPos.x,
    y: endPos.y,
    z: endPos.z,
    ease: "power3.in",
    onUpdate: () => controls.update(),
  }, 0);

  tl.to(controls.target, {
    duration: MOVE_T,
    x: endTarget.x,
    y: endTarget.y,
    z: endTarget.z,
    ease: "power3.in",
    onUpdate: () => controls.update(),
  }, 0);

  // flash in
  tl.to({}, {
    duration: FLASH_IN,
    onStart: () => ui?.flash?.(1),
  }, MOVE_T * 0.72);

  // swap while flash=1
  tl.add(() => {
    if (swapped) return;
    swapped = true;
    // 외부 그룹은 굳이 숨기지 않아도 canvas를 숨기면 보이지 않음.
    // 그래도 상태 정리 차원에서 off.
    exterior.visible = true;
    onSwap();
  }, MOVE_T * 0.72 + FLASH_IN * 0.85);

  // hold
  tl.to({}, { duration: FLASH_HOLD }, "+=0");

  // flash out
  tl.to({}, {
    duration: FLASH_OUT,
    onUpdate: () => ui?.flash?.(0),
  }, "+=0");
}
