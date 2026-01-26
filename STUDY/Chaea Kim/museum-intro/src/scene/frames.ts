import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ArtSlot } from "./interior";

type FrameMaterialStyle = "gold" | "neutral";

type AttachFramesArgs = {
  glbUrl: string;
  artSlots: ArtSlot[];
  materialStyle?: FrameMaterialStyle;
};

type LoadedFrameTemplate = {
  root: THREE.Object3D;
  bboxSize: THREE.Vector3;
};

let _cachedTemplate: LoadedFrameTemplate | null = null;
let _loadingPromise: Promise<LoadedFrameTemplate> | null = null;

export async function attachFramesToArtSlots(args: AttachFramesArgs) {
  const { glbUrl, artSlots, materialStyle = "gold" } = args;

  const tpl = await loadFrameTemplate(glbUrl);

  for (const slot of artSlots) {
    // Create a clone for each slot
    const instance = tpl.root.clone(true);
    instance.name = `FRAME_${slot.id}`;
    instance.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m || !(m as any).isMesh) return;

      // Ensure unique material per instance (avoid shared state)
      const mat = (m.material as any)?.clone?.() ?? m.material;
      m.material = mat;

      // Apply style
      if (materialStyle === "gold") {
        m.material = makeGoldMaterial();
      } else {
        m.material = makeNeutralMaterial();
      }
    });

    // Place slightly in front of art plane
    instance.position.set(0, 0, 0.055);

    // Attach to slot group
    slot.group.add(instance);
    slot.frameRoot = instance;

    // Fit to current slot plane
    refitExistingFrameForSlot(slot, tpl.bboxSize);
  }
}

/**
 * Refit the existing frame of a slot to match the current plane geometry.
 * Call after uploading/geometry change.
 */
export function refitExistingFrameForSlot(slot: ArtSlot, templateBBoxSize?: THREE.Vector3) {
  if (!slot.frameRoot) return;

  // Plane dimensions (prefer PlaneGeometry parameters)
  const geom = slot.plane.geometry as any;
  const w = geom?.parameters?.width ?? getGeometryWidth(slot.plane.geometry);
  const h = geom?.parameters?.height ?? getGeometryHeight(slot.plane.geometry);

  // Compute base size
  const baseSize =
    templateBBoxSize ??
    (() => {
      const b = new THREE.Box3().setFromObject(slot.frameRoot!);
      const s = new THREE.Vector3();
      b.getSize(s);
      return s;
    })();

  // Desired outer frame size: slightly larger than artwork plane
  // (tune margin to taste)
  const margin = 1.14;
  const targetW = w * margin;
  const targetH = h * margin;

  // We assume template is roughly centered and its bbox x/y represent width/height.
  const sx = targetW / Math.max(1e-6, baseSize.x);
  const sy = targetH / Math.max(1e-6, baseSize.y);

  // Keep Z scale mild (frame thickness)
  const sz = Math.min(sx, sy);

  slot.frameRoot.scale.set(sx, sy, sz);
}

function getGeometryWidth(g: THREE.BufferGeometry) {
  const b = new THREE.Box3().setFromBufferAttribute((g as any).attributes.position);
  const s = new THREE.Vector3();
  b.getSize(s);
  return s.x;
}
function getGeometryHeight(g: THREE.BufferGeometry) {
  const b = new THREE.Box3().setFromBufferAttribute((g as any).attributes.position);
  const s = new THREE.Vector3();
  b.getSize(s);
  return s.y;
}

async function loadFrameTemplate(glbUrl: string): Promise<LoadedFrameTemplate> {
  if (_cachedTemplate) return _cachedTemplate;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const root = gltf.scene;

        // Normalize root to its center (helps predictable scaling)
        const box = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        root.position.sub(center);

        _cachedTemplate = { root, bboxSize: size };
        resolve(_cachedTemplate);
      },
      undefined,
      (err) => reject(err)
    );
  });

  return _loadingPromise;
}

function makeGoldMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#caa24a"),
    roughness: 0.35,
    metalness: 0.78,
  });
}
function makeNeutralMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d7d7d7"),
    roughness: 0.65,
    metalness: 0.10,
  });
}
