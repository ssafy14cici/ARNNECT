import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * frameFrontView
 * - 오브젝트를 화면에 "정면 크게" 맞추는 프레이밍
 * - yawDeg로 GLB 정면 방향만 한 번 잡으면 이후 안정적
 */
export function frameFrontView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  opts?: {
    fill?: number;
    yawDeg?: number;
    pitchDeg?: number;
    lift?: number;
  }
) {
  const fill = opts?.fill ?? 0.86;
  const yaw = THREE.MathUtils.degToRad(opts?.yawDeg ?? 0);
  const pitch = THREE.MathUtils.degToRad(opts?.pitchDeg ?? 0);
  const lift = opts?.lift ?? 0.1;

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const dir = new THREE.Vector3(0, 0, 1);
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  dir.normalize();

  const target = center.clone();
  target.y = box.min.y + size.y * (0.5 + lift);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const distV = (size.y / (2 * Math.tan(vFov / 2))) / fill;
  const distH = (Math.max(size.x, size.z) / (2 * Math.tan(hFov / 2))) / fill;
  const dist = Math.max(distV, distH);

  const pos = target.clone().add(dir.multiplyScalar(dist));
  camera.position.copy(pos);

  camera.near = Math.max(0.1, dist / 200);
  camera.far = Math.max(4000, dist * 20);
  camera.updateProjectionMatrix();

  controls.target.copy(target);
  controls.update();
}
