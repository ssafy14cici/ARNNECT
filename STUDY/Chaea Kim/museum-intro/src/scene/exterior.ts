import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type LoadExteriorArgs = {
  parent: THREE.Group;
  url: string;

  // Remove dotted/patterned floor by overlaying a clean cover plane (no GLB material edits)
  overrideFloorPattern?: boolean;
  floorColor?: string;

  // Optional: overlay an "ARNNECT" sign without editing GLB
  addArnnectSign?: boolean;

  onProgress?: (p01: number) => void;
  onLoaded?: (museumScene: THREE.Object3D) => void;
  onError?: (err: unknown) => void;
};

export function loadMuseumExterior(args: LoadExteriorArgs) {
  const {
    parent,
    url,
    overrideFloorPattern = true,
    floorColor = "#f6f4ef",
    addArnnectSign = false,
    onProgress,
    onLoaded,
    onError,
  } = args;

  if (!parent) throw new Error("[loadMuseumExterior] parent group is required.");

  const loader = new GLTFLoader();

  loader.load(
    url,
    (gltf) => {
      const museum = gltf.scene;

      // 1) Center align (XZ)
      const box = new THREE.Box3().setFromObject(museum);
      const center = new THREE.Vector3();
      box.getCenter(center);

      museum.position.x -= center.x;
      museum.position.z -= center.z;

      // 2) Ground align (minY -> 0)
      const box2 = new THREE.Box3().setFromObject(museum);
      museum.position.y -= box2.min.y;

      parent.add(museum);

      // 3) Floor cover to hide GLB floor pattern
      if (overrideFloorPattern) {
        addFloorCover({
          parent,
          museum,
          color: floorColor,
        });
      }

      // 4) Optional: overlay sign (no GLB edit)
      if (addArnnectSign) {
        const tex = makeTextTexture("ARNNECT");
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(3.2, 0.8),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        );
        // Position is model-dependent; adjust if necessary.
        sign.position.set(0, 5.6, 2.35);
        parent.add(sign);
      }

      onLoaded?.(museum);
    },
    (xhr) => {
      if (xhr.total && xhr.total > 0) onProgress?.(xhr.loaded / xhr.total);
    },
    (err) => onError?.(err)
  );
}

/**
 * Adds a floor cover plane ABOVE the GLB floor top surface.
 * Key fix: do NOT assume y=0 is the floor top (many GLBs have thickness).
 */
function addFloorCover(args: { parent: THREE.Group; museum: THREE.Object3D; color: string }) {
  const { parent, museum, color } = args;

  // Compute bounds for size and center.
  const bounds = new THREE.Box3().setFromObject(museum);
  const size = new THREE.Vector3();
  const centerW = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(centerW);

  // Find floor top (world y).
  const floorTopY_W = findFloorTopYWorld(museum);

  // Convert center and floor top to parent local coordinates (safe even if parent is transformed).
  const centerL = centerW.clone();
  parent.worldToLocal(centerL);

  const floorTopPtW = new THREE.Vector3(centerW.x, floorTopY_W, centerW.z);
  const floorTopPtL = floorTopPtW.clone();
  parent.worldToLocal(floorTopPtL);

  const EPS = Math.max(0.03, size.y * 0.002); // robust anti z-fighting
  const coverY = floorTopPtL.y + EPS;

  const coverSize = Math.max(size.x, size.z) * 2.2;

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.98,
    metalness: 0.0,
  });

  // Stronger polygon offset helps at long distances (removes dotted artifacts).
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -4;
  mat.polygonOffsetUnits = -4;

  const cover = new THREE.Mesh(new THREE.PlaneGeometry(coverSize, coverSize), mat);
  cover.name = "FLOOR_COVER_WHITE";
  cover.rotation.x = -Math.PI / 2;
  cover.position.set(centerL.x, coverY, centerL.z);

  // Ensure it wins in tie cases without disabling depth test.
  cover.renderOrder = 2;
  cover.receiveShadow = true;

  parent.add(cover);
}

/**
 * Heuristic to find the top surface Y of the floor in world coordinates.
 * Looks for large, thin meshes near ground and returns the maximum of their bounding box max.y.
 */
function findFloorTopYWorld(root: THREE.Object3D) {
  const tmpBox = new THREE.Box3();
  const tmpSize = new THREE.Vector3();

  let bestTop = 0;
  let found = false;

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m || !(m as any).isMesh) return;
    if (!m.geometry) return;

    tmpBox.setFromObject(m);
    tmpBox.getSize(tmpSize);

    const bigXZ = tmpSize.x * tmpSize.z;
    const thinY = tmpSize.y < 0.8;      // allow some thickness/steps
    const nearGround = tmpBox.min.y < 1.5;

    if (bigXZ > 80 && thinY && nearGround) {
      found = true;
      bestTop = Math.max(bestTop, tmpBox.max.y);
    }
  });

  return found ? bestTop : 0;
}

function makeTextTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(20,20,20,0.85)";
  ctx.font = "700 72px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Manual "letter spacing" approximation (no ctx.letterSpacing in Canvas 2D API)
  const letters = text.split("");
  const spacing = 14;
  const totalW = (letters.length - 1) * spacing;
  let x = canvas.width / 2 - totalW / 2;
  for (const ch of letters) {
    ctx.fillText(ch, x, canvas.height / 2);
    x += spacing;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
