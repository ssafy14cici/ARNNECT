// src/viewer/navigator.ts
import * as THREE from "three";
import type { Pose, Waypoint } from "./waypoints";

export type NavigatorOptions = {
  moveSpeedMps?: number; // m/s, default 2.4 (걷기)
  turnSpeedRadps?: number; // rad/s, default 1.8 (고개 회전)
  clearance?: number; // default 2.8
  lockY?: boolean; // default true
  bobAmount?: number; // default 0.05 (m)  너무 크면 멀미
  swayAmount?: number; // default 0.025 (m)
};

export function createWaypointNavigator(args: {
  camera: THREE.PerspectiveCamera;
  waypoints: Waypoint[];
  colliders: THREE.Object3D[];
  options?: NavigatorOptions;
  onArrive?: (id: number) => void;
}) {
  const { camera, waypoints, colliders, onArrive } = args;
  const opt = args.options ?? {};

  const SPEED = opt.moveSpeedMps ?? 8.0;
  const TURN = opt.turnSpeedRadps ?? 5.0;
  const CLEAR = opt.clearance ?? 2.8;
  const LOCK_Y = opt.lockY ?? true;

  const BOB = opt.bobAmount ?? 0.05;
  const SWAY = opt.swayAmount ?? 0.025;

  const raycaster = new THREE.Raycaster();
  let isTransitioning = false;

  // 내부 상태(걷기 애니메이션)
  let bobPhase = 0;

  function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
  }

  // jerk-minimized S-curve (부드러운 가속/감속)
  // t in [0,1]
  function smoothSCurve(t: number) {
    // 6t^5 - 15t^4 + 10t^3 (Perlin smootherstep)
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function vecFromPose(p: Pose) {
    return new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]);
  }

  function checkCollisionAlong(a: THREE.Vector3, b: THREE.Vector3) {
    if (colliders.length === 0) return null;

    const dir = b.clone().sub(a);
    const dist = dir.length();
    if (dist < 1e-6) return null;
    dir.normalize();

    raycaster.set(a, dir);
    raycaster.far = dist;

    const hits = raycaster.intersectObjects(colliders, true);
    if (!hits.length) return null;

    const h = hits[0];
    const normal = h.face?.normal?.clone() ?? new THREE.Vector3(0, 0, 0);
    if (normal.lengthSq() > 0) normal.transformDirection((h.object as THREE.Object3D).matrixWorld).normalize();
    return { point: h.point.clone(), normal };
  }

  // detour 생성 (직선이 막히면 옆으로 비켜가기)
  function buildPath(from: THREE.Vector3, to: THREE.Vector3) {
    const hit = checkCollisionAlong(from, to);
    if (!hit) return [from.clone(), to.clone()];

    const detour = hit.point.clone().add(hit.normal.clone().multiplyScalar(CLEAR));
    const forward = to.clone().sub(from).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

    detour.add(side.multiplyScalar(CLEAR * 0.65));
    if (LOCK_Y) detour.y = from.y;

    const hit2 = checkCollisionAlong(detour, to);
    if (hit2) {
      const detour2 = hit.point.clone().add(hit.normal.clone().multiplyScalar(CLEAR));
      detour2.add(side.multiplyScalar(-CLEAR * 0.85));
      if (LOCK_Y) detour2.y = from.y;
      return [from.clone(), detour2, to.clone()];
    }

    return [from.clone(), detour, to.clone()];
  }

  function getCurrentPose(): Pose {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    return {
      pos: [camera.position.x, camera.position.y, camera.position.z],
      yaw: e.y,
      pitch: e.x,
    };
  }

  // yaw/pitch를 “속도 제한”으로 따라가게 (look lag)
  function stepAngle(current: number, target: number, maxDelta: number) {
    let delta = target - current;
    // wrap shortest
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    delta = THREE.MathUtils.clamp(delta, -maxDelta, maxDelta);
    return current + delta;
  }

  async function goTo(id: number) {
    if (isTransitioning) return;
    isTransitioning = true;

    const wp = waypoints.find((w) => w.id === id);
    if (!wp) {
      isTransitioning = false;
      return;
    }

    const fromPose = getCurrentPose();
    const toPose = wp.pose;

    const from = vecFromPose(fromPose);
    const to = vecFromPose(toPose);
    if (LOCK_Y) to.y = from.y;

    const path = buildPath(from, to);

    // 세그먼트 구성
    const segments: { a: THREE.Vector3; b: THREE.Vector3; len: number }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      segments.push({ a, b, len: a.distanceTo(b) });
    }
    const totalLen = segments.reduce((acc, s) => acc + s.len, 0) || 1;

    // 걷기 시간 = 거리 / 속도
    const totalTime = totalLen / SPEED; // seconds

    // 시작/끝에서 조금 더 여유
    const minTime = 0.9;
    const maxTime = 3.8;
    const T = THREE.MathUtils.clamp(totalTime, minTime, maxTime);

    // 목표 yaw/pitch
    const yawTarget = toPose.yaw;
    const pitchTarget = toPose.pitch;

    // 현재 yaw/pitch
    let yaw = fromPose.yaw;
    let pitch = fromPose.pitch;

    // 프레임 루프
    const t0 = performance.now();

    await new Promise<void>((resolve) => {
      const tick = () => {
        const now = performance.now();
        const t = (now - t0) / (T * 1000);
        const u = smoothSCurve(clamp01(t));

        // u를 path 진행률로 변환(호 길이 기준)
        let dist = u * totalLen;
        let pos = segments[0].a.clone();

        for (const s of segments) {
          if (dist <= s.len) {
            const tt = s.len < 1e-6 ? 1 : dist / s.len;
            pos = s.a.clone().lerp(s.b, tt);
            break;
          }
          dist -= s.len;
        }

        // head bob/sway (이동할 때만 아주 약하게)
        const speedFactor = Math.sin(Math.PI * clamp01(t)); // 0->1->0
        bobPhase += SPEED * 2.2 * (1 / 60);
        const bob = Math.sin(bobPhase * 2.0) * BOB * speedFactor;
        const sway = Math.sin(bobPhase) * SWAY * speedFactor;

        // 카메라의 오른쪽 방향 벡터로 sway 적용
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw, 0, "YXZ")).normalize();

        camera.position.copy(pos);
        if (LOCK_Y) camera.position.y = fromPose.pos[1] + bob;
        else camera.position.y += bob;

        camera.position.addScaledVector(right, sway);

        // look lag: 목표 각도로 “속도 제한” 따라가기
        const dt = 1 / 60;
        const maxDelta = TURN * dt;

        yaw = stepAngle(yaw, yawTarget, maxDelta);
        pitch = THREE.MathUtils.clamp(stepAngle(pitch, pitchTarget, maxDelta), -1.2, 1.2);

        camera.rotation.set(pitch, yaw, 0, "YXZ");
        camera.updateMatrixWorld(true);

        if (t >= 1) {
          // 마지막 정밀 스냅(미세 오차 제거)
          camera.position.set(to.x, LOCK_Y ? fromPose.pos[1] : to.y, to.z);
          camera.rotation.set(pitchTarget, yawTarget, 0, "YXZ");
          camera.updateMatrixWorld(true);

          isTransitioning = false;
          onArrive?.(id);
          resolve();
          return;
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }

  // ✅ 좌/우 이동용 route를 한 번 만든다 (id 순서 무관)
  const lrRoute = buildLeftRightRoute(waypoints);

  function nextId(currentId: number) {
    const i = lrRoute.indexOf(currentId);
    if (i < 0) return lrRoute[0];
    return lrRoute[(i + 1) % lrRoute.length];
  }

  function prevId(currentId: number) {
    const i = lrRoute.indexOf(currentId);
    if (i < 0) return lrRoute[0];
    return lrRoute[(i - 1 + lrRoute.length) % lrRoute.length];
  }

  return {
    goTo,
    nextId,
    prevId,
    getRoute: () => lrRoute.slice(),
    get isTransitioning() {
      return isTransitioning;
    },
  };
}

// ✅ waypoints 좌표로 “좌측/우측 + 중앙” route 자동 생성
function buildLeftRightRoute(waypoints: Waypoint[]) {
  if (!waypoints.length) return [];

  // 중앙 후보: |x|가 가장 작은 포인트 (현재 데이터면 id=0)
  const center = waypoints.reduce((best, w) => {
    const bx = Math.abs(best.pose.pos[0]);
    const wx = Math.abs(w.pose.pos[0]);
    return wx < bx ? w : best;
  }, waypoints[0]);

  const cx = center.pose.pos[0];

  const left = waypoints
    .filter((w) => w.id !== center.id && w.pose.pos[0] < cx)
    // left: "사용자에서 먼 -> 가까운" (z 오름차순)
    .sort((a, b) => a.pose.pos[2] - b.pose.pos[2]);

  const right = waypoints
    .filter((w) => w.id !== center.id && w.pose.pos[0] > cx)
    // right: "가까운 -> 먼" (z 내림차순)
    .sort((a, b) => b.pose.pos[2] - a.pose.pos[2]);

  // 예: [3,2,1,0,6,5,4]
  return [...left.map((w) => w.id), center.id, ...right.map((w) => w.id)];
}
