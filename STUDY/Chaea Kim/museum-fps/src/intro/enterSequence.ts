import * as THREE from "three";
import gsap from "gsap";

export function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  basePos: THREE.Vector3;
  baseTarget: THREE.Vector3;
  target: THREE.Vector3;
  fadeEl: HTMLElement;
  stopDistance: number;
  onWhiteCovered: () => void;
}) {
  const { camera, basePos, baseTarget, target, fadeEl, stopDistance, onWhiteCovered } = args;

  fadeEl.style.display = "block";
  fadeEl.style.opacity = "0";
  fadeEl.style.pointerEvents = "none";
  fadeEl.style.background = "#ffffff";
  fadeEl.style.position = "fixed";
  fadeEl.style.inset = "0";
  fadeEl.style.zIndex = "99999";

  const dir = target.clone().sub(basePos);
  if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1);
  dir.normalize();

  const toPos = target.clone().addScaledVector(dir, -Math.max(0.01, stopDistance));
  const toFov = Math.min(70, camera.fov + 12);

  const fadeTriggerDist = Math.max(0.22, stopDistance * 25.0);

  let fadeStarted = false;
  const startFadeNow = () => {
    if (fadeStarted) return;
    fadeStarted = true;
    gsap.to(fadeEl, { opacity: 1, duration: 0.08, ease: "power2.in" });
  };

  const tl = gsap.timeline();

  tl.to(
    basePos,
    {
      x: toPos.x,
      y: toPos.y,
      z: toPos.z,
      duration: 1.2,
      ease: "power3.inOut",
      onUpdate: () => {
        if (!fadeStarted && basePos.distanceTo(target) <= fadeTriggerDist) startFadeNow();
      },
    },
    0,
  );

  tl.to(baseTarget, { x: target.x, y: target.y, z: target.z, duration: 1.2, ease: "power2.inOut" }, 0);

  tl.to(
    camera,
    {
      fov: toFov,
      duration: 0.75,
      ease: "power2.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
    },
    0.12,
  );

  tl.call(() => {
    startFadeNow();
    gsap.to(fadeEl, {
      opacity: 1,
      duration: 0.08,
      ease: "none",
      onComplete: () => requestAnimationFrame(onWhiteCovered),
    });
  });
}

export function scheduleFadeCleanup(fadeEl: HTMLElement | null, fallbackMs: number) {
  if (!fadeEl) return;

  const onClear = () => {
    window.removeEventListener("intro:clear-fade", onClear);
    if (!fadeEl.isConnected) return;
    gsap.to(fadeEl, {
      opacity: 0,
      duration: 0.45,
      ease: "power2.out",
      onComplete: () => fadeEl.remove(),
    });
  };
  window.addEventListener("intro:clear-fade", onClear);

  window.setTimeout(() => {
    if (!fadeEl.isConnected) return;
    onClear();
  }, fallbackMs);
}
