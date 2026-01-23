import * as THREE from "three";

function scoreDoor(o: THREE.Object3D) {
  const b = new THREE.Box3().setFromObject(o);
  const s = new THREE.Vector3();
  b.getSize(s);
  return s.x * s.y + s.y * s.z + s.x * s.z;
}

function pickBiggest(list: THREE.Object3D[]) {
  let best: THREE.Object3D | null = null;
  let bestScore = -Infinity;
  for (const o of list) {
    const sc = scoreDoor(o);
    if (sc > bestScore) {
      bestScore = sc;
      best = o;
    }
  }
  return best;
}

/**
 * 문 오브젝트를 찾아 힌지 pivot에 re-parent 하여 회전으로 열 수 있게 세팅
 * - canatst* : left leaf 후보
 * - canatdr* : right leaf 후보
 */
export function setupDoors(root: THREE.Object3D) {
  const leftCandidates: THREE.Object3D[] = [];
  const rightCandidates: THREE.Object3D[] = [];

  root.traverse((o) => {
    const n = (o.name || "").toLowerCase();
    if (n.includes("canatst")) leftCandidates.push(o);
    if (n.includes("canatdr")) rightCandidates.push(o);
  });

  const doorL = pickBiggest(leftCandidates);
  const doorR = pickBiggest(rightCandidates);

  if (!doorL || !doorR) {
    console.warn("[Door] missing leaves", { doorL: !!doorL, doorR: !!doorR });
    return {
      leftDoorPivot: null as THREE.Object3D | null,
      rightDoorPivot: null as THREE.Object3D | null,
      leftDoorClosedY: 0,
      rightDoorClosedY: 0,
    };
  }

  const leftPivot = makeHingePivot({ root, door: doorL, isLeft: true });
  const rightPivot = makeHingePivot({ root, door: doorR, isLeft: false });

  return {
    leftDoorPivot: leftPivot,
    rightDoorPivot: rightPivot,
    leftDoorClosedY: leftPivot.rotation.y,
    rightDoorClosedY: rightPivot.rotation.y,
  };
}

/**
 * hinge pivot: door bbox의 좌/우 끝점을 힌지 위치로 잡아 pivot을 만들고 attach.
 * attach는 월드 트랜스폼을 보존하므로 "날아감" 현상이 줄어듭니다.
 */
function makeHingePivot(params: { root: THREE.Object3D; door: THREE.Object3D; isLeft: boolean }) {
  const { root, door, isLeft } = params;

  const bbox = new THREE.Box3().setFromObject(door);

  const hx = isLeft ? bbox.min.x : bbox.max.x;
  const hy = (bbox.min.y + bbox.max.y) * 0.5;
  const hz = (bbox.min.z + bbox.max.z) * 0.5;

  const pivot = new THREE.Object3D();
  pivot.position.set(hx, hy, hz);
  root.add(pivot);

  // keep world transform
  pivot.attach(door);

  return pivot;
}

export function setDoorsOpenInstant(params: {
  leftPivot: THREE.Object3D | null;
  rightPivot: THREE.Object3D | null;
  leftClosedY: number;
  rightClosedY: number;
  openAngleRad: number;
}) {
  const { leftPivot, rightPivot, leftClosedY, rightClosedY, openAngleRad } = params;
  if (!leftPivot || !rightPivot) return;
  leftPivot.rotation.y = leftClosedY + openAngleRad;
  rightPivot.rotation.y = rightClosedY - openAngleRad;
}

export function setDoorsClosedInstant(params: {
  leftPivot: THREE.Object3D | null;
  rightPivot: THREE.Object3D | null;
  leftClosedY: number;
  rightClosedY: number;
}) {
  const { leftPivot, rightPivot, leftClosedY, rightClosedY } = params;
  if (leftPivot) leftPivot.rotation.y = leftClosedY;
  if (rightPivot) rightPivot.rotation.y = rightClosedY;
}
