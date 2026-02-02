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

  debug?: boolean;
  autoFitIfOff?: boolean;

  onExitToHall: () => void;
};

export async function mountExhibitRoom(
  canvas: HTMLCanvasElement,
  opts: Options
): Promise<{ destroy: () => void; goTo: (i: number, dur?: number) => void; getIndex: () => number }> {
  const debug = opts.debug ?? true;
  const autoFitIfOff = opts.autoFitIfOff ?? true;

  const getSize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    return { w, h };
  };

  console.log("[exhibit] mountExhibitRoom entered", { glbUrl: opts.glbUrl, debug });

  // ✅ GLB 응답 타입 강제 체크(캐시 꼬임/HTML 반환 잡기)
  fetch(opts.glbUrl, { cache: "no-store" })
    .then((r) => console.log("[glb check]", r.status, r.headers.get("content-type"), opts.glbUrl))
    .catch((e) => console.error("[glb check] fetch failed", e));

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

  // ✅ 환경광(이게 없으면 PBR 재질이 “검게 죽는” 케이스가 많음)
  // const pmrem = new THREE.PMREMGenerator(renderer);
  // const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // scene.environment = envTex;

  scene.environment = null;

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

  /** 마지막 이동 방향 (pass-through 연쇄용) */
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
        camera.position.lerpVectors(fromPos, toPos, state.t);
        lookTarget.lerpVectors(fromTarget, toTarget, state.t);
        camera.lookAt(lookTarget);
        camera.updateMatrixWorld(true);
      },
      onComplete: () => {
        activeTween = null;
        // pass-through: 멈추지 않고 같은 방향으로 계속 이동
        if (points[i].pass) {
          goTo(i + lastDir, 0.65, lastDir);
        }
      },
    });
  }

  applyPoseInstant(index);

  /* ===== Lights (조금 더 강하게) ===== */
  const ambient = new THREE.AmbientLight(0xdfe8ff, 1.0);
  scene.add(ambient);

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
  const top = document.createElement("div");
  top.style.cssText =
    "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;" +
    "font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;" +
    "color:rgba(255,255,255,0.92);font-size:16px;letter-spacing:0.02em;" +
    "text-shadow:0 6px 18px rgba(0,0,0,0.55);pointer-events:none;";
  top.textContent = opts.titleText ?? "EXHIBIT";
  document.body.appendChild(top);

  const viewLabel = document.createElement("div");
  viewLabel.style.cssText =
    "position:fixed;left:50%;top:48px;transform:translateX(-50%);z-index:99999;" +
    "font-family:monospace;color:rgba(255,255,255,0.75);font-size:12px;" +
    "letter-spacing:0.08em;text-shadow:0 4px 14px rgba(0,0,0,0.55);pointer-events:none;";
  viewLabel.textContent = points.length ? `VIEWPOINT ${index}` : `VIEWPOINT -`;
  document.body.appendChild(viewLabel);

  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "← 홀로 돌아가기";
  back.style.cssText =
    "position:fixed;left:24px;top:18px;z-index:99999;border-radius:999px;" +
    "padding:10px 14px;border:1px solid rgba(255,255,255,0.28);" +
    "background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);" +
    "color:rgba(255,255,255,0.92);font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;" +
    "font-size:14px;font-weight:800;cursor:pointer;";
  document.body.appendChild(back);

  // 로딩 오버레이
  const loading = document.createElement("div");
  loading.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99998;" +
    "background:rgba(0,0,0,0.18);backdrop-filter:blur(6px);" +
    "font-family:ui-sans-serif,system-ui;color:rgba(255,255,255,0.92);" +
    "font-size:14px;letter-spacing:0.06em;";
  loading.textContent = "LOADING GALLERY…";
  document.body.appendChild(loading);

  /* ===== FPS (PointerLockControls) ===== */
  const clock = new THREE.Clock();
  const fps = new PointerLockControls(camera, renderer.domElement);

  const eyeY = 1.6;
  const speed = 3.2; // 튜닝 가능
  let fpsEnabled = false;
  const move = { f: false, b: false, l: false, r: false };
  const tmpDir = new THREE.Vector3();

  const fpsLabel = document.createElement("div");
  fpsLabel.style.cssText =
    "position:fixed;right:18px;top:18px;z-index:99999;" +
    "padding:8px 10px;border-radius:999px;" +
    "background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);" +
    "color:rgba(255,255,255,0.85);font-family:monospace;font-size:12px;" +
    "letter-spacing:0.08em;display:none;";
  fpsLabel.textContent = "FPS: ON (WASD / ESC)";
  document.body.appendChild(fpsLabel);

  const setFps = (on: boolean) => {
    fpsEnabled = on;

    if (on && activeTween) {
      activeTween.kill();
      activeTween = null;
    }

    fpsLabel.style.display = on ? "block" : "none";

    if (on) {
      fps.lock();
    } else {
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

  function showArtDetailModal(mesh: THREE.Mesh) {
    if (document.getElementById("exhibit-art-modal")) return;

    const title = mesh.userData.__title ?? "작품";
    const panelName = mesh.userData.__panelName ?? "";
    const imageUrl = mesh.userData.__imageUrl ?? "";

    const overlay = document.createElement("div");
    overlay.id = "exhibit-art-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#fff;border-radius:14px;padding:32px 36px;text-align:center;" +
      "font-family:'MuseumClassic','Noto Sans KR',system-ui,sans-serif;min-width:300px;max-width:480px;";

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
    detailBtn.style.cssText =
      "background:#333;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;cursor:pointer;font-family:inherit;";
    detailBtn.textContent = "작품 상세보기";
    detailBtn.addEventListener("click", () => {
      // TODO: 백엔드 연결 시 상세 페이지로 이동
      console.log("[exhibit] detail clicked:", { title, panelName, imageUrl });
      overlay.remove();
    });

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "background:transparent;color:#666;border:1px solid #ccc;border-radius:8px;padding:10px 28px;font-size:14px;cursor:pointer;font-family:inherit;";
    closeBtn.textContent = "닫기";
    closeBtn.addEventListener("click", () => overlay.remove());

    btnRow.append(detailBtn, closeBtn);
    box.appendChild(btnRow);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  /** EX_PANEL_N → 대응하는 viewpoint index 매핑 (pass-through 코너 건너뜀) */
  const panelToViewpoint: Record<string, number> = {
    EX_PANEL_1: 1, EX_PANEL_2: 2, EX_PANEL_3: 3,
    EX_PANEL_4: 5, EX_PANEL_5: 6, EX_PANEL_6: 6,
    EX_PANEL_7: 7, EX_PANEL_8: 7, EX_PANEL_9: 8,
    EX_PANEL_10: 10, EX_PANEL_11: 11,
  };

  /** 카메라가 해당 viewpoint 근처에 있는지 판정하는 거리 임계값 */
  const CLOSE_THRESHOLD = 1.5;

  const onCanvasPointerDown = (e: PointerEvent) => {
    if (fpsEnabled) return;
    const hit = raycastArt(e.clientX, e.clientY);
    if (!hit) return;

    const panel = hit.userData.__panelName ?? "";
    const vpIdx = panelToViewpoint[panel];

    if (vpIdx !== undefined) {
      const vp = points[vpIdx];
      const vpPos = new THREE.Vector3(vp.pos[0], vp.pos[1], vp.pos[2]);
      const dist = camera.position.distanceTo(vpPos);

      if (dist < CLOSE_THRESHOLD) {
        // 이미 가까이 있으면 모달 표시
        showArtDetailModal(hit);
      } else {
        // 멀면 viewpoint로 이동만
        goTo(vpIdx, 0.85);
        viewLabel.textContent = `VIEWPOINT ${vpIdx}`;
      }
    }
  };
  renderer.domElement.addEventListener("pointerdown", onCanvasPointerDown);

  const onCanvasPointerMove = (e: PointerEvent) => {
    if (fpsEnabled) { renderer.domElement.style.cursor = ""; return; }
    const hit = raycastArt(e.clientX, e.clientY);
    renderer.domElement.style.cursor = hit ? "pointer" : "";
  };
  renderer.domElement.addEventListener("pointermove", onCanvasPointerMove);

  /* ===== GLB load ===== */
  const loader = new GLTFLoader();
  let glbRoot: THREE.Object3D | null = null;

  const loadOk = await new Promise<boolean>((resolve) => {
    loader.load(
      opts.glbUrl,
      async (gltf) => {
        try {
          glbRoot = gltf.scene;
          scene.add(glbRoot);

          if (debug) {
            const box = new THREE.Box3().setFromObject(glbRoot);
            console.log("[exhibit] GLB loaded OK", opts.glbUrl);
            console.log("[exhibit] bbox", {
              center: box.getCenter(new THREE.Vector3()).toArray(),
              size: box.getSize(new THREE.Vector3()).toArray(),
            });
          }

          // 패널 후보 로그(작품 붙이기용)
          const candidates: string[] = [];
          glbRoot.traverse((o) => {
            const n = o.name ?? "";
            if (!n) return;
            if (/^art_/i.test(n) || n.includes("ART") || n.toLowerCase().includes("panel")) candidates.push(n);
          });
          if (debug) console.log("[exhibit] panel candidates:", candidates);

          applyPoseInstant(index);

          // ✅ 시점이 허공이면 bbox 기준 자동 프레이밍
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

          // ✅ 바닥 무광 블랙 처리
          glbRoot.traverse((o: THREE.Object3D) => {
            const n = (o.name ?? "").toLowerCase();
            if (!(o as any).isMesh) return;
            if (n.includes("floor") || n.includes("바닥") || n.includes("ground")) {
              (o as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide,
              });
              if (debug) console.log("[exhibit] floor darkened:", o.name);
            }
          });

          if (opts.panelItems?.length) {
            const texLoader = new THREE.TextureLoader();
            let attached = 0;
            const missing: string[] = [];

            for (const item of opts.panelItems) {
              // GLB 내에서 패널 오브젝트 찾기
              let panelObj: THREE.Object3D | null = null;
              glbRoot.traverse((o: THREE.Object3D) => {
                if (!panelObj && o.name === item.panelName) panelObj = o;
              });
              if (!panelObj) {
                // loose match: 이름에 포함
                const target = item.panelName.toLowerCase();
                glbRoot.traverse((o: THREE.Object3D) => {
                  if (!panelObj && o.name.toLowerCase().includes(target)) panelObj = o;
                });
              }
              if (!panelObj) { missing.push(item.panelName); continue; }

              // 메시 찾기
              let mesh: THREE.Mesh | null = null;
              if ((panelObj as any).isMesh) mesh = panelObj as THREE.Mesh;
              else panelObj.traverse((o: THREE.Object3D) => { if (!mesh && (o as any).isMesh) mesh = o as THREE.Mesh; });
              if (!mesh) { missing.push(item.panelName); continue; }

              try {
                const tex = await texLoader.loadAsync(item.imageUrl);
                tex.colorSpace = THREE.SRGBColorSpace;
                // GLB UV를 그대로 사용 (flipY=false는 GLB 표준)
                tex.flipY = false;
                tex.center.set(0.5, 0.5);
                tex.rotation = Math.PI / 2; // 90° 회전 보정
                tex.wrapS = THREE.ClampToEdgeWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(1, -1);
                tex.offset.set(0, 1);
                tex.needsUpdate = true;

                mesh.material = new THREE.MeshStandardMaterial({
                  map: tex,
                  roughness: 0.9,
                  metalness: 0.0,
                  side: THREE.DoubleSide,
                });

                // 클릭용 데이터 저장
                mesh.userData.__panelName = item.panelName;
                mesh.userData.__title = item.title;
                mesh.userData.__imageUrl = item.imageUrl;
                clickableArtMeshes.push(mesh);

                attached++;
              } catch (e) {
                if (debug) console.warn("[exhibit] texture load failed:", item.panelName, e);
                missing.push(item.panelName);
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
    // 로드 실패면 여기서 종료해도 됨
  }

  /* ===== Render loop (바로 시작) ===== */
  let alive = true;
  let raf = 0;

  const loop = () => {
    if (!alive) return;

    // ===== FPS 이동 업데이트 =====
    if (fpsEnabled && fps.isLocked) {
      const dt = Math.min(clock.getDelta(), 0.05);

      const dx = (move.r ? 1 : 0) - (move.l ? 1 : 0);
      const dz = (move.f ? 1 : 0) - (move.b ? 1 : 0);

      if (dx !== 0) fps.moveRight(dx * speed * dt);
      if (dz !== 0) fps.moveForward(dz * speed * dt);

      // 눈높이 고정
      camera.position.y = eyeY;

      // lookTarget 업데이트 (뷰포인트 이동 돌아갈 때 꼬임 방지)
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
    // FPS 토글
    if (e.code === "KeyF") {
      e.preventDefault();
      toggleFps();
      return;
    }

    // 디버그
    if (e.code === "KeyC") {
      console.log("[exhibit] camera", { pos: camera.position.toArray(), target: lookTarget.toArray(), fov: camera.fov });
      return;
    }
    if (e.code === "KeyB" && glbRoot) {
      const box = new THREE.Box3().setFromObject(glbRoot);
      console.log("[exhibit] bbox", {
        center: box.getCenter(new THREE.Vector3()).toArray(),
        size: box.getSize(new THREE.Vector3()).toArray(),
      });
      return;
    }
    // fit은 G키로 이동
    if (e.code === "KeyG" && glbRoot) {
      const box = new THREE.Box3().setFromObject(glbRoot);
      fitCameraToBox(camera, box);
      lookTarget.copy(box.getCenter(new THREE.Vector3()));
      camera.lookAt(lookTarget);
      camera.updateMatrixWorld(true);
      console.log("[exhibit] fitCameraToBox");
      return;
    }

    // FPS 입력 (켜져있으면 WASD만)
    if (fpsEnabled) {
      if (e.code === "KeyW") {
        e.preventDefault();
        move.f = true;
        return;
      }
      if (e.code === "KeyS") {
        e.preventDefault();
        move.b = true;
        return;
      }
      if (e.code === "KeyA") {
        e.preventDefault();
        move.l = true;
        return;
      }
      if (e.code === "KeyD") {
        e.preventDefault();
        move.r = true;
        return;
      }

      // FPS 중에는 뷰포인트 이동 금지
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        return;
      }
    }

    // 뷰포인트 이동( FPS 꺼져 있을 때만 )
    if (!points.length) return;
    if (e.code === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1, 0.85, 1);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1, 0.85, -1);
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!fpsEnabled) return;
    if (e.code === "KeyW") move.f = false;
    if (e.code === "KeyS") move.b = false;
    if (e.code === "KeyA") move.l = false;
    if (e.code === "KeyD") move.r = false;
  };

  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp, { passive: false });

  /* ===== Back ===== */
  const destroy = () => {
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
    fps.unlock();
    fpsLabel.remove();

    back.remove();
    top.remove();
    viewLabel.remove();
    loading.remove();
    document.getElementById("exhibit-art-modal")?.remove();

    if (glbRoot) {
      glbRoot.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((mm) => mm?.dispose?.());
        else mat?.dispose?.();
      });
    }

    envTex?.dispose?.();
    pmrem.dispose();

    renderer.dispose();
  };

  back.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    destroy();
    opts.onExitToHall();
  });

  return { destroy, goTo, getIndex: () => index };
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
