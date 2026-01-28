import * as THREE from "three";

export function installArtClick(params: {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  scene: THREE.Scene;
  onClickArt: (payload: { id: string; index: number; src: string }) => void;
}) {
  const { canvas, camera, scene, onClickArt } = params;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const pick = (e: MouseEvent | PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, camera);

    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((h) => h.object?.name?.startsWith("ART_"));
    if (!hit) return;

    const id = hit.object.name; // "ART_3"
    const num = Number(id.split("_")[1]);
    if (!Number.isFinite(num) || num <= 0) return;

    onClickArt({ id, index: num, src: `/art/a${num}.jpg` });
  };

  // pointerdown이 click보다 반응이 일정함
  canvas.addEventListener("pointerdown", pick);
  return () => canvas.removeEventListener("pointerdown", pick);
}
