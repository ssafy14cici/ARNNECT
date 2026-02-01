// src/intro/safeArea.ts
import * as THREE from "three";
import type { CameraPose } from "./types";
import type { IntroUI } from "./ui";
import { clamp } from "./utils";

export function computeSafeAreaRatios(args: {
  ui: IntroUI;
  padPx?: number;
  bottomSafeRatio?: number;
  topWhitespaceRatio?: number; // 강제 최소 상단 여백 비율
}) {
  const { ui } = args;
  const h = Math.max(1, window.innerHeight);

  const padPx = args.padPx ?? 16;
  const forcedTopWhitespaceRatio = clamp(args.topWhitespaceRatio ?? 0.30, 0.0, 0.48);
  const bottomSafeRatio = clamp(args.bottomSafeRatio ?? 0.02, 0.0, 0.2);

  // hero/menu가 아직 opacity 0이어도 rect는 나옴 (display:none만 아니면 OK)
  const heroRect = ui.heroOverlay?.getBoundingClientRect?.();
  const menuRect = ui.menuBtn?.getBoundingClientRect?.();

  const heroBottom = heroRect ? heroRect.bottom : 0;
  const menuBottom = menuRect ? menuRect.bottom : 0;

  const measuredTopPx = Math.max(heroBottom || 0, menuBottom || 0);
  let topSafeRatio = (measuredTopPx + padPx) / h;

  // 강제 최소 상단 여백
  topSafeRatio = Math.max(topSafeRatio, forcedTopWhitespaceRatio);
  topSafeRatio = clamp(topSafeRatio, 0.0, 0.48);

  return { topSafeRatio, bottomSafeRatio };
}

export function refinePoseToSafeArea(args: {
  pose: CameraPose;
  box: THREE.Box3;
  camera: THREE.PerspectiveCamera;
  topSafeRatio: number;
  bottomSafeRatio: number;
  scale?: number; // <1: 더 작게(뒤로), >1: 더 크게(앞으로)
}) {
  const { pose, box, camera, topSafeRatio, bottomSafeRatio } = args;
  const scale = clamp(args.scale ?? 1.0, 0.35, 3.0);
  if (!box || box.isEmpty()) return pose;

  const pos = new THREE.Vector3(...pose.position);
  const target0 = new THREE.Vector3(...pose.target);

  const desiredYMin = -1 + 2 * clamp(bottomSafeRatio, 0, 0.2);
  const topLimit = 1 - 2 * clamp(topSafeRatio, 0, 0.75);
  const avail = Math.max(0.22, topLimit - desiredYMin);

  const corners = getBoxCorners(box);

  const setCam = (p: THREE.Vector3, t: THREE.Vector3) => {
    camera.position.copy(p);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(t);
    camera.updateMatrixWorld(true);
  };

  const yRange = (p: THREE.Vector3, t: THREE.Vector3) => {
    setCam(p, t);
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const c of corners) {
      const v = c.clone().project(camera);
      yMin = Math.min(yMin, v.y);
      yMax = Math.max(yMax, v.y);
    }
    return { yMin, yMax, span: yMax - yMin };
  };

  let target = target0.clone();
  let p = pos.clone();

  // 1) 기본: 너무 크면 뒤로 빼기
  for (let i = 0; i < 7; i++) {
    const r = yRange(p, target);
    if (r.span <= avail) break;
    const factor = clamp(r.span / avail, 1.02, 1.45);
    p = target.clone().add(p.clone().sub(target).multiplyScalar(factor));
  }

  // 1b) scale > 1 : 더 크게(앞으로)
  if (scale > 1.001) {
    const r0 = yRange(p, target);
    const desiredSpan = Math.min(avail * 0.985, r0.span * scale);

    for (let i = 0; i < 7; i++) {
      const r = yRange(p, target);
      if (r.span >= desiredSpan * 0.995) break;

      const factor = clamp(r.span / desiredSpan, 0.55, 0.98);
      const v = p.clone().sub(target);
      p = target.clone().add(v.multiplyScalar(factor));

      const rr = yRange(p, target);
      if (rr.span > avail * 0.995) break;
    }
  }

  // 1c) scale < 1 : 더 작게(뒤로)
  if (scale < 0.999) {
    const r0 = yRange(p, target);
    const desiredSpan = Math.max(0.08, r0.span * scale);

    for (let i = 0; i < 7; i++) {
      const r = yRange(p, target);
      if (r.span <= desiredSpan * 1.01) break;

      const factor = clamp(r.span / desiredSpan, 1.02, 1.55);
      p = target.clone().add(p.clone().sub(target).multiplyScalar(factor));
    }
  }

  // 2) 하단을 desiredYMin 근처에 맞추고, 상단은 topSafe 아래로
  const shiftMax = Math.max(0.5, box.getSize(new THREE.Vector3()).y) * 1.2;

  for (let pass = 0; pass < 4; pass++) {
    const base = target0.clone();
    let lo = -shiftMax;
    let hi = shiftMax;

    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) * 0.5;
      const t = base.clone().add(new THREE.Vector3(0, mid, 0));
      const r = yRange(p, t);
      if (r.yMin > desiredYMin) lo = mid;
      else hi = mid;
    }

    target = base.clone().add(new THREE.Vector3(0, hi, 0));
    const r2 = yRange(p, target);
    if (r2.yMax <= topLimit + 0.01) break;

    const need = clamp((r2.yMax - topLimit) / Math.max(0.1, avail), 0.08, 0.35);
    const factor = 1 + need;
    p = target.clone().add(p.clone().sub(target).multiplyScalar(factor));
  }

  return {
    position: [p.x, p.y, p.z],
    target: [target.x, target.y, target.z],
    fov: pose.fov,
  };
}

function getBoxCorners(box: THREE.Box3) {
  const min = box.min;
  const max = box.max;
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];
}
