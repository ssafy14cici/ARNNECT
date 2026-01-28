import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function loadFrameGLB(url: string) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  const root = gltf.scene;

  let artSurface: THREE.Mesh | null = null;

  root.traverse((o) => {
    if (o.name === "ART_SURFACE" && (o as any).isMesh) {
      artSurface = o as THREE.Mesh;
    }
  });

  if (!artSurface) {
    console.warn("[FRAME_GLB] ART_SURFACE not found");
  }

  return { root, artSurface };
}
