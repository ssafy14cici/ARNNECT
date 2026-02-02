import * as THREE from "three";

export function findByName(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!found && o.name === name) found = o;
  });
  return found;
}

export function computeFocusBox(root: THREE.Object3D, doorName: string, outlierFactor: number, focusYClip?: number) {
  root.updateMatrixWorld(true);

  const entries: { box: THREE.Box3; maxDim: number }[] = [];

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!mesh.visible) return;

    const geom = mesh.geometry as THREE.BufferGeometry | undefined;
    if (!geom) return;

    if (!geom.boundingBox) geom.computeBoundingBox();
    const bb0 = geom.boundingBox;
    if (!bb0) return;

    const bb = bb0.clone();
    bb.applyMatrix4(mesh.matrixWorld);

    const s = bb.getSize(new THREE.Vector3());
    const maxDim = Math.max(s.x, s.y, s.z);
    if (!(maxDim > 0)) return;

    const n = (mesh.name || "").toLowerCase();
    if (/(collider|collision|navmesh|trigger|helper)/i.test(n)) return;

    entries.push({ box: bb, maxDim });
  });

  if (entries.length < 3) return clipY(new THREE.Box3().setFromObject(root), focusYClip);

  const dims = entries.map((e) => e.maxDim).sort((a, b) => a - b);
  const median = dims[Math.floor(dims.length * 0.5)];
  const threshold = Math.max(median * Math.max(2, outlierFactor), median + 1e-6);

  let kept = entries.filter((e) => e.maxDim <= threshold);

  if (kept.length < Math.max(3, Math.floor(entries.length * 0.25))) {
    kept = entries;
  }

  // door는 무조건 포함
  const door = findByName(root, doorName);
  if (door) {
    const doorBox = new THREE.Box3().setFromObject(door);
    if (!doorBox.isEmpty()) {
      const s = doorBox.getSize(new THREE.Vector3());
      kept.push({ box: doorBox, maxDim: Math.max(s.x, s.y, s.z) });
    }
  }

  const box = new THREE.Box3();
  for (const e of kept) box.union(e.box);
  if (box.isEmpty()) return clipY(new THREE.Box3().setFromObject(root), focusYClip);

  return clipY(box, focusYClip);
}

function clipY(box: THREE.Box3, focusYClip?: number) {
  if (!focusYClip) return box;
  const t = Math.max(0.05, Math.min(1.0, focusYClip));

  const size = box.getSize(new THREE.Vector3());
  const maxY = box.min.y + size.y * t;

  const clipped = box.clone();
  clipped.max.y = Math.min(clipped.max.y, maxY);
  if (clipped.isEmpty()) return box;
  return clipped;
}
