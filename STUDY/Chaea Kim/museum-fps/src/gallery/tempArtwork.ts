import * as THREE from "three";

export function createTempArtwork(params: {
  url: string;
  width?: number;
  height?: number;
  position: [number, number, number];
  rotationY?: number; // 벽 방향
}) {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(params.url);
  tex.colorSpace = THREE.SRGBColorSpace;

  const w = params.width ?? 2.2;
  const h = params.height ?? 1.6;

  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.6,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...params.position);

  if (params.rotationY !== undefined) {
    mesh.rotation.y = params.rotationY;
  }

  return mesh;
}
