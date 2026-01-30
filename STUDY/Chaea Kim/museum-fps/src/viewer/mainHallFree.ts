// src/viewer/mainHallFree.ts
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

type Mode = "NAV" | "FREE";

type ArtworkItem = {
  id: number;
  artist: string;
  artworkTitle: string; // 임시
  imageUrl: string;
  // 블렌더에서 만든 아트 plane 이름 (ART_1 ~ ART_6)
  anchorName: string;
};

type LogoAttachOptions = {
  wallName: string; // 벽 mesh 이름
  imageUrl: string; // public/logo/...
  widthM: number; // meters
  heightM: number; // meters
  offsetM: number; // 벽에서 살짝 띄우기
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

  applyGalleryLighting(scene, renderer, { exposure: 1.35, background: "#0f0f0f" });

  // ✅ 시작 포즈(너가 원하는 pos)
  // yaw/pitch는 WAYPOINTS[0] 기준 유지(원하면 여기서도 바꿔도 됨)
  const START = WAYPOINTS[0]?.pose ?? { pos: [0, 10, 50], yaw: 0, pitch: 0 };
  camera.position.set(0.9291789044332271, 14.956010437011718, 84.5461687224954);
  camera.rotation.set(START.pitch ?? 0, START.yaw ?? 0, 0, "YXZ");
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

  /* Modal (작품 클릭 안내 + 버튼) */
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
  modal.style.textAlign = "center";
  document.body.appendChild(modal);

  const modalText = document.createElement("div");
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
  modalBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // 링크 연결은 나중에
    modal.style.display = "none";
  });
  modal.appendChild(modalBtn);

  let modalTimer: number | null = null;
  function showArtworkModal(artist: string, artworkTitle: string) {
    modalText.textContent = `이 작품은 "${artist}"의 "${artworkTitle}"입니다`;
    modal.style.display = "block";
    if (modalTimer) window.clearTimeout(modalTimer);
    modalTimer = window.setTimeout(() => (modal.style.display = "none"), 2000);
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

  /* ===== GLB load + colliders + ART + LOGO ===== */
  const loader = new GLTFLoader();
  let colliders: THREE.Object3D[] = [];

  function isColliderMesh(o: THREE.Object3D) {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return false;
    const name = (m.name ?? "").toLowerCase();
    // ART plane / panel 같은 건 충돌체에서 제외(시점 이동 안정)
    if (name.includes("art_")) return false;
    if (name.includes("panel")) return false;
    if (name.includes("light") || name.includes("camera")) return false;
    return true;
  }

  let currentId = 0;
  let navigator: ReturnType<typeof createWaypointNavigator> | null = null;

  // ✅ 클릭 가능한 “작품 plane”들
  const clickableArtMeshes: THREE.Mesh[] = [];

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

  // ✅ 너가 요청한 6명 + 이미지
  const ART_ITEMS: ArtworkItem[] = [
    { id: 1, anchorName: "ART_1", artist: "최수원", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b1.jpg` },
    { id: 2, anchorName: "ART_2", artist: "김민성", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b2.jpg` },
    { id: 3, anchorName: "ART_3", artist: "이수진", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b3.jpg` },
    { id: 4, anchorName: "ART_4", artist: "김지윤", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b4.jpg` },
    { id: 5, anchorName: "ART_5", artist: "김채아", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b5.jpg` },
    { id: 6, anchorName: "ART_6", artist: "김혜령", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b6.jpg` },
  ];

  // ✅ 로고(정면 벽)
  const LOGO: LogoAttachOptions = {
    wallName: "pCube19_lambert1_0", // 네 스샷에서 본 벽
    imageUrl: `${import.meta.env.BASE_URL}logo/arnnect_logo_ver1.png`,
    widthM: 75,
    heightM: 75,
    offsetM: 0.25,
  };

  function findObjectByName(root: THREE.Object3D, targetName: string): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    root.traverse((o) => {
      if (found) return;
      if (o.name === targetName) found = o;
    });
    return found;
  }

  async function loadTexture(url: string) {
    const tex = await new THREE.TextureLoader().loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    // ✅ GLB/plane용은 flipY=false가 안정적인 편
    tex.flipY = true;
    tex.needsUpdate = true;
    return tex;
  }

  function computeWorldNormalFromLocalZ(obj: THREE.Object3D) {
    const q = new THREE.Quaternion();
    obj.getWorldQuaternion(q);
    return new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
  }

  function computeWorldPos(obj: THREE.Object3D) {
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    return v;
  }

  function computeWorldSizeOfMesh(mesh: THREE.Mesh) {
    mesh.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  // ✅ ART plane(블렌더에서 만든 평면)에 "꽉" 맞게 이미지 붙이기
  async function attachArtToPlanes(root: THREE.Object3D) {
    const missing: string[] = [];
    const attached: THREE.Mesh[] = [];

    for (const item of ART_ITEMS) {
      const obj = findObjectByName(root, item.anchorName);
      if (!obj) {
        missing.push(item.anchorName);
        continue;
      }
      if (!(obj as any).isMesh) {
        // mesh가 아니면 자식에서 mesh 찾기
        let meshChild: THREE.Mesh | null = null;
        obj.traverse((o) => {
          if (meshChild) return;
          if ((o as any).isMesh) meshChild = o as THREE.Mesh;
        });
        if (!meshChild) {
          missing.push(item.anchorName);
          continue;
        }
        await attachToMeshPlane(meshChild, item);
        attached.push(meshChild);
      } else {
        const mesh = obj as THREE.Mesh;
        await attachToMeshPlane(mesh, item);
        attached.push(mesh);
      }
    }

    if (missing.length) console.warn("[art] missing planes:", missing);

    // 각 작품 위에 스폿라이트 추가
    for (const mesh of attached) {
      addArtSpotlight(mesh);
    }

    return attached;
  }

  function addArtSpotlight(mesh: THREE.Mesh) {
    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);

    // 작품 법선 방향 추정 (plane이므로 localZ가 법선)
    const normal = new THREE.Vector3(0, 0, 1);
    normal.applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));

    // 법선 방향 + 위쪽으로 살짝 오프셋한 위치에서 비춤
    const lightPos = pos.clone()
      .addScaledVector(normal, 3)   // 작품 앞으로 3m
      .add(new THREE.Vector3(0, 4, 0)); // 위로 4m

    const spot = new THREE.SpotLight(0xfff4e0, 7.0, 35, Math.PI / 4.5, 0.45, 0.8);
    spot.position.copy(lightPos);
    spot.target.position.copy(pos);
    scene.add(spot);
    scene.add(spot.target);
  }

  async function attachToMeshPlane(planeMesh: THREE.Mesh, item: ArtworkItem) {
    const tex = await loadTexture(item.imageUrl);

    // ✅ 기존 메테리얼 덮어쓰기: plane에 그림이 꽉 차게
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide, // 앞/뒤 보이게
    });

    planeMesh.material = mat;

    // ✅ 뒤집힘(상하 반전)이 남으면 여기서 보정
    // (flipY=false 기준. 만약 뒤집혀 보이면 아래 한 줄만 true로 바꿔서 테스트)
    // tex.flipY = true; tex.needsUpdate = true;

    // 클릭 데이터
    planeMesh.userData.__artId = item.id;
    planeMesh.userData.__artist = item.artist;
    planeMesh.userData.__title = item.artworkTitle;

    // 클릭 레이캐스트 대상에 포함
    clickableArtMeshes.push(planeMesh);

    // 안정: z-fighting 줄이기(plane이 벽에 딱 붙으면 지지직)
    // plane이 이미 벽에서 살짝 떠있게 모델링 되어있다면 영향 적음.
    // 그래도 화면 지지직이면 polygonOffset으로 해결
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
  }

  // ✅ 정면 벽에 로고 plane을 새로 만들어서 붙임(박힘/뒤집힘 자동보정)
  async function attachLogoToWall(root: THREE.Object3D) {
    const wall = findObjectByName(root, LOGO.wallName);
    if (!wall || !(wall as any).isMesh) {
      console.warn("[logo] wall not found or not mesh:", LOGO.wallName);
      return null;
    }
    const wallMesh = wall as THREE.Mesh;

    const tex = await loadTexture(LOGO.imageUrl);

    const logoGeo = new THREE.PlaneGeometry(LOGO.widthM, LOGO.heightM);
    const logoMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // z-fighting 방지
    logoMat.polygonOffset = true;
    logoMat.polygonOffsetFactor = -3;
    logoMat.polygonOffsetUnits = -3;

    const logo = new THREE.Mesh(logoGeo, logoMat);

    // 벽 월드 포즈
    const wallPos = computeWorldPos(wallMesh);
    const wallQuat = new THREE.Quaternion();
    wallMesh.getWorldQuaternion(wallQuat);

    // 벽의 "앞 방향" 후보: local +Z
    let n = computeWorldNormalFromLocalZ(wallMesh);

    // ✅ 카메라 쪽을 향하도록 normal 방향 자동 교정(박힘 해결)
    const toCam = new THREE.Vector3().subVectors(camera.position, wallPos).normalize();
    if (n.dot(toCam) < 0) n.multiplyScalar(-1);

    // 로고의 회전: 벽과 동일한 평면에 붙이기(벽 회전 사용)
    logo.quaternion.copy(wallQuat);

    // 로고 위치: 벽 중심 + n * offset
    logo.position.copy(wallPos).addScaledVector(n, LOGO.offsetM);

    // ✅ 상하 뒤집힘이 남으면 여기서 고정 (flipY=false 기준)
    // 필요할 때만 켜기:
    // logo.scale.y *= -1;

    // scene에 추가 (root에 붙이면 벽 transform 따라가므로 root에 붙여도 됨)
    scene.add(logo);

    return logo;
  }

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
          // ✅ 여기 숫자 올리면 “NAV 이동 속도” 빨라짐
          moveSpeedMps: 3.6,
          turnSpeedRadps: 1.8,
          clearance: 2.8,
          lockY: true,

          // ✅ 흔들림 싫으면 0으로
          bobAmount: 0.0,
          swayAmount: 0.0,
        },
        onArrive,
      });

      // ✅ ART plane 붙이기
      await attachArtToPlanes(gltf.scene);

      // ✅ 로고 붙이기
      await attachLogoToWall(gltf.scene);

      // ✅ 시작을 확실히 0번으로 스냅(시작 pos 바꿔도 뒤틀림 방지)
      try {
        // navigator 구현에 immediate 옵션이 없다면 이 호출만으로도 대부분 안정
        navigator.goTo(0);
      } catch {
        // ignore
      }
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
    return hits[0].object as THREE.Mesh;
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
      const artist = (hit.userData?.__artist ?? "예술가") as string;
      const title = (hit.userData?.__title ?? "작품명") as string;
      showArtworkModal(artist, title);
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
