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

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* Scene / Camera */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.01, 8000);

  applyGalleryLighting(scene, renderer, { exposure: 1.35, background: "#0f0f0f" });

  // 시작 포즈
  const START = WAYPOINTS[0].pose;
  camera.position.set(...START.pos);
  camera.rotation.set(START.pitch, START.yaw, 0, "YXZ");
  camera.updateMatrixWorld(true);

  /* Controls */
  const controls = new PointerLockControls(camera, renderer.domElement);

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

  /* ===== Mode ===== */
  let mode: Mode = "NAV";

  /* Debug overlay */
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "50%";
  overlay.style.top = "10%";
  overlay.style.transform = "translateX(-50%)";
  overlay.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI";
  overlay.style.fontSize = "40px";
  overlay.style.fontWeight = "800";
  overlay.style.color = "rgba(255,255,255,0.92)";
  overlay.style.textShadow = "0 8px 24px rgba(0,0,0,0.55)";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 180ms ease";
  overlay.textContent = "NAV 0";
  document.body.appendChild(overlay);

  let overlayTimer: number | null = null;
  function flashOverlay(text: string) {
    overlay.textContent = text;
    overlay.style.opacity = "1";
    if (overlayTimer) window.clearTimeout(overlayTimer);
    overlayTimer = window.setTimeout(() => (overlay.style.opacity = "0"), 750);
  }

  /* ===== Modal (임시, 버튼 포함) ===== */
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.left = "50%";
  modal.style.top = "50%";
  modal.style.transform = "translate(-50%,-50%)";
  modal.style.padding = "18px 18px";
  modal.style.borderRadius = "16px";
  modal.style.background = "rgba(0,0,0,0.72)";
  modal.style.border = "1px solid rgba(255,255,255,0.22)";
  modal.style.color = "rgba(255,255,255,0.92)";
  modal.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI";
  modal.style.fontSize = "16px";
  modal.style.fontWeight = "650";
  modal.style.boxShadow = "0 20px 60px rgba(0,0,0,0.45)";
  modal.style.backdropFilter = "blur(10px)";
  modal.style.display = "none";
  modal.style.zIndex = "10000";
  modal.style.minWidth = "280px";
  modal.style.maxWidth = "min(520px, 92vw)";
  modal.style.lineHeight = "1.35";
  document.body.appendChild(modal);

  const modalText = document.createElement("div");
  modalText.style.whiteSpace = "pre-wrap";
  modalText.style.marginBottom = "12px";
  modal.appendChild(modalText);

  const modalBtn = document.createElement("button");
  modalBtn.type = "button";
  modalBtn.textContent = "예술가 프로필 바로가기";
  modalBtn.style.width = "100%";
  modalBtn.style.padding = "10px 12px";
  modalBtn.style.borderRadius = "12px";
  modalBtn.style.border = "1px solid rgba(255,255,255,0.28)";
  modalBtn.style.background = "rgba(255,255,255,0.10)";
  modalBtn.style.color = "rgba(255,255,255,0.92)";
  modalBtn.style.cursor = "pointer";
  modalBtn.style.fontWeight = "750";
  modalBtn.style.transition = "transform 120ms ease, background 120ms ease, border 120ms ease, opacity 120ms ease";
  modal.appendChild(modalBtn);

  modalBtn.addEventListener("mouseenter", () => {
    modalBtn.style.background = "rgba(255,255,255,0.16)";
    modalBtn.style.border = "1px solid rgba(255,255,255,0.40)";
    modalBtn.style.transform = "scale(1.01)";
  });
  modalBtn.addEventListener("mouseleave", () => {
    modalBtn.style.background = "rgba(255,255,255,0.10)";
    modalBtn.style.border = "1px solid rgba(255,255,255,0.28)";
    modalBtn.style.transform = "scale(1)";
  });

  let modalTimer: number | null = null;

  function showArtworkModal(artistName: string, artworkTitle: string) {
    modalText.textContent = `이 작품은 "${artistName}"의 "${artworkTitle}"입니다`;

    // ✅ 링크는 나중에 연결. 지금은 placeholder.
    modalBtn.onclick = () => {
      // 나중에 여기서 location.href = "..."; 로 연결하면 됨
      console.log("[profile] open profile (TODO):", artistName);
    };

    modal.style.display = "block";
    if (modalTimer) window.clearTimeout(modalTimer);
    modalTimer = window.setTimeout(() => (modal.style.display = "none"), 1200);
  }

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

    // pointerlock 방해 방지
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.body.appendChild(btn);
    return btn;
  }

  const navLeft = makeNavButton("left");
  const navRight = makeNavButton("right");

  function setNavUiVisible(v: boolean) {
    navLeft.style.display = v ? "grid" : "none";
    navRight.style.display = v ? "grid" : "none";
  }
  setNavUiVisible(true);

  /* Pose logging (P) */
  function logCameraPose() {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    console.log(
      "[CAM]",
      JSON.stringify({
        pos: [camera.position.x, camera.position.y, camera.position.z],
        yaw: e.y,
        pitch: e.x,
      })
    );
  }

  /* ===== FREE movement ===== */
  const keys = new Set<string>();
  let lastT = performance.now();
  const FREE_MOVE = 9.5;
  const FREE_MOVE_SLOW = 3.2;

  function tickFree(dt: number) {
    const speed = keys.has("ControlLeft") || keys.has("ControlRight") ? FREE_MOVE_SLOW : FREE_MOVE;

    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ").y;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw, 0, "YXZ")).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw, 0, "YXZ")).normalize();

    const move = new THREE.Vector3();
    if (keys.has("KeyW")) move.add(forward);
    if (keys.has("KeyS")) move.addScaledVector(forward, -1);
    if (keys.has("KeyD")) move.add(right);
    if (keys.has("KeyA")) move.addScaledVector(right, -1);
    if (keys.has("Space")) move.y += 1;
    if (keys.has("ShiftLeft") || keys.has("ShiftRight")) move.y -= 1;

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt);
      camera.position.add(move);
      camera.updateMatrixWorld(true);
    }
  }

  function toggleMode() {
    mode = mode === "NAV" ? "FREE" : "NAV";
    setNavUiVisible(mode === "NAV");
    flashOverlay(mode === "NAV" ? `NAV ${currentId}` : "FREE");
    if (mode === "NAV" && controls.isLocked) controls.unlock();
  }

  /* ===== GLB load + colliders + panel art ===== */
  const loader = new GLTFLoader();
  let colliders: THREE.Object3D[] = [];

  function isColliderMesh(o: THREE.Object3D) {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return false;
    const name = (m.name ?? "").toLowerCase();
    if (name.includes("panel")) return false;
    if (name.includes("art_")) return false; // ✅ ART plane는 collider 제외
    if (name.includes("light") || name.includes("camera")) return false;
    return true;
  }

  let currentId = 0;
  let navigator: ReturnType<typeof createWaypointNavigator> | null = null;

  // 클릭 가능한 “그림 plane”
  const clickableArtMeshes: THREE.Object3D[] = [];

  function onArrive(id: number) {
    currentId = id;
    flashOverlay(`NAV ${id}`);
  }

  function nextWaypoint() {
    if (!navigator) return;
    const next = navigator.nextId(currentId);
    navigator.goTo(next);
  }

  function prevWaypoint() {
    if (!navigator) return;
    const prev = navigator.prevId(currentId);
    navigator.goTo(prev);
  }

  // ✅ ART plane 이름 기준으로 매핑 (Blender에서 ART_1..ART_6로 만든다고 했으니 그 기준)
  // 작품명은 임시로 "작품 1" 같은 형태로 넣음. (원하면 실제 작품명 리스트로 교체)
  const ART_ITEMS: PanelArtItem[] = [
    { panelName: "ART_1", imageUrl: `${import.meta.env.BASE_URL}art/b1.jpg`, title: "최수원" },
    { panelName: "ART_2", imageUrl: `${import.meta.env.BASE_URL}art/b2.jpg`, title: "김민성" },
    { panelName: "ART_3", imageUrl: `${import.meta.env.BASE_URL}art/b3.jpg`, title: "이수진" },
    { panelName: "ART_4", imageUrl: `${import.meta.env.BASE_URL}art/b4.jpg`, title: "김지윤" },
    { panelName: "ART_5", imageUrl: `${import.meta.env.BASE_URL}art/b5.jpg`, title: "김채아" },
    { panelName: "ART_6", imageUrl: `${import.meta.env.BASE_URL}art/b6.jpg`, title: "김혜령" },
  ];

  loader.load(
    glbUrl,
    async (gltf) => {
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
        options: {
          // ✅ 여기 올리면 NAV 이동속도 빨라짐
          moveSpeedMps: 5.0,
          turnSpeedRadps: 2.0,

          clearance: 2.8,
          lockY: true,
          bobAmount: 0,
          swayAmount: 0,
        },
        onArrive,
      });

      // 패널에 이미지 붙이기 (ART plane)
      const art = await attachPanelArt({
        sceneRoot: gltf.scene,
        items: ART_ITEMS,
        camera,         // ✅ faceCamera=true 기본 동작에 필요
        fill: 1.02,     // ✅ 프레임 꽉
        epsilon: 0.06,  // ✅ 깜빡임 방지
        fixFlipY: true,
      });

      clickableArtMeshes.push(...art.clickMeshes);

      onArrive(0);
      console.log("[viewer] glb loaded. colliders:", colliders.length, "artClickable:", clickableArtMeshes.length);
      console.log("[hint] NAV: ←/→ or buttons, click artwork => modal. Q: NAV<->FREE. P: log cam");
    },
    undefined,
    (err) => console.error("[viewer] GLB load failed:", err)
  );

  /* ===== Raycast click on artwork ===== */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function raycastArtwork(clientX: number, clientY: number) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    ndc.set(x, y);

    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(clickableArtMeshes, true);
    if (!hits.length) return null;
    return hits[0].object as THREE.Object3D;
  }

  function onPointerMove(e: PointerEvent) {
    if (mode !== "NAV") {
      renderer.domElement.style.cursor = "";
      return;
    }
    const hit = raycastArtwork(e.clientX, e.clientY);
    renderer.domElement.style.cursor = hit ? "pointer" : "";
  }

  function onPointerDown(e: PointerEvent) {
    if (mode === "FREE") {
      if (!controls.isLocked) controls.lock();
      return;
    }

    const hit = raycastArtwork(e.clientX, e.clientY);
    if (hit) {
      const artist = (hit.userData?.__title ?? "작가") as string;

      // ✅ 작품명은 지금 데이터가 없어서 임시로 자동 생성
      // panelName(ART_3 등)에서 번호만 뽑아 "작품 3"으로 표시
      const panel = String(hit.userData?.__panel ?? "");
      const num = panel.match(/\d+/)?.[0] ?? "";
      const artworkTitle = num ? `작품 ${num}` : "작품";

      showArtworkModal(artist, artworkTitle);
      return;
    }
  }

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  /* Keyboard */
  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "KeyQ") {
      e.preventDefault();
      toggleMode();
      return;
    }
    if (e.code === "KeyP") {
      e.preventDefault();
      logCameraPose();
      return;
    }

    keys.add(e.code);

    if (mode === "NAV") {
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
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }

  window.addEventListener("keydown", onKeyDown, { passive: false } as any);
  window.addEventListener("keyup", onKeyUp);

  navLeft.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode !== "NAV") return;
    prevWaypoint();
  });
  navRight.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode !== "NAV") return;
    nextWaypoint();
  });

  /* Loop */
  function loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (mode === "FREE") tickFree(dt);

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    destroy() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("keyup", onKeyUp);

      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);

      if (overlayTimer) window.clearTimeout(overlayTimer);
      if (modalTimer) window.clearTimeout(modalTimer);

      overlay.remove();
      modal.remove();
      navLeft.remove();
      navRight.remove();

      renderer.dispose();
    },
  };
}
