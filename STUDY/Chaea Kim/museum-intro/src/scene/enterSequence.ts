import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

/**
 * Exterior(Three) -> CSS exhibition overlay transition.
 *
 * Design goals (SharafRashidov-like):
 * - Short, decisive pull-in motion (no drifting into walls).
 * - Camera moves *toward its current target* (safe), not an arbitrary "forward push".
 * - White flash: 0 -> 1 (swap) -> 0 (fade out) correctly animated.
 */
export function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  exterior: THREE.Group;
  ui?: { flash?: (a01: number) => void };

  /** Called at peak flash (alpha≈1). Hide canvas + show overlay here. */
  onSwap: () => void;
  onDone: () => void;
}) {
  const { camera, controls, scene, renderer, exterior, ui, onSwap, onDone } = args;

  // Timing (tuned for “snappy” feel)
  const MOVE_T = 0.85;
  const FLASH_IN = 0.16;
  const FLASH_HOLD = 0.06;
  const FLASH_OUT = 0.36;

  // --- Safe camera pull-in: move toward current target, keep the same view axis ---
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  const dist0 = startPos.distanceTo(startTarget);
  const dirFromTarget = startPos.clone().sub(startTarget).normalize(); // points from target -> camera

  // Bring camera closer to target but keep a minimum distance so it doesn’t clip.
  const dist1 = Math.max(3.0, dist0 * 0.52);
  const endPos = startTarget
    .clone()
    .add(dirFromTarget.multiplyScalar(dist1))
    .add(new THREE.Vector3(0, 1.0, 0)); // slight lift

  const endTarget = startTarget.clone().add(new THREE.Vector3(0, 1.15, 0));

  // Optional “pull-in” perspective: narrow FOV a little
  const fov0 = camera.fov;
  const fov1 = Math.max(35, Math.min(60, fov0 - 10));

  // Flash state
  const flash = { a: 0 };
  const fogMix = { t: 0 };
  const bg0 = (scene.background as THREE.Color | null)?.clone() ?? new THREE.Color("#f6f4ef");
  const fog0 = (scene.fog as THREE.Fog | null)?.color?.clone() ?? new THREE.Color("#f6f4ef");

  let swapped = false;

  const tl = gsap.timeline({
    defaults: { overwrite: true },
    onComplete: () => onDone(),
  });

  // Move + soft brighten
  tl.to(
    fogMix,
    {
      duration: MOVE_T,
      t: 1,
      ease: "power3.inOut",
      onUpdate: () => {
        const c = bg0.clone().lerp(new THREE.Color("#ffffff"), fogMix.t * 0.35);
        scene.background = c;
        if (scene.fog && (scene.fog as THREE.Fog).isFog) {
          (scene.fog as THREE.Fog).color.copy(fog0.clone().lerp(new THREE.Color("#ffffff"), fogMix.t * 0.35));
        }
        renderer.toneMappingExposure = 1.0 + fogMix.t * 0.1;
      },
    },
    0,
  );

  tl.to(
    camera.position,
    {
      duration: MOVE_T,
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      ease: "power3.in",
      onUpdate: () => controls.update(),
    },
    0,
  );

  tl.to(
    controls.target,
    {
      duration: MOVE_T,
      x: endTarget.x,
      y: endTarget.y,
      z: endTarget.z,
      ease: "power3.in",
      onUpdate: () => controls.update(),
    },
    0,
  );

  tl.to(
    camera,
    {
      duration: MOVE_T,
      fov: fov1,
      ease: "power2.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
    },
    0,
  );

  // Flash 0->1
  tl.to(
    flash,
    {
      duration: FLASH_IN,
      a: 1,
      ease: "power2.out",
      onUpdate: () => ui?.flash?.(flash.a),
    },
    MOVE_T * 0.7,
  );

  // Swap at peak flash
  tl.add(
    () => {
      if (swapped) return;
      swapped = true;
      exterior.visible = true;
      onSwap();
    },
    MOVE_T * 0.7 + FLASH_IN * 0.85,
  );

  // Hold
  tl.to({}, { duration: FLASH_HOLD }, "+=0");

  // Flash 1->0
  tl.to(flash, {
    duration: FLASH_OUT,
    a: 0,
    ease: "power2.inOut",
    onUpdate: () => ui?.flash?.(flash.a),
  });
}
