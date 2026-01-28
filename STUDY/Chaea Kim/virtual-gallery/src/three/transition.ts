import * as THREE from "three";
import gsap from "gsap";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Waypoint } from "./waypoints";

type GoToOptions = {
  duration?: number;
  ease?: string;
};

export function createTransitionController(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  let tween: gsap.core.Timeline | null = null;

  const goTo = (wp: Waypoint, opts: GoToOptions = {}) => {
    const duration = opts.duration ?? 1.0;
    const ease = opts.ease ?? "power2.out";

    if (tween) {
      tween.kill();
      tween = null;
    }

    // duration=0이면 즉시
    if (duration <= 0) {
      camera.position.copy(wp.pos);
      controls.target.copy(wp.target);
      camera.lookAt(wp.target);
      controls.update();
      return;
    }

    const fromPos = camera.position.clone();
    const fromTgt = controls.target.clone();

    tween = gsap.timeline({
      defaults: { duration, ease },
      onUpdate: () => controls.update(),
      onComplete: () => {
        tween = null;
        controls.update();
      },
    });

    tween.to(fromPos, {
      x: wp.pos.x, y: wp.pos.y, z: wp.pos.z,
      onUpdate: () => camera.position.copy(fromPos),
    }, 0);

    tween.to(fromTgt, {
      x: wp.target.x, y: wp.target.y, z: wp.target.z,
      onUpdate: () => controls.target.copy(fromTgt),
    }, 0);
  };

  return { goTo };
}
