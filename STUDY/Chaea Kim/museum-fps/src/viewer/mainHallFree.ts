import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

import { WAYPOINTS } from "./waypoints";
import { applyGalleryLighting } from "./lighting";
import { createWaypointNavigator } from "./navigator";

type Options = {
  glbUrl?: string;
  navSizePx?: number;
};

export function mountMainHallFree(canvas: HTMLCanvasElement, opts: Options = {}) {
  const glbUrl = opts.glbUrl ?? `${import.meta.env.BASE_URL}models/main_hall1.glb`;
  const NAV_SIZE = opts.navSizePx ?? 68;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* Scene / Camera */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.01, 8000);

  // 디자인(조명/톤/배경) 분리된 함수 호출
  applyGalleryLighting(scene, renderer, { exposure: 1.35, background: "#0f0f0f" });

  // 시작 포즈
  const START = WAYPOINTS[0].pose;
  camera.position.set(...START.pos);
  camera.rotation.set(START.pitch, START.yaw, 0, "YXZ");
  camera.updateMatrixWorld(true);

  /* Controls */
  const controls = new PointerLockControls(camera, renderer.domElement);

  // ✅ 포인터락은 "캔버스 클릭"에서만
  renderer.domElement.addEventListener("click", () => {
    // 사용자 제스처 체인 안에서만 lock 성공 가능
    controls.lock();
  });

  /* Resize */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(resize);
  setTimeout(resize, 0);

  /* Debug overlay (0~6) */
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "50%";
  overlay.style.top = "10%";
  overlay.style.transform = "translateX(-50%)";
  overlay.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI";
  overlay.style.fontSize = "56px";
  overlay.style.fontWeight = "800";
  overlay.style.color = "rgba(255,255,255,0.92)";
  overlay.style.textShadow = "0 8px 24px rgba(0,0,0,0.55)";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 180ms ease";
  overlay.textContent = "0";
  document.body.appendChild(overlay);

  let overlayTimer: number | null = null;
  function showIndex(i: number) {
    overlay.textContent = String(i);
    overlay.style.opacity = "1";
    if (overlayTimer) window.clearTimeout(overlayTimer);
    overlayTimer = window.setTimeout(() => (overlay.style.opacity = "0"), 650);
  }
  showIndex(0);

  /* Nav UI */
  function makeNavButton(side: "left" | "right") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", side === "left" ? "Prev waypoint" : "Next waypoint");

    btn.style.position = "fixed";
    btn.style.top = "50%";
    btn.style.transform = "translateY(-50%)";
    btn.style.width = `${NAV_SIZE}px`;
    btn.style.height = `${NAV_SIZE}px`;
    btn.style.borderRadius = "999px";
    btn.style.border = "1px solid rgba(255,255,255,0.28)";
    btn.style.background = "rgba(0,0,0,0.28)";
    btn.style.backdropFilter = "blur(6px)";
    btn.style.cursor = "pointer";
    btn.style.display = "grid";
    btn.style.placeItems = "center";
    btn.style.color = "rgba(255,255,255,0.92)";
    btn.style.fontSize = "28px";
    btn.style.lineHeight = "1";
    btn.style.userSelect = "none";
    btn.style.transition = "transform 120ms ease, background 120ms ease, border 120ms ease, opacity 120ms ease";
    btn.style.opacity = "0.72";
    btn.style.zIndex = "9999";

    if (side === "left") btn.style.left = "28px";
    else btn.style.right = "28px";

    btn.textContent = side === "left" ? "‹" : "›";

    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "0.98";
      btn.style.background = "rgba(0,0,0,0.42)";
      btn.style.border = "1px solid rgba(255,255,255,0.45)";
      btn.style.transform = "translateY(-50%) scale(1.06)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = "0.72";
      btn.style.background = "rgba(0,0,0,0.28)";
      btn.style.border = "1px solid rgba(255,255,255,0.28)";
      btn.style.transform = "translateY(-50%) scale(1)";
    });

    // ✅ pointerlock 방해 방지: pointerdown에서 이벤트 차단
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (side === "left") prevWaypoint();
      else nextWaypoint();
    });

    document.body.appendChild(btn);
    return btn;
  }

  const navLeft = makeNavButton("left");
  const navRight = makeNavButton("right");

  /* Log pose (P) */
  function logCameraPose() {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    console.log("[CAM]", JSON.stringify({
      pos: [camera.position.x, camera.position.y, camera.position.z],
      yaw: e.y,
      pitch: e.x,
    }));
  }

  /* GLB load + colliders */
  const loader = new GLTFLoader();
  let colliders: THREE.Object3D[] = [];

  function isColliderMesh(o: THREE.Object3D) {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return false;
    const name = (m.name ?? "").toLowerCase();
    if (name.includes("panel")) return false;
    if (name.includes("light") || name.includes("camera")) return false;
    return true;
  }

  // navigator는 colliders가 생긴 뒤 생성
  let currentId = 0;
  let navigator: ReturnType<typeof createWaypointNavigator> | null = null;

  function onArrive(id: number) {
    currentId = id;
    showIndex(id);
  }

  function nextWaypoint() {
    if (!navigator) return;
    const next = navigator.nextId(currentId); // ✅ 6->0 랩
    navigator.goTo(next);
  }

  function prevWaypoint() {
    if (!navigator) return;
    const prev = navigator.prevId(currentId); // ✅ 0->6 랩
    navigator.goTo(prev);
  }

  loader.load(
    glbUrl,
    (gltf) => {
      scene.add(gltf.scene);

      // colliders
      const tmp: THREE.Object3D[] = [];
      gltf.scene.traverse((o) => {
        if (isColliderMesh(o)) tmp.push(o);
      });
      colliders = tmp;

      navigator = createWaypointNavigator({
        camera,
        waypoints: WAYPOINTS,
        colliders,
        options: { moveDurationSec: 1.7, clearance: 2.8, lockY: true }, // ✅ 더 부드럽게
        onArrive,
      });

      // 시작 표시
      onArrive(0);
      console.log("[viewer] glb loaded. colliders:", colliders.length);
      console.log("[hint] ←/→ or click buttons, P logs pose. 0 can go to 6 with ←.");
    },
    undefined,
    (err) => console.error("[viewer] GLB load failed:", err)
  );

  /* Keyboard */
  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "KeyP") logCameraPose();

    if (e.code === "ArrowRight") {
      e.preventDefault();
      nextWaypoint();
      return;
    }
    if (e.code === "ArrowLeft") {
      e.preventDefault();
      prevWaypoint();
      return;
    }
  }
  window.addEventListener("keydown", onKeyDown, { passive: false } as any);

  /* Loop */
  function tick() {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return {
    destroy() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown as any);
      if (overlayTimer) window.clearTimeout(overlayTimer);
      overlay.remove();
      navLeft.remove();
      navRight.remove();
      renderer.dispose();
    },
  };
}
