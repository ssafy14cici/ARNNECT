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
  artworkTitle: string;
  imageUrl: string;
  anchorName: string; // ART_1 ~ ART_6
  wpId?: number; // (선택) 수동 웨이포인트 고정
};

type LogoAttachOptions = {
  wallName: string;
  imageUrl: string;
  widthM: number;
  heightM: number;
  offsetM: number;
};

export function mountMainHallFree(canvas: HTMLCanvasElement, opts: Options = {}) {
  const glbUrl = opts.glbUrl ?? `${import.meta.env.BASE_URL}models/main_hall1.glb`;
  const NAV_SIZE = opts.navSizePx ?? 68;

  const ORIGIN_ID = 0;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* Scene / Camera */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.01, 8000);

  applyGalleryLighting(scene, renderer, { exposure: 1.35, background: "#0f0f0f" });

  // 시작 포즈
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

  /* ===== "원점(=0번)으로" 버튼 ===== */
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "↩ 원점으로 돌아가기";
  backBtn.style.position = "fixed";
  backBtn.style.left = "50%";
  backBtn.style.bottom = "28px";
  backBtn.style.transform = "translateX(-50%)";
  backBtn.style.padding = "12px 16px";
  backBtn.style.borderRadius = "999px";
  backBtn.style.border = "1px solid rgba(255,255,255,0.28)";
  backBtn.style.background = "rgba(0,0,0,0.35)";
  backBtn.style.backdropFilter = "blur(8px)";
  backBtn.style.color = "rgba(255,255,255,0.92)";
  backBtn.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI";
  backBtn.style.fontSize = "15px";
  backBtn.style.fontWeight = "800";
  backBtn.style.cursor = "pointer";
  backBtn.style.zIndex = "9999";
  backBtn.style.display = "none";
  backBtn.style.transition = "transform 120ms ease, background 120ms ease, opacity 120ms ease";
  backBtn.style.opacity = "0.92";

  backBtn.addEventListener("mouseenter", () => {
    backBtn.style.background = "rgba(0,0,0,0.48)";
    backBtn.style.transform = "translateX(-50%) scale(1.04)";
  });
  backBtn.addEventListener("mouseleave", () => {
    backBtn.style.background = "rgba(0,0,0,0.35)";
    backBtn.style.transform = "translateX(-50%) scale(1)";
  });

  // pointer lock 방해 방지
  backBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.body.appendChild(backBtn);

  function setBackBtnVisible(v: boolean) {
    backBtn.style.display = v ? "inline-flex" : "none";
    backBtn.disabled = false;
    backBtn.textContent = "↩ 원점으로 돌아가기";
    backBtn.style.opacity = v ? "0.92" : "0";
  }

  function setBackBtnBusy(v: boolean) {
    backBtn.disabled = v;
    backBtn.textContent = v ? "원점으로 이동 중…" : "↩ 원점으로 돌아가기";
    backBtn.style.opacity = v ? "0.85" : "0.92";
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

  /* ===== NAV wobble (cursor-follow) : rotation-only, no position 영향 ===== */
  const pointerT = new THREE.Vector2(0, 0);
  const pointerS = new THREE.Vector2(0, 0);

  // “적당히 아주 조금”
  const WOBBLE_YAW = 0.055; // rad
  const WOBBLE_PITCH = 0.035; // rad
  const WOBBLE_DAMP = 0.10;

  // 이전 프레임에 적용한 wobble(누적 방지용)
  let wobYawApplied = 0;
  let wobPitchApplied = 0;

  function updateNavWobble(dt: number) {
    // FREE에서는 wobble을 완전히 제거(포인터락/마우스룩에 간섭 방지)
    if (mode !== "NAV") {
      if (Math.abs(wobYawApplied) > 1e-6 || Math.abs(wobPitchApplied) > 1e-6) {
        const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
        const baseYaw = e.y - wobYawApplied;
        const basePitch = e.x - wobPitchApplied;
        camera.rotation.set(basePitch, baseYaw, 0, "YXZ");
        camera.updateMatrixWorld(true);
        wobYawApplied = 0;
        wobPitchApplied = 0;
      }
      pointerT.set(0, 0);
      pointerS.lerp(pointerT, 0.25);
      return;
    }

    const t = 1 - Math.pow(1 - WOBBLE_DAMP, Math.max(1, dt * 60));
    pointerS.x = lerp(pointerS.x, pointerT.x, t);
    pointerS.y = lerp(pointerS.y, pointerT.y, t);

    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    const baseYaw = e.y - wobYawApplied;
    const basePitch = e.x - wobPitchApplied;

    const wobYaw = pointerS.x * WOBBLE_YAW;
    const wobPitch = pointerS.y * WOBBLE_PITCH;

    const nextPitch = clamp(basePitch + wobPitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
    const nextYaw = baseYaw + wobYaw;

    camera.rotation.set(nextPitch, nextYaw, 0, "YXZ");
    camera.updateMatrixWorld(true);

    wobYawApplied = wobYaw;
    wobPitchApplied = wobPitch;
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

    // 버튼은 모드 상관 없이 유지(특정 영역에서 FREE로 갔다가도 원점 복귀 가능하게)
    // 단, 원점에 있으면 숨김
    if (currentId === ORIGIN_ID) setBackBtnVisible(false);

    if (mode !== "NAV") {
      pointerT.set(0, 0);
      // wobble은 updateNavWobble에서 자동 제거됨
    }
  }

  /* ===== GLB load + colliders + ART + LOGO ===== */
  const loader = new GLTFLoader();
  let colliders: THREE.Object3D[] = [];

  function isColliderMesh(o: THREE.Object3D) {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return false;
    const name = (m.name ?? "").toLowerCase();
    if (name.includes("art_")) return false;
    if (name.includes("panel")) return false;
    if (name.includes("light") || name.includes("camera")) return false;
    return true;
  }

  let currentId = ORIGIN_ID;
  let navigator: ReturnType<typeof createWaypointNavigator> | null = null;

  const clickableArtMeshes: THREE.Mesh[] = [];

  // ✅ 원점 복귀가 특정 영역에서 막히는 경우를 위한 “강제 스냅” 안전장치
  let returnPending = false;
  let returnStart = 0;

  function getWaypointPose(id: number) {
    return WAYPOINTS.find((w) => w.id === id)?.pose ?? null;
  }

  function forceSnapToWaypoint(id: number) {
    const pose = getWaypointPose(id);
    if (!pose) return;

    // wobble 제거 후 스냅
    wobYawApplied = 0;
    wobPitchApplied = 0;
    pointerT.set(0, 0);
    pointerS.set(0, 0);

    camera.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
    camera.rotation.set(pose.pitch ?? 0, pose.yaw ?? 0, 0, "YXZ");
    camera.updateMatrixWorld(true);

    onArrive(id);
  }

  function finishReturnToOrigin() {
    returnPending = false;
    setBackBtnBusy(false);
    setBackBtnVisible(false);
  }

  function returnToOrigin() {
    // FREE에서 눌러도 동작하도록 NAV로 강제 전환 + 포인터락 해제
    if (controls.isLocked) controls.unlock();
    mode = "NAV";
    setNavUiVisible(true);

    // 버튼 눌렀으니 “이동 중” 상태
    setBackBtnVisible(true);
    setBackBtnBusy(true);

    // navigator가 없으면 바로 스냅
    if (!navigator) {
      forceSnapToWaypoint(ORIGIN_ID);
      finishReturnToOrigin();
      return;
    }

    // goTo 시도 + watchdog
    returnPending = true;
    returnStart = performance.now();

    try {
      navigator.goTo(ORIGIN_ID);
    } catch {
      forceSnapToWaypoint(ORIGIN_ID);
      finishReturnToOrigin();
    }
  }

  function onArrive(id: number) {
    currentId = id;
    flashOverlay(`NAV ${id}`);

    // ✅ 0번 도착 시 버튼 자동 숨김/상태 해제
    if (id === ORIGIN_ID) finishReturnToOrigin();
    else {
      // 원점이 아니면 버튼은 유지(작품 이동 후 항상 귀환 가능)
      if (backBtn.style.display !== "inline-flex") setBackBtnVisible(true);
      setBackBtnBusy(false);
    }
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

  const ART_ITEMS: ArtworkItem[] = [
    { id: 1, anchorName: "ART_1", artist: "최수원", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b1.jpg` },
    { id: 2, anchorName: "ART_2", artist: "김민성", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b2.jpg` },
    { id: 3, anchorName: "ART_3", artist: "이수진", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b3.jpg` },
    { id: 4, anchorName: "ART_4", artist: "김지윤", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b4.jpg` },
    { id: 5, anchorName: "ART_5", artist: "김채아", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b5.jpg` },
    { id: 6, anchorName: "ART_6", artist: "김혜령", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b6.jpg` },
  ];

  const LOGO: LogoAttachOptions = {
    wallName: "pCube19_lambert1_0",
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

  // 텍스처 상하 반전 보정 포함
  async function loadTexture(url: string, flipV = true) {
    const tex = await new THREE.TextureLoader().loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;

    // glTF mesh에 덮어씌울 때 보통 false가 맞음
    tex.flipY = false;

    if (flipV) {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, -1);
      tex.offset.set(0, 1);
    }

    tex.needsUpdate = true;
    return tex;
  }

  function computeWorldPos(obj: THREE.Object3D) {
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    return v;
  }

  function pickWaypointForArtwork(artWorldPos: THREE.Vector3): number {
    let bestId = WAYPOINTS[0]?.id ?? ORIGIN_ID;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const wp of WAYPOINTS) {
      const wpPos = new THREE.Vector3(...(wp.pose?.pos ?? [0, 0, 0]));
      const dist = wpPos.distanceTo(artWorldPos);

      const yaw = wp.pose?.yaw ?? 0;
      const pitch = wp.pose?.pitch ?? 0;

      const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ")).normalize();
      const toArt = artWorldPos.clone().sub(wpPos).normalize();
      const facing = forward.dot(toArt);

      const facePenalty = facing < 0.1 ? 2000 : (1 - facing) * 20;
      const score = dist + facePenalty;

      if (score < bestScore) {
        bestScore = score;
        bestId = wp.id;
      }
    }

    return bestId;
  }

  function addArtSpotlight(mesh: THREE.Mesh) {
    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);

    const normal = new THREE.Vector3(0, 0, 1);
    normal.applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));

    const lightPos = pos.clone().addScaledVector(normal, 3).add(new THREE.Vector3(0, 4, 0));

    const spot = new THREE.SpotLight(0xfff4e0, 7.0, 35, Math.PI / 4.5, 0.45, 0.8);
    spot.position.copy(lightPos);
    spot.target.position.copy(pos);
    scene.add(spot);
    scene.add(spot.target);
  }

  async function attachToMeshPlane(planeMesh: THREE.Mesh, item: ArtworkItem) {
    const tex = await loadTexture(item.imageUrl, true);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;

    planeMesh.material = mat;

    const artPos = computeWorldPos(planeMesh);
    const wpId = typeof item.wpId === "number" ? item.wpId : pickWaypointForArtwork(artPos);
    planeMesh.userData.__wpId = wpId;

    clickableArtMeshes.push(planeMesh);

    addArtSpotlight(planeMesh);
  }

  async function attachArtToPlanes(root: THREE.Object3D) {
    const missing: string[] = [];

    for (const item of ART_ITEMS) {
      const obj = findObjectByName(root, item.anchorName);
      if (!obj) {
        missing.push(item.anchorName);
        continue;
      }

      let mesh: THREE.Mesh | null = null;
      if ((obj as any).isMesh) mesh = obj as THREE.Mesh;
      else {
        obj.traverse((o) => {
          if (mesh) return;
          if ((o as any).isMesh) mesh = o as THREE.Mesh;
        });
      }

      if (!mesh) {
        missing.push(item.anchorName);
        continue;
      }

      await attachToMeshPlane(mesh, item);
    }

    if (missing.length) console.warn("[art] missing planes:", missing);
  }

  async function attachLogoToWall(root: THREE.Object3D) {
    const wall = findObjectByName(root, LOGO.wallName);
    if (!wall || !(wall as any).isMesh) {
      console.warn("[logo] wall not found or not mesh:", LOGO.wallName);
      return null;
    }
    const wallMesh = wall as THREE.Mesh;

    const tex = await loadTexture(LOGO.imageUrl, true);

    const logoGeo = new THREE.PlaneGeometry(LOGO.widthM, LOGO.heightM);
    const logoMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    logoMat.polygonOffset = true;
    logoMat.polygonOffsetFactor = -3;
    logoMat.polygonOffsetUnits = -3;

    const logo = new THREE.Mesh(logoGeo, logoMat);

    const wallPos = new THREE.Vector3();
    wallMesh.getWorldPosition(wallPos);

    const wallQuat = new THREE.Quaternion();
    wallMesh.getWorldQuaternion(wallQuat);

    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(wallQuat).normalize();
    const toCam = new THREE.Vector3().subVectors(camera.position, wallPos).normalize();
    const nn = n.dot(toCam) < 0 ? n.clone().multiplyScalar(-1) : n;

    logo.quaternion.copy(wallQuat);
    logo.position.copy(wallPos).addScaledVector(nn, LOGO.offsetM);

    scene.add(logo);
    return logo;
  }

  loader.load(
    glbUrl,
    async (gltf) => {
      scene.add(gltf.scene);

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
          moveSpeedMps: 3.6,
          turnSpeedRadps: 1.8,
          clearance: 2.8,
          lockY: true,
          bobAmount: 0.0,
          swayAmount: 0.0,
        },
        onArrive,
      });

      await attachArtToPlanes(gltf.scene);
      await attachLogoToWall(gltf.scene);

      // 시작을 0번으로
      try {
        navigator.goTo(ORIGIN_ID);
      } catch {
        forceSnapToWaypoint(ORIGIN_ID);
      }
      onArrive(ORIGIN_ID);

      console.log("[viewer] glb loaded. colliders:", colliders.length, "artClickable:", clickableArtMeshes.length);
      console.log("[hint] NAV: ←/→ or buttons, click artwork => go to its waypoint. Q: NAV<->FREE. P: log cam. H/0: origin");
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
    // NAV wobble용 포인터 정규화
    const rect = renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    pointerT.set(clamp(nx, -1, 1), clamp(ny, -1, 1));

    if (mode !== "NAV") {
      renderer.domElement.style.cursor = "";
      return;
    }

    const hit = raycastArtwork(e.clientX, e.clientY);
    renderer.domElement.style.cursor = hit ? "pointer" : "";
  }

  function onPointerDown(e: PointerEvent) {
    if (mode === "FREE") {
      // 자유 모드에서는 캔버스 클릭 시 포인터락
      if (!controls.isLocked) controls.lock();
      return;
    }

    const hit = raycastArtwork(e.clientX, e.clientY);
    if (!hit) return;

    const wpId = hit.userData?.__wpId as number | undefined;

    // 작품 클릭 => 해당 waypoint 이동 + 원점 버튼 표시
    if (typeof wpId === "number") {
      setBackBtnVisible(true);
      setBackBtnBusy(false);

      if (navigator) {
        try {
          navigator.goTo(wpId);
        } catch {
          // 그래도 안전하게는 스냅 (작품 이동이 막히면 사용성 박살나서)
          const pose = getWaypointPose(wpId);
          if (pose) {
            camera.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
            camera.rotation.set(pose.pitch ?? 0, pose.yaw ?? 0, 0, "YXZ");
            camera.updateMatrixWorld(true);
            onArrive(wpId);
          }
        }
      }
      return;
    }
  }

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  // 돌아가기 버튼: 항상 0번으로 + watchdog(막히면 강제 스냅)
  const onBackClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    returnToOrigin();
  };
  backBtn.addEventListener("click", onBackClick);

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

    // ✅ 키로도 원점 복귀 가능 (특정 영역 이슈 회피용)
    if (e.code === "KeyH" || e.code === "Digit0") {
      e.preventDefault();
      returnToOrigin();
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

    // NAV wobble (rotation-only)
    updateNavWobble(dt);

    // ✅ 원점 복귀 watchdog:
    // goTo(0)가 특정 구간에서 막히면 2.2초 후 강제 스냅
    if (returnPending) {
      const pose0 = getWaypointPose(ORIGIN_ID);
      if (pose0) {
        const p0 = new THREE.Vector3(pose0.pos[0], pose0.pos[1], pose0.pos[2]);
        const d = camera.position.distanceTo(p0);

        // 도착 판정(여유있게)
        if (d < 0.55) {
          onArrive(ORIGIN_ID);
          finishReturnToOrigin();
        } else if (now - returnStart > 2200) {
          forceSnapToWaypoint(ORIGIN_ID);
          finishReturnToOrigin();
        }
      } else {
        // pose0 자체가 없으면 그냥 종료
        returnPending = false;
        setBackBtnBusy(false);
      }
    }

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

      backBtn.removeEventListener("click", onBackClick);

      if (overlayTimer) window.clearTimeout(overlayTimer);

      overlay.remove();
      navLeft.remove();
      navRight.remove();
      backBtn.remove();

      renderer.dispose();
    },
  };
}

/* ===== tiny utils ===== */
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
