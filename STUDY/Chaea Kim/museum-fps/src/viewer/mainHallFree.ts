// src/viewer/mainHallFree.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

import { WAYPOINTS } from "./waypoints";
import { applyGalleryLighting } from "./lighting";
import { createWaypointNavigator } from "./navigator";

type ExhibitPayload = {
  artId?: number;
  artist: string;
  artworkTitle: string;
  fromWaypointId: number; // 복귀할 waypoint
};

type Options = {
  glbUrl?: string;
  navSizePx?: number;
  onReady?: () => void;

  /** ✅ 시작 waypoint */
  startWaypointId?: number;

  /** ✅ 작품 모달의 "전시보러가기" 콜백 */
  onOpenExhibit?: (payload: ExhibitPayload) => void;
};

type Mode = "NAV" | "FREE";

type ArtworkItem = {
  id: number;
  artist: string;
  artworkTitle: string;
  imageUrl: string;
  anchorName: string; // ART_1 ~ ART_6
  nameAnchor?: string; // ART_1_NAME etc.
  wpId?: number;
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
  const START_ID = typeof opts.startWaypointId === "number" ? opts.startWaypointId : ORIGIN_ID;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* Scene / Camera */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.01, 8000);

  applyGalleryLighting(scene, renderer);

  // 시작 포즈 (일단 임시, GLB 로드 후 navigator.goTo로 재배치)
  const START = WAYPOINTS.find((w) => w.id === START_ID)?.pose ?? WAYPOINTS[0]?.pose ?? { pos: [0, 10, 50], yaw: 0, pitch: 0 };
  camera.position.set(START.pos[0], START.pos[1], START.pos[2]);
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
  overlay.style.fontFamily = "MuseumClassic, ui-sans-serif, system-ui, -apple-system, Segoe UI";
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
  backBtn.textContent = "↩ 처음으로";
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
  backBtn.style.fontFamily = "MuseumClassic, ui-sans-serif, system-ui, -apple-system, Segoe UI";
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
    backBtn.textContent = "↩ 처음으로";
    backBtn.style.opacity = v ? "0.92" : "0";
  }

  function setBackBtnBusy(v: boolean) {
    backBtn.disabled = v;
    backBtn.textContent = v ? "이동 중…" : "↩ 처음으로";
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

  /* ===== NAV wobble (cursor-follow) ===== */
  const pointerT = new THREE.Vector2(0, 0);
  const pointerS = new THREE.Vector2(0, 0);

  const WOBBLE_YAW = 0.055;
  const WOBBLE_PITCH = 0.035;
  const WOBBLE_DAMP = 0.10;

  let wobYawApplied = 0;
  let wobPitchApplied = 0;

  function updateNavWobble(dt: number) {
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

  const collisionRay = new THREE.Raycaster();
  const COLLISION_MARGIN = 1.5;

  let colliders: THREE.Object3D[] = [];

  function canMove(from: THREE.Vector3, dir: THREE.Vector3, dist: number): boolean {
    if (colliders.length === 0) return true;
    collisionRay.set(from, dir);
    collisionRay.far = dist + COLLISION_MARGIN;
    const hits = collisionRay.intersectObjects(colliders, true);
    return hits.length === 0 || hits[0].distance > dist + COLLISION_MARGIN;
  }

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
      const dir = move.clone().normalize();
      if (canMove(camera.position, dir, move.length())) {
        camera.position.add(move);
        camera.updateMatrixWorld(true);
      }
    }
  }

  function toggleMode() {
    mode = mode === "NAV" ? "FREE" : "NAV";
    setNavUiVisible(mode === "NAV");
    flashOverlay(mode === "NAV" ? `NAV ${currentId}` : "FREE");

    if (mode === "NAV" && controls.isLocked) controls.unlock();

    if (currentId === ORIGIN_ID) setBackBtnVisible(false);

    if (mode !== "NAV") {
      pointerT.set(0, 0);
    }
  }

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

  let returnPending = false;
  let returnStart = 0;

  function getWaypointPose(id: number) {
    return WAYPOINTS.find((w) => w.id === id)?.pose ?? null;
  }

  function forceSnapToWaypoint(id: number) {
    const pose = getWaypointPose(id);
    if (!pose) return;

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
    if (controls.isLocked) controls.unlock();
    mode = "NAV";
    setNavUiVisible(true);

    setBackBtnVisible(true);
    setBackBtnBusy(true);

    if (!navigator) {
      forceSnapToWaypoint(ORIGIN_ID);
      finishReturnToOrigin();
      return;
    }

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

    if (id === ORIGIN_ID) finishReturnToOrigin();
    else {
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

  // Preload all art textures immediately
  const preloadedTextures = new Map<string, THREE.Texture>();
  const artTexturePromises: Promise<void>[] = [];

  const ART_ITEMS: ArtworkItem[] = [
    { id: 1, anchorName: "ART_1", nameAnchor: "ART_1_NAME", artist: "최수원", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b1.jpg` },
    { id: 2, anchorName: "ART_2", nameAnchor: "ART_2_NAME", artist: "김민성", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b2.jpg` },
    { id: 3, anchorName: "ART_3", nameAnchor: "ART_3_NAME", artist: "이수진", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b3.jpg` },
    { id: 4, anchorName: "ART_4", nameAnchor: "ART_4_NAME", artist: "김지윤", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b4.jpg` },
    { id: 5, anchorName: "ART_5", nameAnchor: "ART_5_NAME", artist: "김채아", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b5.jpg` },
    { id: 6, anchorName: "ART_6", nameAnchor: "ART_6_NAME", artist: "김혜령", artworkTitle: "artworkTitle", imageUrl: `${import.meta.env.BASE_URL}art/b6.jpg` },
  ];

  for (const item of ART_ITEMS) {
    const p = loadTexture(item.imageUrl, true)
      .then((tex) => {
        preloadedTextures.set(item.imageUrl, tex);
      })
      .catch(() => {});
    artTexturePromises.push(p);
  }

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

  async function loadTexture(url: string, flipV = true) {
    const tex = await new THREE.TextureLoader().loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;

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

  async function applyNameToPanel(mesh: THREE.Mesh, text: string) {
    try {
      await document.fonts.load('500 36px "MuseumClassic"');
    } catch {}

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(-1, 1);
    ctx.fillStyle = "#222222";
    ctx.font = '500 36px "MuseumClassic", "Noto Sans KR", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 0);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;

    mesh.material = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  }

  async function attachToMeshPlane(planeMesh: THREE.Mesh, item: ArtworkItem) {
    const tex = preloadedTextures.get(item.imageUrl) ?? (await loadTexture(item.imageUrl, true));

    planeMesh.material = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const artPos = computeWorldPos(planeMesh);

    // ✅ 클릭용 데이터
    planeMesh.userData.__artId = item.id;
    planeMesh.userData.__artist = item.artist;
    planeMesh.userData.__artworkTitle = item.artworkTitle;

    const wpId = typeof item.wpId === "number" ? item.wpId : pickWaypointForArtwork(artPos);
    planeMesh.userData.__wpId = wpId;

    clickableArtMeshes.push(planeMesh);
    addArtSpotlight(planeMesh);
  }

  const SIDE_MAT = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#2a2a2a"),
    roughness: 1.0,
    metalness: 0.0,
  });

  function paintArtSideFaces(parentObj: THREE.Object3D, artMesh: THREE.Mesh) {
    parentObj.traverse((o: THREE.Object3D) => {
      if (o === artMesh) return;
      if (!(o as THREE.Mesh).isMesh) return;
      (o as THREE.Mesh).material = SIDE_MAT;
    });

    const geo = artMesh.geometry;
    if (geo.groups && geo.groups.length > 1) {
      const artMat = artMesh.material as THREE.Material;
      artMesh.material = [artMat, ...Array(geo.groups.length - 1).fill(SIDE_MAT)];
    }
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
      paintArtSideFaces(obj, mesh);

      if (item.nameAnchor) {
        const nameObj = findObjectByName(root, item.nameAnchor);
        if (nameObj) {
          let nameMesh: THREE.Mesh | null = null;
          if ((nameObj as any).isMesh) nameMesh = nameObj as THREE.Mesh;
          else nameObj.traverse((o: THREE.Object3D) => { if (!nameMesh && (o as THREE.Mesh).isMesh) nameMesh = o as THREE.Mesh; });
          if (nameMesh) {
            await applyNameToPanel(nameMesh, `${item.artist} — ${item.artworkTitle}`);
            console.log(`[art] name panel found: ${item.nameAnchor}`);
          }
        } else {
          console.warn(`[art] name panel not found: ${item.nameAnchor}`);
        }
      }
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

  /* ===== Guide click-point indicators ===== */
  const guidePointerEls: HTMLElement[] = [];
  let guidePointersAlive = true;

  // ✅ pulse style (destroy에서 제거)
  const pulseStyle = document.createElement("style");
  pulseStyle.textContent = `@keyframes guidePulse{0%,100%{transform:scale(1);opacity:0.55}50%{transform:scale(1.3);opacity:0.9}}`;
  document.head.appendChild(pulseStyle);

  function createGuidePointer(obj: THREE.Object3D, opts?: { mini?: boolean }) {
    const mini = opts?.mini ?? false;
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;z-index:9990;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;transition:opacity 0.3s ease;";

    const ring = document.createElement("div");
    ring.style.cssText = mini
      ? "width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.06);animation:guidePulse 1.6s ease-in-out infinite;"
      : "width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.12);animation:guidePulse 1.6s ease-in-out infinite;";

    el.appendChild(ring);

    if (!mini) {
      const label = document.createElement("div");
      label.style.cssText =
        "font-size:11px;color:rgba(255,255,255,0.85);font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;letter-spacing:0.04em;text-shadow:0 1px 4px rgba(0,0,0,0.6);white-space:nowrap;";
      label.textContent = "클릭하세요";
      el.appendChild(label);
    }
    document.body.appendChild(el);
    guidePointerEls.push(el);

    const worldPos = new THREE.Vector3();
    function updatePointer() {
      if (!guidePointersAlive || !el.isConnected) return;
      obj.getWorldPosition(worldPos);
      const projected = worldPos.clone().project(camera);
      const hw = window.innerWidth / 2;
      const hh = window.innerHeight / 2;
      const sx = projected.x * hw + hw;
      const sy = -projected.y * hh + hh;

      if (projected.z > 1) {
        el.style.opacity = "0";
      } else {
        el.style.opacity = "1";
        const half = mini ? 14 : 24;
        el.style.left = `${sx - half}px`;
        el.style.top = `${sy - half}px`;
      }
      requestAnimationFrame(updatePointer);
    }
    updatePointer();
  }

  function removeGuidePointers() {
    guidePointersAlive = false;
    for (const el of guidePointerEls) el.remove();
    guidePointerEls.length = 0;
  }

  /* ===== GLB load + colliders + ART + LOGO ===== */
  const loader = new GLTFLoader();

  const GUIDE_OBJECT_NAMES = ["reception_desk", "doent_Cat"];
  const guideClickMeshes: THREE.Mesh[] = [];

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

      await Promise.all(artTexturePromises);
      await attachArtToPlanes(gltf.scene);
      await attachLogoToWall(gltf.scene);

      // ✅ 시작 waypoint로 이동
      try {
        navigator.goTo(START_ID);
      } catch {
        forceSnapToWaypoint(START_ID);
      }
      onArrive(START_ID);

      // guide click meshes
      for (const gname of GUIDE_OBJECT_NAMES) {
        const obj = findObjectByName(gltf.scene, gname);
        if (!obj) continue;
        obj.traverse((o: THREE.Object3D) => {
          if ((o as THREE.Mesh).isMesh) guideClickMeshes.push(o as THREE.Mesh);
        });
      }

      console.log("[viewer] glb loaded. colliders:", colliders.length, "artClickable:", clickableArtMeshes.length, "guide:", guideClickMeshes.length);

      // guide pointers
      for (const gname of GUIDE_OBJECT_NAMES) {
        const gobj = findObjectByName(gltf.scene, gname);
        if (gobj) createGuidePointer(gobj);
      }
      for (const artMesh of clickableArtMeshes) {
        createGuidePointer(artMesh, { mini: true });
      }

      opts.onReady?.();
    },
    undefined,
    (err) => console.error("[viewer] GLB load failed:", err)
  );

  /* ===== Raycast click on artwork ===== */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function setNdc(clientX: number, clientY: number) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
  }

  function raycastArtwork(clientX: number, clientY: number) {
    setNdc(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(clickableArtMeshes, true);
    if (!hits.length) return null;
    return hits[0].object as THREE.Mesh;
  }

  function raycastGuide(clientX: number, clientY: number): boolean {
    if (guideClickMeshes.length === 0) return false;
    setNdc(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(guideClickMeshes, true).length > 0;
  }

  function onPointerMove(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    pointerT.set(clamp(nx, -1, 1), clamp(ny, -1, 1));

    if (mode !== "NAV") {
      renderer.domElement.style.cursor = "";
      return;
    }

    const hit = raycastArtwork(e.clientX, e.clientY);
    const guideHit = !hit && raycastGuide(e.clientX, e.clientY);
    renderer.domElement.style.cursor = (hit || guideHit) ? "pointer" : "";
  }

  function onPointerDown(e: PointerEvent) {
    if (mode === "FREE") {
      if (!controls.isLocked) controls.lock();
      return;
    }

    if (raycastGuide(e.clientX, e.clientY)) {
      showTutorialOverlay();
      return;
    }

    const hit = raycastArtwork(e.clientX, e.clientY);
    if (!hit) return;

    const wpId = hit.userData?.__wpId as number | undefined;
    const artist = hit.userData?.__artist as string | undefined;
    const artworkTitle = hit.userData?.__artworkTitle as string | undefined;
    const artId = hit.userData?.__artId as number | undefined;

    if (typeof wpId === "number") {
      const hitPos = computeWorldPos(hit);
      const distToArt = camera.position.distanceTo(hitPos);

      // ✅ 가까울 때만 모달
      if (artist && artworkTitle && distToArt < 50) {
        showArtModal({ artist, artworkTitle, artId: hit.userData?.__artId });
      }

      setBackBtnVisible(true);
      setBackBtnBusy(false);

      if (navigator) {
        try {
          navigator.goTo(wpId);
        } catch {
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

  /* ===== Tutorial overlay ===== */
  const TUTORIAL_MESSAGES = [
    "ARNNECT에 오신것을 환영합니다",
    "Q버튼을 누르면 WASD로 자유롭게 홀을 돌아볼 수 있어요!",
    "마음에 드시는 작품을 누르면 작품 상세 페이지로 이동할 수 있어요",
  ];
  const TUTORIAL_FINAL = "그럼 즐거운 ARNNECT 하세요!";

  let tutorialEl: HTMLElement | null = null;

  function showTutorialOverlay() {
    if (tutorialEl) return;
    removeGuidePointers();

    let step = 0;

    const wrap = document.createElement("div");
    wrap.id = "tutorial-overlay";
    wrap.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:99998;display:flex;justify-content:center;pointer-events:none;padding:0 24px 48px;";

    const box = document.createElement("div");
    box.style.cssText =
      "pointer-events:auto;background:rgba(0,0,0,0.72);backdrop-filter:blur(10px);border-radius:16px;padding:28px 36px;max-width:560px;width:100%;text-align:center;font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;color:rgba(255,255,255,0.95);font-size:17px;line-height:1.7;display:flex;flex-direction:column;align-items:center;gap:18px;";

    const msgEl = document.createElement("div");
    msgEl.textContent = TUTORIAL_MESSAGES[0];

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:12px;";

    const skipBtn = document.createElement("button");
    skipBtn.style.cssText =
      "background:transparent;color:rgba(255,255,255,0.55);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 22px;font-size:14px;cursor:pointer;font-family:inherit;";
    skipBtn.textContent = "건너뛰기";

    const nextBtn = document.createElement("button");
    nextBtn.style.cssText =
      "background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:8px 22px;font-size:14px;cursor:pointer;font-family:inherit;";
    nextBtn.textContent = "다음";

    btnRow.appendChild(skipBtn);
    btnRow.appendChild(nextBtn);
    box.appendChild(msgEl);
    box.appendChild(btnRow);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    tutorialEl = wrap;

    function closeTutorial() {
      msgEl.textContent = TUTORIAL_FINAL;
      btnRow.style.display = "none";
      setTimeout(() => {
        if (wrap.isConnected) {
          box.style.transition = "opacity 0.6s ease";
          box.style.opacity = "0";
          setTimeout(() => { wrap.remove(); tutorialEl = null; }, 700);
        }
      }, 1800);
    }

    nextBtn.addEventListener("click", () => {
      step++;
      if (step < TUTORIAL_MESSAGES.length) {
        msgEl.textContent = TUTORIAL_MESSAGES[step];
      } else {
        closeTutorial();
      }
    });

    skipBtn.addEventListener("click", () => {
      closeTutorial();
    });
  }

  /* ===== Art modal ===== */
  function showArtModal(payload: { artist: string; artworkTitle: string; artId?: number }) {
  if (document.getElementById("art-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "art-modal";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;";

  const box = document.createElement("div");
  box.style.cssText =
    "background:#fff;border-radius:12px;padding:40px 48px;text-align:center;font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;min-width:280px;";

  const title = document.createElement("h2");
  title.style.cssText = "margin:0 0 12px;font-size:22px;color:#222;";
  title.textContent = `${payload.artist}의 "${payload.artworkTitle}" 입니다`;

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:12px;margin-top:18px;justify-content:center;";

  const exhibitBtn = document.createElement("button");
  exhibitBtn.style.cssText =
    "background:#333;color:#fff;border:none;border-radius:8px;padding:10px 32px;font-size:15px;cursor:pointer;font-family:inherit;";
  exhibitBtn.textContent = "전시보러가기";
  exhibitBtn.addEventListener("click", () => {
    overlay.remove();
    // ✅ 여기서 main.ts로 “전시장 열어!”를 보냄
    opts.onOpenExhibit?.({
      artId: payload.artId,
      artist: payload.artist,
      artworkTitle: payload.artworkTitle,
      fromWaypointId: currentId,
    });
  });

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText =
    "background:transparent;color:#666;border:1px solid #ccc;border-radius:8px;padding:10px 32px;font-size:15px;cursor:pointer;font-family:inherit;";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", () => overlay.remove());

  btnRow.append(exhibitBtn, closeBtn);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  box.append(title, btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


  /* Loop */
  let loopAlive = true;

  function loop() {
    if (!loopAlive) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (mode === "FREE") tickFree(dt);

    updateNavWobble(dt);

    if (returnPending) {
      const pose0 = getWaypointPose(ORIGIN_ID);
      if (pose0) {
        const p0 = new THREE.Vector3(pose0.pos[0], pose0.pos[1], pose0.pos[2]);
        const d = camera.position.distanceTo(p0);

        if (d < 0.55) {
          onArrive(ORIGIN_ID);
          finishReturnToOrigin();
        } else if (now - returnStart > 2200) {
          forceSnapToWaypoint(ORIGIN_ID);
          finishReturnToOrigin();
        }
      } else {
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
      loopAlive = false;

      if (controls.isLocked) controls.unlock();

      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("keyup", onKeyUp);

      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);

      backBtn.removeEventListener("click", onBackClick);

      if (overlayTimer) window.clearTimeout(overlayTimer);

      // UI 제거
      overlay.remove();
      navLeft.remove();
      navRight.remove();
      backBtn.remove();

      // tutorial/modal 남아있으면 제거
      document.getElementById("art-modal")?.remove();
      document.getElementById("tutorial-overlay")?.remove();

      // pointer styles 제거
      guidePointersAlive = false;
      for (const el of guidePointerEls) el.remove();
      pulseStyle.remove();

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
