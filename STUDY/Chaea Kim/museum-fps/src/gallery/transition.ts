import * as THREE from "three";
import gsap from "gsap";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type ViewPose = {
  pos: THREE.Vector3;
  target: THREE.Vector3;
};

type GoToOptions = {
  duration?: number;
  ease?: string;

  /**
   * ✅ 이동 중 target.y를 "부드럽게" 보정해서 고개 끄덕임(급격한 pitch 변화)을 완화.
   * - via 포인트 이동에만 true 권장
   * - 최종 작품 시점은 false(정확한 시야 유지) 권장
   */
  smoothTargetY?: boolean;

  /**
   * smoothTargetY가 true일 때, y 보간에 적용할 커브.
   * 기본값: "sine.inOut" (고개 움직임에 자연스러움)
   */
  smoothTargetYEase?: string;
};

export function createTransitionController(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetRef?: { current: THREE.Vector3 }
) {
  let tl: gsap.core.Timeline | null = null;

  const apply = (pos: THREE.Vector3, target: THREE.Vector3) => {
    camera.position.copy(pos);
    controls.target.copy(target);
    if (targetRef) targetRef.current.copy(target);
    camera.lookAt(target);
    controls.update();
  };

  const goTo = (pose: ViewPose, opts: GoToOptions = {}) => {
    const duration = opts.duration ?? 1.0;
    const ease = opts.ease ?? "power2.out";
    const smoothTargetY = opts.smoothTargetY ?? false;
    const smoothYEase = opts.smoothTargetYEase ?? "sine.inOut";

    if (tl) {
      tl.kill();
      tl = null;
    }

    // 즉시 이동
    if (duration <= 0) {
      apply(pose.pos, pose.target);
      return;
    }

    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();

    const p = fromPos.clone();
    const t = fromTarget.clone();

    const fromY = fromTarget.y;
    const toY = pose.target.y;

    tl = gsap.timeline({
      defaults: { duration, ease },
      onUpdate: () => {
        // position은 항상 p를 따른다
        camera.position.copy(p);

        // target은 기본적으로 t를 따르되,
        // smoothTargetY면 y만 별도 보간(고개 흔들림 완화)
        if (smoothTargetY) {
          const prog = tl ? tl.progress() : 1; // 0..1
          // progress에 easing 적용한 값으로 y 보간
          const eased = gsap.parseEase(smoothYEase)(prog);
          t.y = THREE.MathUtils.lerp(fromY, toY, eased);
        }

        controls.target.copy(t);
        if (targetRef) targetRef.current.copy(t);

        camera.lookAt(t);
        controls.update();
      },
      onComplete: () => {
        tl = null;
        apply(pose.pos, pose.target);
      },
    });

    // position 보간
    tl.to(p, { x: pose.pos.x, y: pose.pos.y, z: pose.pos.z }, 0);

    // target 보간 (x,z는 그대로 보간, y는 smoothTargetY에서 onUpdate가 덮어쓸 수 있음)
    tl.to(t, { x: pose.target.x, y: pose.target.y, z: pose.target.z }, 0);
  };

  return { goTo };
}
