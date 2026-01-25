import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Frame an object from its "front" direction, considering both vertical and horizontal FOV.
 * - yawDeg: rotate around Y to match model's front direction.
 * - pitchDeg: rotate around X if needed (default 0).
 * - lift: moves the target upward proportionally for a slightly more monumental framing.
 */
export function frameFrontView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  opts?: {
    fill?: number;      // 0~1: larger means tighter framing
    yawDeg?: number;
    pitchDeg?: number;
    lift?: number;      // -0.2~0.3
  }
) {
  const fill = opts?.fill ?? 0.86;
  const yaw = THREE.MathUtils.degToRad(opts?.yawDeg ?? 0);
  const pitch = THREE.MathUtils.degToRad(opts?.pitchDeg ?? 0);
  const lift = opts?.lift ?? 0.10;

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Facing direction (base +Z), adjusted by yaw/pitch.
  const dir = new THREE.Vector3(0, 0, 1);
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  dir.normalize();

  // Target lifted slightly upward (monumental vibe).
  const target = center.clone();
  target.y = box.min.y + size.y * (0.5 + lift);

  // Distance based on both vertical and horizontal FOV.
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const distV = (size.y / (2 * Math.tan(vFov / 2))) / fill;
  const distH = (Math.max(size.x, size.z) / (2 * Math.tan(hFov / 2))) / fill;
  const dist = Math.max(distV, distH);

  const pos = target.clone().add(dir.multiplyScalar(dist));
  camera.position.copy(pos);

  // Clipping stabilization (helps fog + large scenes).
  camera.near = Math.max(0.1, dist / 200);
  camera.far = Math.max(4000, dist * 25);
  camera.updateProjectionMatrix();

  controls.target.copy(target);
  controls.update();
}

/**
 * Projects a world point to screen pixels.
 * Returns screen coords and a visibility flag (in front of camera and within clip space).
 */
export function projectWorldToScreen(
  world: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  viewportW: number,
  viewportH: number
): { x: number; y: number; visible: boolean } {
  const v = world.clone().project(camera);

  const visible = v.z >= -1 && v.z <= 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1;

  const x = (v.x * 0.5 + 0.5) * viewportW;
  const y = (-v.y * 0.5 + 0.5) * viewportH;
  return { x, y, visible };
}
