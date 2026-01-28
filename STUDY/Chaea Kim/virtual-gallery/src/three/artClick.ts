import * as THREE from "three";

export function installArtClick(params: {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  scene: THREE.Scene;
  openModal: (src: string) => void;
}) {
  const { canvas, camera, scene, openModal } = params;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, camera);

    // TEMP_FRAMES 안의 ART_*만 찾는 게 베스트지만,
    // 간단히 name prefix로 필터
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((h) => h.object?.name?.startsWith("ART_"));
    if (!hit) return;

    // ART_3 => /art/a3.jpg
    const name = hit.object.name; // ART_#
    const n = Number(name.split("_")[1]);
    if (!Number.isFinite(n) || n <= 0) return;

    openModal(`/art/a${n}.jpg`);
  };

  canvas.addEventListener("click", onClick);
  return () => canvas.removeEventListener("click", onClick);
}
