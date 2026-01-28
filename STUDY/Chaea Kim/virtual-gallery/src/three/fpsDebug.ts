import * as THREE from "three";

type FPSOptions = {
  eyeHeight?: number;      // 1.6
  speed?: number;          // units/sec
  fastMult?: number;       // Shift multiplier
  lookSpeed?: number;      // mouse sensitivity
  arrowLookSpeed?: number; // radians/sec for arrow look
};

export function installFpsDebug(params: {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  targetRef: { current: THREE.Vector3 };
  opts?: FPSOptions;
}) {
  const { canvas, camera, targetRef } = params;
  const opts = params.opts ?? {};

  const eyeHeight = opts.eyeHeight ?? 1.6;
  const speed = opts.speed ?? 3.0;
  const fastMult = opts.fastMult ?? 2.0;
  const lookSpeed = opts.lookSpeed ?? 0.002;
  const arrowLookSpeed = opts.arrowLookSpeed ?? 1.6; // rad/sec (체감: 꽤 잘 돎)

  let enabled = false;
  let locked = false;

  // yaw/pitch
  let yaw = 0;
  let pitch = 0;

  // ✅ e.code 기반으로 키 상태 관리 (한글 IME에서도 안정)
  const down = new Set<string>();

  const upAxis = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();

  const clock = new THREE.Clock();

  const clampPitch = () => {
    const lim = Math.PI / 2 - 0.01;
    pitch = Math.max(-lim, Math.min(lim, pitch));
  };

  const applyLook = () => {
    const qYaw = new THREE.Quaternion().setFromAxisAngle(upAxis, yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    camera.quaternion.copy(qYaw).multiply(qPitch);

    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    targetRef.current.copy(camera.position).add(lookDir.multiplyScalar(5));
  };

  const onPointerLockChange = () => {
    locked = document.pointerLockElement === canvas;
  };

  const requestLock = () => {
    canvas.requestPointerLock();
  };

  const exitLock = () => {
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!enabled || !locked) return;
    yaw -= e.movementX * lookSpeed;
    pitch -= e.movementY * lookSpeed;
    clampPitch();
    applyLook();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // F 토글
    if (e.key.toLowerCase() === "f") {
      enabled = !enabled;
      if (!enabled) exitLock();
      console.log(enabled ? "[FPS] ON (click canvas to lock, WASD, arrows to look)" : "[FPS] OFF");
      return;
    }

    if (!enabled) return;

    down.add(e.code);

    // 스크롤/브라우저 기본동작 방지 (FPS 중)
    if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    down.delete(e.code);
  };

  const onClick = () => {
    if (!enabled) return;
    if (!locked) requestLock();
  };

  const update = () => {
    if (!enabled) return;

    const dt = Math.min(clock.getDelta(), 0.05);

    // 눈높이 고정
    camera.position.y = eyeHeight;

    // ✅ 방향키 보기(포인터락 없이도 가능)
    if (down.has("ArrowLeft")) yaw += arrowLookSpeed * dt;
    if (down.has("ArrowRight")) yaw -= arrowLookSpeed * dt;
    if (down.has("ArrowUp")) pitch += arrowLookSpeed * dt;
    if (down.has("ArrowDown")) pitch -= arrowLookSpeed * dt;
    clampPitch();

    // 이동 속도
    const isFast = down.has("ShiftLeft") || down.has("ShiftRight");
    const v = speed * (isFast ? fastMult : 1);

    // forward/right (수평 이동만)
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    right.copy(forward).cross(upAxis).normalize();

    move.set(0, 0, 0);

    // ✅ 이동: WASD만 (방향키는 '보기' 전용)
    if (down.has("KeyW")) move.add(forward);
    if (down.has("KeyS")) move.sub(forward);
    if (down.has("KeyD")) move.add(right);
    if (down.has("KeyA")) move.sub(right);

    // (옵션) 위/아래
    if (down.has("KeyC")) camera.position.y = eyeHeight - 0.2;
    if (down.has("Space")) camera.position.y = eyeHeight + 0.2;

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(v * dt);
      camera.position.add(move);
    }

    applyLook();
  };

  document.addEventListener("pointerlockchange", onPointerLockChange);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("click", onClick);

  console.log("[FPS] ready: Press F to toggle");

  return {
    isEnabled: () => enabled,
    update,
    dispose: () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("click", onClick);
      exitLock();
    },
  };
}
