import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

import { WAYPOINTS } from "./waypoints";
import { applyGalleryLighting } from "./lighting";
import { createWaypointNavigator } from "./navigator";
import { attachPanelArt, type PanelArtItem } from "./panelArt";

type Options = {
  glbUrl?: string;
  navSizePx?: number;
};

type Mode = "NAV" | "FREE";

export function mountMainHallFree(canvas: HTMLCanvasElement, opts: Options = {}) {
  const glbUrl = opts.glbUrl ?? `${import.meta.env.BASE_URL}models/main_hall1.glb`;
  const NAV_SIZE = opts.navSizePx ?? 68;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.01, 8000);

  applyGalleryLighting(scene, renderer, { exposure: 1.35, background: "#0f0f0f" });

  const START = WAYPOINTS[0].pose;
  camera.position.set(...START.pos);
  camera.rotation.set(START.pitch, START.yaw, 0, "YXZ");

  const controls = new PointerLockControls(camera, renderer.domElement);
  let mode: Mode = "NAV";

  /* UI Layer */
  const overlay = document.createElement("div");
  Object.assign(overlay.style, { position: "fixed", left: "50%", top: "10%", transform: "translateX(-50%)", color: "white", fontSize: "40px", fontWeight: "800", opacity: "0", pointerEvents: "none", transition: "opacity 180ms", zIndex: "1000" });
  document.body.appendChild(overlay);

  const modal = document.createElement("div");
  Object.assign(modal.style, { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", padding: "20px", background: "rgba(0,0,0,0.85)", color: "white", display: "none", zIndex: "10000", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(5px)" });
  document.body.appendChild(modal);

  function flash(t: string) { overlay.textContent = t; overlay.style.opacity = "1"; setTimeout(() => overlay.style.opacity = "0", 800); }
  function showModal(t: string) { modal.textContent = t; modal.style.display = "block"; setTimeout(() => modal.style.display = "none", 2000); }

  const navLeft = document.createElement("button");
  const navRight = document.createElement("button");
  [navLeft, navRight].forEach((b, i) => {
    Object.assign(b.style, { position: "fixed", top: "50%", width: "70px", height: "70px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "35px", cursor: "pointer", zIndex: "999", backdropFilter: "blur(4px)" });
    b.textContent = i === 0 ? "‹" : "›";
    if (i === 0) b.style.left = "30px"; else b.style.right = "30px";
    document.body.appendChild(b);
  });

  let currentId = 0;
  let navigator: any = null;
  const clickableArtMeshes: THREE.Object3D[] = [];

  const loader = new GLTFLoader();
  loader.load(glbUrl, async (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true); 

    const colliders: THREE.Object3D[] = [];
    gltf.scene.traverse(o => { 
      if ((o as THREE.Mesh).isMesh && !o.name.includes("light") && !o.name.includes("Camera")) {
        colliders.push(o); 
      }
    });

    navigator = createWaypointNavigator({
      camera, waypoints: WAYPOINTS, colliders, 
      onArrive: (id) => { currentId = id; flash(`NAV ${id}`); }
    });

    const TITLES = ["최수원", "김민성", "이수진", "김지윤", "김채아", "김혜령"];
    const IMAGES = ["b1.jpg", "b2.jpg", "b3.jpg", "b4.jpg", "b5.jpg", "b6.jpg"];
    const ART_ITEMS: PanelArtItem[] = TITLES.map((t, i) => ({ title: t, imageUrl: `${import.meta.env.BASE_URL}art/${IMAGES[i]}` }));

    const art = await attachPanelArt({
      sceneRoot: gltf.scene,
      items: ART_ITEMS,
      waypoints: WAYPOINTS.slice(1, 7).map(w => w.pose),
      epsilon: 0.04, // 우측 각도 안정성을 위해 epsilon을 소폭 상향
      faceProbeScale: 0.85, // 좌측 사진이 넘치지 않게 조절
      debug: false
    });
    
    clickableArtMeshes.push(...art.clickMeshes);
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  canvas.addEventListener("pointerdown", (e) => {
    if (mode === "FREE") { if(!controls.isLocked) controls.lock(); return; }
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(clickableArtMeshes);
    if (hits.length) showModal(`🎨 작품 정보: ${hits[0].object.userData.__title}`);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyQ") { 
      mode = mode === "NAV" ? "FREE" : "NAV"; 
      flash(`MODE: ${mode}`); 
      [navLeft, navRight].forEach(b => b.style.display = mode === "NAV" ? "block" : "none"); 
      if(mode === "NAV") controls.unlock(); 
    }
    if (mode === "NAV") {
      if (e.code === "ArrowRight") navigator?.goTo(navigator.nextId(currentId));
      if (e.code === "ArrowLeft") navigator?.goTo(navigator.prevId(currentId));
    }
  });

  navLeft.onclick = () => navigator?.goTo(navigator.prevId(currentId));
  navRight.onclick = () => navigator?.goTo(navigator.nextId(currentId));

  function resize() { 
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h); 
    camera.aspect = w / h; 
    camera.updateProjectionMatrix(); 
  }
  window.addEventListener("resize", resize); resize();

  const keys = new Set<string>();
  window.addEventListener("keydown", (e) => keys.add(e.code));
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  function loop() {
    if (mode === "FREE" && controls.isLocked) {
      const speed = 0.12;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0; dir.normalize();
      const side = new THREE.Vector3().crossVectors(camera.up, dir).normalize();
      if (keys.has("KeyW")) camera.position.addScaledVector(dir, speed);
      if (keys.has("KeyS")) camera.position.addScaledVector(dir, -speed);
      if (keys.has("KeyA")) camera.position.addScaledVector(side, speed);
      if (keys.has("KeyD")) camera.position.addScaledVector(side, -speed);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return { destroy: () => { renderer.dispose(); [overlay, modal, navLeft, navRight].forEach(el => el.remove()); } };
}