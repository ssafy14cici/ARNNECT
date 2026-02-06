// src/viewer/exhibitRoom.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";

import { type PanelArtItem } from "./panelArt";
import { EXHIBIT_POINTS } from "./exhibitPoints";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

type PosePoint = { pos: [number, number, number]; target: [number, number, number]; pass?: boolean };

type Options = {
  glbUrl: string;

  points?: PosePoint[];
  startIndex?: number;

  panelItems?: PanelArtItem[];

  exposure?: number;
  backgroundColor?: number;

  titleText?: string;
  artistId?: string | null;

  debug?: boolean;
  autoFitIfOff?: boolean;

  uiMount?: HTMLElement;

  resetRootTransform?: boolean;

  onExitToHall: () => void;

  onOpenArtwork?: (artworkId: string | number) => void;
  onOpenArtist?: (artistId: string) => void;
};

/**
 * ✅ 텍스처 방향 보정 전략
 */
type TexFix = {
  rot?: number;
  rotAdd?: number;
  flipX?: boolean;
  flipY?: boolean;
};

const DEFAULT_TEX_FIX: TexFix = { rot: Math.PI / 2 };

const PANEL_TEX_FIX: Record<string, TexFix> = {
  EX_PANEL_2: { rot: -Math.PI / 2, flipY: true },
};

function applyTexFix(tex: THREE.Texture, panelName: string, debug?: boolean) {
  const fix = { ...DEFAULT_TEX_FIX, ...(PANEL_TEX_FIX[panelName] ?? {}) };

  tex.center.set(0.5, 0.5);
  tex.rotation = (fix.rot ?? 0) + (fix.rotAdd ?? 0);

  const flipX = !!fix.flipX;
  const flipY = !!fix.flipY;

  if (flipX || flipY) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    tex.repeat.set(flipX ? -1 : 1, flipY ? -1 : 1);
    tex.offset.set(flipX ? 1 : 0, flipY ? 1 : 0);
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
  }

  tex.needsUpdate = true;

  if (debug) {
    console.log("[exhibit] tex fix", panelName, {
      rotation: tex.rotation,
      repeat: tex.repeat.toArray(),
      offset: tex.offset.toArray(),
      flipY: tex.flipY,
    });
  }
}

export async function mountExhibitRoom(
  canvas: HTMLCanvasElement,
  opts: Options
): Promise<{
  destroy: () => void;
  goTo: (i: number, dur?: number) => void;
  getIndex: () => number;
  strafeLeft: (dist?: number) => void;
  strafeRight: (dist?: number) => void;
}> {
  const debug = opts.debug ?? true;
  const autoFitIfOff = opts.autoFitIfOff ?? true;

  const uiMount = opts.uiMount ?? document.body;

  let alive = true;

  const UI_SCOPE = "exhibitRoom";
  function markUi<T extends HTMLElement>(el: T): T {
    el.dataset.museumUi = "1";
    el.dataset.museumUiScope = UI_SCOPE;
    return el;
  }
  function mountEl<T extends HTMLElement>(el: T, clickable = false): T {
    markUi(el);
    if (clickable) el.style.pointerEvents = "auto";
    uiMount.appendChild(el);
    return el;
  }

  function toast(msg: string, ms = 1200) {
    const el = mountEl(document.createElement("div"));
    el.style.cssText =
      "position:fixed;left:50%;top:18px;transform:translateX(-50%);" +
      "z-index:100000;padding:10px 14px;border-radius:999px;" +
      "background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);" +
      "color:rgba(255,255,255,0.92);font-family:ui-sans-serif,system-ui;" +
      "font-size:13px;letter-spacing:0.02em;pointer-events:none;" +
      "box-shadow:0 10px 30px rgba(0,0,0,0.35);";
    el.textContent = msg;
    setTimeout(() => el.remove(), ms);
  }

  const getSize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    return { w, h };
  };

  console.log("[exhibit] mountExhibitRoom entered", { glbUrl: opts.glbUrl, debug });

  if (debug) {
    fetch(opts.glbUrl, { cache: "no-store" })
      .then((r) => console.log("[glb check]", r.status, r.headers.get("content-type"), opts.glbUrl))
      .catch((e) => console.error("[glb check] fetch failed", e));
  }

  /* ===== Renderer ===== */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const { w: w0, h: h0 } = getSize();
  renderer.setSize(w0, h0, false);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.6;

  const bgColor = opts.backgroundColor ?? 0x0f1115;
  renderer.setClearColor(new THREE.Color(bgColor), 1);

  /* ===== Scene ===== */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgColor);
  scene.fog = null;

  const useEnv = false;
  let pmrem: THREE.PMREMGenerator | null = null;
  let envTex: THREE.Texture | null = null;

  if (useEnv) {
    pmrem = new THREE.PMREMGenerator(renderer);
    envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
  } else {
    scene.environment = null;
  }

  /* ===== Camera ===== */
  const camera = new THREE.PerspectiveCamera(55, w0 / h0, 0.05, 5000);

  /* ===== Viewpoints ===== */
  const points: PosePoint[] = (opts.points?.length ? opts.points : (EXHIBIT_POINTS as PosePoint[])) ?? [];
  let index = clampInt(opts.startIndex ?? 0, 0, Math.max(0, points.length - 1));

  const lookTarget = new THREE.Vector3();
  let activeTween: gsap.core.Tween | null = null;

  function applyPoseInstant(i: number) {
    if (!points.length) return;
    const p = points[i];
    camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    lookTarget.set(p.target[0], p.target[1], p.target[2]);
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld(true);
  }

  let lastDir: 1 | -1 = 1;

  function goTo(i: number, duration = 0.85, dir?: 1 | -1) {
    if (!points.length) return;
    i = ((i % points.length) + points.length) % points.length;
    index = i;
    if (dir !== undefined) lastDir = dir;

    const fromPos = camera.position.clone();
    const fromTarget = lookTarget.clone();
    const toPos = new THREE.Vector3(...points[i].pos);
    const toTarget = new THREE.Vector3(...points[i].target);

    if (activeTween) activeTween.kill();

    const state = { t: 0 };
    activeTween = gsap.to(state, {
      t: 1,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (!alive) return;
        camera.position.lerpVectors(fromPos, toPos, state.t);
        lookTarget.lerpVectors(fromTarget, toTarget, state.t);
        camera.lookAt(lookTarget);
        camera.updateMatrixWorld(true);
      },
      onComplete: () => {
        if (!alive) return;
        activeTween = null;
        if (points[i].pass) goTo(i + lastDir, 0.65, lastDir);
      },
    });
  }

  applyPoseInstant(index);

  /* ===== Lights ===== */
  scene.add(new THREE.AmbientLight(0xdfe8ff, 1.0));

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x2a2a2a, 1.1);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(8, 18, 10);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.9);
  fill.position.set(-10, 10, -8);
  scene.add(fill);

  /* ===== Resize ===== */
  const onResize = () => {
    const { w, h } = getSize();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);

  /* ===== UI ===== */
  const hasArtistLink = !!(opts.artistId && opts.onOpenArtist);

  // ─────────────────────────────────────────────────────────────
  // 좌측 하단: 전시 타이틀 + (선택) 아티스트 라인
  // ─────────────────────────────────────────────────────────────
  const topWrap = mountEl(document.createElement("div"));
  topWrap.style.cssText =
    "position:fixed;left:24px;bottom:24px;z-index:99999;" +
    "display:flex;flex-direction:column;align-items:flex-start;gap:6px;" +
    "text-shadow:0 6px 18px rgba(0,0,0,0.55);" +
    "pointer-events:none;";

  const titleEl = document.createElement("div");
  titleEl.style.cssText =
    "font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;" +
    "color:rgba(255,255,255,0.96);" +
    "font-size:28px;font-weight:800;letter-spacing:0.02em;" +
    "line-height:1.0;";
  titleEl.textContent = (opts.titleText ?? "EXHIBIT").trim();

  topWrap.appendChild(titleEl);

  // 아티스트 버튼(있으면 클릭 가능)
  let artistBtn: HTMLButtonElement | null = null;
  if (hasArtistLink) {
    artistBtn = document.createElement("button");
    artistBtn.type = "button";
    artistBtn.style.cssText =
      "pointer-events:auto;cursor:pointer;background:rgba(0,0,0,0.25);" +
      "border:1px solid rgba(255,255,255,0.22);" +
      "padding:6px 12px;border-radius:999px;" +
      "backdrop-filter:blur(8px);" +
      "font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;" +
      "color:rgba(255,255,255,0.90);" +
      "font-size:13px;font-weight:800;letter-spacing:0.04em;" +
      "transition:transform .12s, background .18s, border-color .18s;";

    artistBtn.textContent = "작가 프로필 바로가기";

    artistBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (opts.artistId && opts.onOpenArtist) opts.onOpenArtist(opts.artistId);
    });
    artistBtn.addEventListener("pointerdown", (e) => e.stopPropagation(), { capture: true });
    topWrap.appendChild(artistBtn);
  }

  // ─────────────────────────────────────────────────────────────
  // 좌측 상단: Back 버튼 유지
  // ─────────────────────────────────────────────────────────────
  const back = mountEl(document.createElement("button"), true);
  back.type = "button";
  back.textContent = "← 홀로 돌아가기";
  back.style.cssText =
    "position:fixed;left:24px;top:18px;z-index:99999;border-radius:999px;" +
    "padding:10px 14px;border:1px solid rgba(255,255,255,0.28);" +
    "background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);" +
    "color:rgba(255,255,255,0.92);font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;" +
    "font-size:14px;font-weight:800;cursor:pointer;" +
    "pointer-events:auto;touch-action:manipulation;";
  back.addEventListener("pointerdown", (e: PointerEvent) => e.stopPropagation(), { capture: true });

  // ─────────────────────────────────────────────────────────────
  // 중앙 하단: 좌/우 버튼 + 뷰포인트 라벨 (이쁘게)
  // ─────────────────────────────────────────────────────────────
  const navWrap = mountEl(document.createElement("div"), true);
  navWrap.style.cssText =
    "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;" +
    "display:flex;align-items:center;gap:10px;" +
    "pointer-events:auto;touch-action:manipulation;";

  function makeNavBtn(label: string) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "width:46px;height:38px;border-radius:999px;" +
      "border:1px solid rgba(255,255,255,0.22);" +
      "background:rgba(0,0,0,0.35);backdrop-filter:blur(10px);" +
      "color:rgba(255,255,255,0.92);font-size:16px;font-weight:900;" +
      "cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 10px 26px rgba(0,0,0,0.35);" +
      "transition:transform .12s, background .18s, border-color .18s;";
    b.addEventListener("pointerdown", (e) => e.stopPropagation(), { capture: true });
    b.addEventListener("mouseenter", () => (b.style.transform = "translateY(-1px)"));
    b.addEventListener("mouseleave", () => (b.style.transform = "translateY(0px)"));
    return b;
  }

  const btnPrev = makeNavBtn("◀");
  const btnNext = makeNavBtn("▶");

  const viewLabel = document.createElement("div");
  viewLabel.style.cssText =
    "min-width:160px;height:38px;border-radius:999px;" +
    "display:flex;align-items:center;justify-content:center;gap:8px;" +
    "padding:0 14px;" +
    "background:rgba(0,0,0,0.40);backdrop-filter:blur(12px);" +
    "border:1px solid rgba(255,255,255,0.22);" +
    "box-shadow:0 12px 30px rgba(0,0,0,0.40);" +
    "font-family:ui-sans-serif,system-ui, -apple-system, 'Noto Sans KR';" +
    "color:rgba(255,255,255,0.92);" +
    "letter-spacing:0.08em;";

  const vpKey = document.createElement("span");
  vpKey.style.cssText = "font-size:11px;font-weight:800;opacity:0.75;";
  vpKey.textContent = "VIEWPOINT";

  const vpNum = document.createElement("span");
  vpNum.style.cssText =
    "font-size:13px;font-weight:900;letter-spacing:0.02em;" +
    "padding:5px 10px;border-radius:999px;" +
    "background:rgba(255,255,255,0.12);" +
    "border:1px solid rgba(255,255,255,0.18);";
  vpNum.textContent = points.length ? `${index}` : "-";

  viewLabel.append(vpKey, vpNum);
  navWrap.append(btnPrev, viewLabel, btnNext);

  // ✅ 한 군데서 UI 갱신하도록 통일
  function syncViewUI(i: number) {
    vpNum.textContent = points.length ? `${i}` : "-";
  }

  // 버튼 동작
  btnPrev.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!points.length || fpsEnabled) return;
    goTo(index - 1, 0.85, -1);
    syncViewUI(index);
  });

  btnNext.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!points.length || fpsEnabled) return;
    goTo(index + 1, 0.85, 1);
    syncViewUI(index);
  });

  // ─────────────────────────────────────────────────────────────
  // 로딩 오버레이 (기존 유지)
  // ─────────────────────────────────────────────────────────────
  const loading = mountEl(document.createElement("div"), true);
  loading.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99998;" +
    "background:rgba(0,0,0,0.18);backdrop-filter:blur(6px);" +
    "font-family:ui-sans-serif,system-ui;color:rgba(255,255,255,0.92);" +
    "font-size:14px;letter-spacing:0.06em;" +
    "pointer-events:auto;";


  loading.textContent = "LOADING GALLERY…";

  /* ===== FPS ===== */
  const clock = new THREE.Clock();
  const fps = new PointerLockControls(camera, renderer.domElement);

  const eyeY = 1.6;
  let speed = 30;
  const SPEED_MIN = 5;
  const SPEED_MAX = 100;
  const SPEED_STEP = 5;
  let fpsEnabled = false;
  const move = { f: false, b: false, l: false, r: false };
  const tmpDir = new THREE.Vector3();

  const fpsLabel = mountEl(document.createElement("div"));
  fpsLabel.style.cssText =
    "position:fixed;right:18px;top:18px;z-index:99999;" +
    "padding:8px 10px;border-radius:999px;" +
    "background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);" +
    "color:rgba(255,255,255,0.85);font-family:monospace;font-size:12px;" +
    "letter-spacing:0.08em;display:none;pointer-events:none;";
  fpsLabel.textContent = `FPS: ON (WASD / ESC) | Speed: ${speed} (+/-)`;

  const setFps = (on: boolean) => {
    fpsEnabled = on;

    if (on && activeTween) {
      activeTween.kill();
      activeTween = null;
    }

    fpsLabel.style.display = on ? "block" : "none";

    if (on) fps.lock();
    else {
      fps.unlock();
      camera.position.y = eyeY;
    }
  };

  const toggleFps = () => setFps(!fpsEnabled);

  const onFpsUnlock = () => {
    fpsEnabled = false;
    fpsLabel.style.display = "none";
    camera.position.y = eyeY;
  };
  fps.addEventListener("unlock", onFpsUnlock);

  const onCanvasClick = () => {
    if (!alive) return;
    if (fpsEnabled && !fps.isLocked) fps.lock();
  };
  renderer.domElement.addEventListener("click", onCanvasClick);

  /* ===== Art click ===== */
  const clickableArtMeshes: THREE.Mesh[] = [];
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function raycastArt(clientX: number, clientY: number): THREE.Mesh | null {
    if (!clickableArtMeshes.length) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(clickableArtMeshes, false);
    return hits.length ? (hits[0].object as THREE.Mesh) : null;
  }

  /* ===== Destroy (먼저 선언: 모달에서 destroy 호출할 거라) ===== */
  const destroy = () => {
    if (!alive) return;
    alive = false;

    cancelAnimationFrame(raf);
    if (activeTween) activeTween.kill();

    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKeyDown as any);
    window.removeEventListener("keyup", onKeyUp as any);

    renderer.domElement.removeEventListener("click", onCanvasClick);
    renderer.domElement.removeEventListener("pointerdown", onCanvasPointerDown);
    renderer.domElement.removeEventListener("pointermove", onCanvasPointerMove);

    fps.removeEventListener("unlock", onFpsUnlock);
    if (fps.isLocked) fps.unlock();
    (document as any).exitPointerLock?.();

    renderer.domElement.style.cursor = "";

    uiMount.querySelector("#exhibit-art-modal")?.remove();
    uiMount.querySelectorAll(`[data-museum-ui="1"][data-museum-ui-scope="${UI_SCOPE}"]`).forEach((n) => n.remove());

    if (glbRoot) {
      const disposedTex = new Set<THREE.Texture>();
      const disposedMat = new Set<THREE.Material>();
      const disposedGeo = new Set<THREE.BufferGeometry>();

      glbRoot.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;

        const geo = m.geometry as THREE.BufferGeometry | undefined;
        if (geo && !disposedGeo.has(geo)) {
          disposedGeo.add(geo);
          geo.dispose();
        }

        const matAny = m.material as any;
        const mats: THREE.Material[] = Array.isArray(matAny) ? matAny : matAny ? [matAny] : [];
        for (const mat of mats) {
          if (!mat || disposedMat.has(mat)) continue;
          disposedMat.add(mat);
          disposeMaterialAndTextures(mat, disposedTex);
        }
      });
    }
    glbRoot = null;

    for (const t of loadedPanelTextures) {
      try {
        t.dispose();
      } catch {}
    }
    loadedPanelTextures.clear();

    envTex?.dispose?.();
    pmrem?.dispose?.();
    envTex = null;
    pmrem = null;

    renderer.dispose();
  };

  function showArtDetailModal(mesh: THREE.Mesh) {
    if (uiMount.querySelector("#exhibit-art-modal")) return;

    const title = mesh.userData.__title ?? "작품";
    const panelName = mesh.userData.__panelName ?? "";
    const imageUrl = mesh.userData.__imageUrl ?? "";
    const artworkId = mesh.userData.__artworkId as string | number | undefined;

    if (fpsEnabled) setFps(false);
    if (fps.isLocked) fps.unlock();
    (document as any).exitPointerLock?.();

    const overlay = mountEl(document.createElement("div"), true);
    overlay.id = "exhibit-art-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;" +
      "pointer-events:auto;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#fff;border-radius:14px;padding:32px 36px;text-align:center;" +
      "font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;min-width:300px;max-width:480px;" +
      "pointer-events:auto;";

    overlay.addEventListener("pointerdown", (e) => e.stopPropagation(), { capture: true });
    box.addEventListener("pointerdown", (e) => e.stopPropagation(), { capture: true });

    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.style.cssText = "width:100%;max-height:320px;object-fit:contain;border-radius:8px;margin-bottom:16px;";
      box.appendChild(img);
    }

    const titleEl = document.createElement("h2");
    titleEl.style.cssText = "margin:0 0 8px;font-size:20px;color:#222;";
    titleEl.textContent = title;
    box.appendChild(titleEl);

    const sub = document.createElement("p");
    sub.style.cssText = "margin:0 0 20px;font-size:13px;color:#888;";
    sub.textContent = panelName;
    box.appendChild(sub);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:12px;justify-content:center;";

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.textContent = "작품 상세보기";
    detailBtn.style.cssText =
      "background:#333;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;cursor:pointer;font-family:inherit;";

    // ✅ artworkId 없으면 버튼 비활성 (여기가 지금 너 상황일 가능성 매우 큼)
    if (artworkId === undefined || artworkId === null || String(artworkId).trim() === "") {
      detailBtn.disabled = true;
      detailBtn.style.opacity = "0.45";
      detailBtn.style.cursor = "not-allowed";
      detailBtn.title = "artworkId가 없어서 상세보기로 이동할 수 없습니다.";
    }

    detailBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (artworkId === undefined || artworkId === null || String(artworkId).trim() === "") {
        console.warn("[exhibit] missing artworkId:", { panelName, title, imageUrl, artworkId });
        toast("artworkId가 없어서 이동 불가 (콘솔 확인)");
        return;
      }
      if (!opts.onOpenArtwork) {
        console.warn("[exhibit] opts.onOpenArtwork is missing");
        toast("onOpenArtwork 콜백이 없음 (React 연결 필요)");
        return;
      }

      console.log("[exhibit] open artwork:", artworkId);
      overlay.remove();

      // ✅ 여기 핵심: 라우팅 전에 3D를 확실히 종료해야 라우트가 깔끔히 전환됨
      destroy();
      opts.onOpenArtwork(artworkId);
    });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.style.cssText =
      "background:transparent;color:#666;border:1px solid #ccc;border-radius:8px;padding:10px 28px;font-size:14px;cursor:pointer;font-family:inherit;";
    closeBtn.textContent = "닫기";
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
    });

    btnRow.append(detailBtn, closeBtn);
    box.appendChild(btnRow);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.appendChild(box);
  }

  const panelToViewpoint: Record<string, number> = {
    EX_PANEL_1: 1,
    EX_PANEL_2: 2,
    EX_PANEL_3: 3,
    EX_PANEL_4: 5,
    EX_PANEL_5: 6,
    EX_PANEL_6: 6,
    EX_PANEL_7: 7,
    EX_PANEL_8: 7,
    EX_PANEL_9: 8,
    EX_PANEL_10: 10,
    EX_PANEL_11: 11,
  };

  const CLOSE_THRESHOLD = 1.5;

  const onCanvasPointerDown = (e: PointerEvent) => {
    if (!alive) return;
    if (fpsEnabled) return;

    const hit = raycastArt(e.clientX, e.clientY);
    if (!hit) return;

    const panel = hit.userData.__panelName ?? "";
    const vpIdx = panelToViewpoint[panel];

    if (vpIdx !== undefined) {
      const vp = points[vpIdx];
      const vpPos = new THREE.Vector3(vp.pos[0], vp.pos[1], vp.pos[2]);
      const dist = camera.position.distanceTo(vpPos);

      if (dist < CLOSE_THRESHOLD) showArtDetailModal(hit);
      else {
        goTo(vpIdx, 0.85);
        viewLabel.textContent = `VIEWPOINT ${vpIdx}`;
      }
    }
  };
  renderer.domElement.addEventListener("pointerdown", onCanvasPointerDown);

  const onCanvasPointerMove = (e: PointerEvent) => {
    if (!alive) return;

    if (fpsEnabled) {
      renderer.domElement.style.cursor = "";
      return;
    }
    const hit = raycastArt(e.clientX, e.clientY);
    renderer.domElement.style.cursor = hit ? "pointer" : "";
  };
  renderer.domElement.addEventListener("pointermove", onCanvasPointerMove);

  /* ===== GLB load ===== */
  const loader = new GLTFLoader();
  let glbRoot: THREE.Object3D | null = null;

  const loadedPanelTextures = new Set<THREE.Texture>();
  const replacedMaterialCandidates = new Set<THREE.Material>();

  const loadOk = await new Promise<boolean>((resolve) => {
    loader.load(
      opts.glbUrl,
      async (gltf) => {
        if (!alive) return resolve(false);

        try {
          glbRoot = gltf.scene;

          if (opts.resetRootTransform && glbRoot) {
            glbRoot.position.set(0, 0, 0);
            glbRoot.rotation.set(0, 0, 0);
            glbRoot.scale.set(1, 1, 1);
            glbRoot.updateMatrixWorld(true);
          }

          scene.add(glbRoot);

          if (debug) {
            const box = new THREE.Box3().setFromObject(glbRoot);
            console.log("[exhibit] GLB loaded OK", opts.glbUrl);
            console.log("[exhibit] bbox", {
              center: box.getCenter(new THREE.Vector3()).toArray(),
              size: box.getSize(new THREE.Vector3()).toArray(),
            });
          }

          applyPoseInstant(index);

          if (autoFitIfOff && glbRoot) {
            const box = new THREE.Box3().setFromObject(glbRoot);
            const size = box.getSize(new THREE.Vector3());
            const diag = size.length();
            const dist = box.distanceToPoint(camera.position);

            if (diag > 0 && dist > diag * 2.0) {
              if (debug) console.warn("[exhibit] viewpoint off -> autoFit", { dist, diag });
              fitCameraToBox(camera, box);
              lookTarget.copy(box.getCenter(new THREE.Vector3()));
              camera.lookAt(lookTarget);
              camera.updateMatrixWorld(true);
            }
          }

          glbRoot.traverse((o: THREE.Object3D) => {
            if (!(o as any).isMesh) return;
            const n = (o.name ?? "").toLowerCase();
            if (!(n.includes("floor") || n.includes("바닥") || n.includes("ground"))) return;

            const mesh = o as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
              const m: any = mat;
              if (m?.color?.setHex) m.color.setHex(0x111111);
              if (typeof m?.roughness === "number") m.roughness = 1.0;
              if (typeof m?.metalness === "number") m.metalness = 0.0;
              if (m) m.side = THREE.DoubleSide;
              if (m) m.needsUpdate = true;
            }
          });

          if (opts.panelItems?.length) {
            const texLoader = new THREE.TextureLoader();
            texLoader.setCrossOrigin("anonymous");

            let attached = 0;
            const missing: string[] = [];

            for (const item of opts.panelItems) {
              if (!alive || !glbRoot) return resolve(false);

              let panelObj: THREE.Object3D | null = null;

              glbRoot.traverse((o: THREE.Object3D) => {
                if (!panelObj && o.name === item.panelName) panelObj = o;
              });
              if (!panelObj) {
                const target = item.panelName.toLowerCase();
                glbRoot.traverse((o: THREE.Object3D) => {
                  if (!panelObj && o.name.toLowerCase().includes(target)) panelObj = o;
                });
              }
              if (!panelObj) {
                missing.push(item.panelName);
                continue;
              }

              let mesh: THREE.Mesh | null = null;
              if ((panelObj as any).isMesh) mesh = panelObj as THREE.Mesh;
              else
                panelObj.traverse((o: THREE.Object3D) => {
                  if (!mesh && (o as any).isMesh) mesh = o as THREE.Mesh;
                });
              if (!mesh) {
                missing.push(item.panelName);
                continue;
              }

              const oldMat = mesh.material as any;
              if (Array.isArray(oldMat)) oldMat.forEach((m) => m && replacedMaterialCandidates.add(m));
              else if (oldMat) replacedMaterialCandidates.add(oldMat);

              try {
                const tex = await texLoader.loadAsync(item.imageUrl);
                if (!alive) return resolve(false);

                tex.colorSpace = THREE.SRGBColorSpace;
                tex.flipY = false;

                applyTexFix(tex, item.panelName, debug);

                loadedPanelTextures.add(tex);

                mesh.material = new THREE.MeshStandardMaterial({
                  map: tex,
                  roughness: 0.9,
                  metalness: 0.0,
                  side: THREE.DoubleSide,
                });

                // ✅ 여기 핵심: artworkId를 그대로 박아둔다
                mesh.userData.__panelName = item.panelName;
                mesh.userData.__title = item.title;
                mesh.userData.__imageUrl = item.imageUrl;
                mesh.userData.__artworkId = item.artworkId; // ✅ 타입에서 가져옴

                if (debug) {
                  console.log("[exhibit] bind userData", item.panelName, {
                    artworkId: item.artworkId,
                    title: item.title,
                    imageUrl: item.imageUrl,
                  });
                }

                clickableArtMeshes.push(mesh);
                attached++;
              } catch (e) {
                if (debug) console.warn("[exhibit] texture load failed:", item.panelName, e);
                missing.push(item.panelName);
              }
            }

            if (glbRoot && replacedMaterialCandidates.size) {
              const inUse = new Set<THREE.Material>();
              glbRoot.traverse((o) => {
                const m = o as THREE.Mesh;
                if (!m.isMesh) return;
                const mat = m.material as any;
                if (Array.isArray(mat)) mat.forEach((mm) => mm && inUse.add(mm));
                else if (mat) inUse.add(mat);
              });

              const disposedTex = new Set<THREE.Texture>();
              for (const mat of replacedMaterialCandidates) {
                if (inUse.has(mat)) continue;
                disposeMaterialAndTextures(mat, disposedTex);
              }
            }

            if (debug) console.log("[exhibit] panels attached:", attached, "missing:", missing);
          }

          loading.remove();
          resolve(true);
        } catch (err) {
          console.error("[exhibit] post-load error:", err);
          loading.textContent = "GALLERY LOAD FAILED (post-load). Check Console.";
          resolve(false);
        }
      },
      (evt) => {
        if (!alive) return;
        if (!evt.total) return;
        const pct = Math.round((evt.loaded / evt.total) * 100);
        loading.textContent = `LOADING GALLERY… ${pct}%`;
      },
      (err) => {
        console.error("[exhibit] GLB load error:", err);
        loading.textContent = "GALLERY LOAD FAILED. Check Network/Console.";
        resolve(false);
      }
    );
  });

  if (!loadOk) {
    if (debug) console.warn("[exhibit] loadOk=false");
  }

  /* ===== Render loop ===== */
  let raf = 0;

  const loop = () => {
    if (!alive) return;

    if (fpsEnabled && fps.isLocked) {
      const dt = Math.min(clock.getDelta(), 0.05);

      const dx = (move.r ? 1 : 0) - (move.l ? 1 : 0);
      const dz = (move.f ? 1 : 0) - (move.b ? 1 : 0);

      if (dx !== 0) fps.moveRight(dx * speed * dt);
      if (dz !== 0) fps.moveForward(dz * speed * dt);

      camera.position.y = eyeY;

      tmpDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
      lookTarget.copy(camera.position).add(tmpDir);
    } else {
      clock.getDelta();
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  /* ===== Keyboard nav + debug ===== */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!alive) return;

    if (e.code === "KeyF") {
      e.preventDefault();
      toggleFps();
      return;
    }

    if (fpsEnabled) {
      if (e.code === "KeyW") { e.preventDefault(); move.f = true; return; }
      if (e.code === "KeyS") { e.preventDefault(); move.b = true; return; }
      if (e.code === "KeyA") { e.preventDefault(); move.l = true; return; }
      if (e.code === "KeyD") { e.preventDefault(); move.r = true; return; }

      if (e.code === "Equal" || e.code === "NumpadAdd") {
        e.preventDefault();
        speed = Math.min(speed + SPEED_STEP, SPEED_MAX);
        fpsLabel.textContent = `FPS: ON (WASD / ESC) | Speed: ${speed} (+/-)`;
        return;
      }
      if (e.code === "Minus" || e.code === "NumpadSubtract") {
        e.preventDefault();
        speed = Math.max(speed - SPEED_STEP, SPEED_MIN);
        fpsLabel.textContent = `FPS: ON (WASD / ESC) | Speed: ${speed} (+/-)`;
        return;
      }

      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        return;
      }
    }

    if (!points.length) return;

    if (e.code === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1, 0.85, 1);
      viewLabel.textContent = `VIEWPOINT ${index}`;
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1, 0.85, -1);
      viewLabel.textContent = `VIEWPOINT ${index}`;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!alive) return;
    if (!fpsEnabled) return;
    if (e.code === "KeyW") move.f = false;
    if (e.code === "KeyS") move.b = false;
    if (e.code === "KeyA") move.l = false;
    if (e.code === "KeyD") move.r = false;
  };

  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp, { passive: false });

  // back click
  let exiting = false;
  const onBackClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (exiting) return;
    exiting = true;
    destroy();
    opts.onExitToHall();
  };
  back.addEventListener("click", onBackClick, { capture: true });

  // ✅ strafe
  const STRAFE_DIST = 1.5;

  const strafeLeft = (dist = STRAFE_DIST) => {
    if (!alive) return;
    const right = new THREE.Vector3();
    camera.getWorldDirection(tmpDir);
    right.crossVectors(tmpDir, camera.up).normalize();
    camera.position.addScaledVector(right, -dist);
    lookTarget.addScaledVector(right, -dist);
    camera.updateMatrixWorld(true);
  };

  const strafeRight = (dist = STRAFE_DIST) => {
    if (!alive) return;
    const right = new THREE.Vector3();
    camera.getWorldDirection(tmpDir);
    right.crossVectors(tmpDir, camera.up).normalize();
    camera.position.addScaledVector(right, dist);
    lookTarget.addScaledVector(right, dist);
    camera.updateMatrixWorld(true);
  };

  return { destroy, goTo, getIndex: () => index, strafeLeft, strafeRight };
}

function clampInt(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function fitCameraToBox(camera: THREE.PerspectiveCamera, box: THREE.Box3) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect || 1;

  const fitHeightDist = maxDim / (2 * Math.tan(fov / 2));
  const fitWidthDist = maxDim / (2 * Math.tan(fov / 2)) / aspect;

  const dist = Math.max(fitHeightDist, fitWidthDist) * 1.2;

  camera.position.set(center.x, center.y + maxDim * 0.15, center.z + dist);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
}

function disposeMaterialAndTextures(mat: THREE.Material, disposedTex: Set<THREE.Texture>) {
  const m: any = mat;

  const texKeys = [
    "map",
    "alphaMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "lightMap",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
    "specularMap",
  ] as const;

  for (const k of texKeys) {
    const t = m?.[k] as THREE.Texture | undefined;
    if (t && !disposedTex.has(t)) {
      disposedTex.add(t);
      try {
        t.dispose();
      } catch {}
    }
  }

  try {
    mat.dispose();
  } catch {}
}
