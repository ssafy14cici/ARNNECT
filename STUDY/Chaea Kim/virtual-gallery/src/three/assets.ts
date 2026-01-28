import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function loadGallery(url: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;
  root.name = root.name || "GLB_ROOT";
  return root;
}
