import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { WaypointId } from "./waypoints";

type Params = {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  controls: OrbitControls;
  onWaypointClick: (id: WaypointId) => void;
};

export function installInteraction(params: Params) {
  const { canvas, camera, scene, onWaypointClick } = params;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);

    // HOTSPOTS 그룹만 타겟팅(성능/오작동 방지)
    const hotspots = scene.getObjectByName("HOTSPOTS");
    if (!hotspots) return;

    const hits = raycaster.intersectObjects(hotspots.children, true);
    if (hits.length === 0) return;

    const obj = hits[0].object;
    const id = obj.userData.waypointId as WaypointId | undefined;
    if (id) onWaypointClick(id);
  };

  canvas.addEventListener("click", onClick);

  // cursor feedback
  const onMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);

    const hotspots = scene.getObjectByName("HOTSPOTS");
    if (!hotspots) return;

    const hits = raycaster.intersectObjects(hotspots.children, true);
    canvas.style.cursor = hits.length ? "pointer" : "default";
  };

  canvas.addEventListener("mousemove", onMove);

  return () => {
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("mousemove", onMove);
  };
}
