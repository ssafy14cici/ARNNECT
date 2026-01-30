// src/viewer/intro.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type MountIntroOptions = {
  glbUrl: string;
  doorName: string;
  holdMs?: number;
  prefetchUrl?: string;
  startPose?: CameraPose;
  onReady?: (pose: CameraPose) => void;
  onEntered: () => void;
};

export type IntroRuntime = {
  dispose: () => void;
  setPose: (pose: CameraPose, duration?: number) => void;
};

export async function mountIntro(canvas: HTMLCanvasElement, opts: MountIntroOptions): Promise<IntroRuntime> {
  const holdMs = opts.holdMs ?? 1000;

  const ui = createIntroUI();
  ui.setState("loading");
  ui.setProgress(0, "Loading…");

  if (opts.prefetchUrl) fetch(opts.prefetchUrl, { cache: "force-cache" }).catch(() => void 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(new THREE.Color("#f5f2ee"), 1);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 5000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdedede, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(10, 18, 10);
  scene.add(dir);

  const loader = new GLTFLoader();
  const gltfScene = await new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      opts.glbUrl,
      (g) => resolve(g.scene),
      (xhr) => {
        const total = xhr.total || 0;
        const loaded = xhr.loaded || 0;
        const p = total > 0 ? loaded / total : 0;
        ui.setProgress(p, total > 0 ? `Loading… ${Math.round(p * 100)}%` : "Loading…");
      },
      (e) => reject(e),
    );
  });

  scene.add(gltfScene);
  gltfScene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(gltfScene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  let meshCount = 0;
  gltfScene.traverse((o) => {
    if ((o as any).isMesh) meshCount++;
  });

  console.log("[Intro] doorName:", opts.doorName);
  console.log("[Intro] bbox size:", size, "maxDim:", maxDim, "meshCount:", meshCount);

  // ✅ GLB 스케일이 크면 far=5000에서 잘림 → bbox 기반 자동 설정
  camera.near = Math.max(0.01, maxDim / 5000);
  camera.far = Math.max(5000, maxDim * 50);
  camera.updateProjectionMatrix();

  const computedPose = opts.startPose ?? computeDoorFacingPose(gltfScene, opts.doorName, maxDim);
  console.log("[Intro] pose:", computedPose);

  applyPose(camera, computedPose);

  // ✅ 1프레임 먼저 렌더 후 UI ready
  renderer.render(scene, camera);
  requestAnimationFrame(() => ui.setState("ready"));

  opts.onReady?.(computedPose);

  // 루프
  let alive = true;
  let raf = 0;

  let isEntering = false;

  const pointer = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const basePos = new THREE.Vector3(...computedPose.position);
  const baseTarget = new THREE.Vector3(...computedPose.target);

  const tick = () => {
    if (!alive) return;

    const wobble = isEntering ? 0 : 0.12;
    const t = baseTarget.clone().add(new THREE.Vector3(pointer.x * wobble, -pointer.y * wobble, 0));

    camera.position.copy(basePos);
    camera.lookAt(t);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // resize
  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);

  // hold-to-enter
  let holding = false;
  let holdStart = 0;
  let holdRaf = 0;
  let entered = false;

  const startHold = (e: PointerEvent) => {
    if (entered) return;
    holding = true;
    holdStart = performance.now();
    ui.setHoldProgress(0);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const step = () => {
      if (!holding || entered) return;

      const p = Math.min((performance.now() - holdStart) / holdMs, 1);
      ui.setHoldProgress(p);

      if (p >= 1) {
        entered = true;
        holding = false;

        ui.disableEnter();
        ui.beginEnter(); // ✅ 버튼/문구 숨김 등

        isEntering = true;

        // ✅ “빨려들어가기” + “화이트 페이드” 후에만 onEntered 호출
        runEnterSequence({
          camera,
          basePos,
          baseTarget,
          target: baseTarget.clone(), // computedPose.target 기준
          fadeEl: ui.fadeEl,
          stopDistance: Math.max(0.6, maxDim * 0.02),
          onWhiteCovered: () => {
            // ✅ 외관 플래시 방지: 페이드를 body로 carry한 채로 dispose
            const carried = ui.carryFadeToBody();
            dispose({ keepCarriedFade: true });

            // ✅ 내부 마운트 트리거
            opts.onEntered();

            // ✅ 내부가 준비되면 이 엘리먼트를 지우면 됨:
            // document.getElementById("intro-fade-carry")?.remove();
            // fallback: 너무 오래 남아있지 않게 자동 제거(원하면 시간 늘려도 됨)
            scheduleFadeCleanup(carried, 2500);
          },
        });

        return;
      }

      holdRaf = requestAnimationFrame(step);
    };

    holdRaf = requestAnimationFrame(step);
  };

  const endHold = () => {
    if (entered) return;
    holding = false;
    cancelAnimationFrame(holdRaf);
    ui.setHoldProgress(0);
  };

  ui.enterBtn.addEventListener("pointerdown", startHold);
  ui.enterBtn.addEventListener("pointerup", endHold);
  ui.enterBtn.addEventListener("pointercancel", endHold);
  ui.enterBtn.addEventListener("pointerleave", endHold);

  const dispose = (opt?: { keepCarriedFade?: boolean }) => {
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(holdRaf);

    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onMove);

    ui.enterBtn.removeEventListener("pointerdown", startHold);
    ui.enterBtn.removeEventListener("pointerup", endHold);
    ui.enterBtn.removeEventListener("pointercancel", endHold);
    ui.enterBtn.removeEventListener("pointerleave", endHold);

    // gsap tweens 정리
    gsap.killTweensOf(basePos);
    gsap.killTweensOf(baseTarget);
    gsap.killTweensOf(camera);
    gsap.killTweensOf(ui.fadeEl);

    gltfScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as any;
      if (Array.isArray(mat)) mat.forEach(disposeMaterial);
      else disposeMaterial(mat);
    });

    renderer.dispose();

    // ✅ carryFadeToBody()를 호출한 경우 fadeEl은 이미 body로 이동했으므로 root만 제거
    if (opt?.keepCarriedFade) {
      ui.root.remove();
    } else {
      ui.root.remove();
    }
  };

  const setPose = (pose: CameraPose, duration = 1.2) => {
    const newPos = new THREE.Vector3(...pose.position);
    const newTarget = new THREE.Vector3(...pose.target);

    gsap.to(basePos, { x: newPos.x, y: newPos.y, z: newPos.z, duration, ease: "power2.inOut" });
    gsap.to(baseTarget, { x: newTarget.x, y: newTarget.y, z: newTarget.z, duration, ease: "power2.inOut" });
    gsap.to(camera, {
      fov: pose.fov,
      duration,
      ease: "power2.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
    });
  };

  return { dispose: () => dispose(), setPose };
}

/* ---------- helpers ---------- */

function applyPose(camera: THREE.PerspectiveCamera, pose: CameraPose) {
  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(...pose.target);
}

function computeDoorFacingPose(root: THREE.Object3D, doorName: string, maxDim: number): CameraPose {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  const door = findByName(root, doorName);

  if (!door || maxDim <= 0) {
    const fov = 50;
    const halfFov = THREE.MathUtils.degToRad(fov * 0.5);
    const radius = Math.max(0.001, maxDim * 0.5);
    const dist = (radius / Math.tan(halfFov)) * 1.35;

    const pos = center.clone().add(new THREE.Vector3(0, Math.max(maxDim * 0.12, 1.6), dist));
    return { position: [pos.x, pos.y, pos.z], target: [center.x, center.y, center.z], fov };
  }

  const doorPos = new THREE.Vector3();
  door.getWorldPosition(doorPos);

  let outward = doorPos.clone().sub(center);
  if (outward.lengthSq() < 1e-8) outward = new THREE.Vector3(0, 0, 1);
  outward.normalize();

  const fov = 50;
  const halfFov = THREE.MathUtils.degToRad(fov * 0.5);
  const radius = Math.max(0.001, maxDim * 0.5);
  const dist = (radius / Math.tan(halfFov)) * 0.4;

  const lift = Math.max(maxDim * 0.12, 1.6);
  const camPos = doorPos.clone().addScaledVector(outward, dist).add(new THREE.Vector3(0, lift, 0));
  const target = doorPos.clone().add(new THREE.Vector3(0, lift * 0.35, 0));

  return { position: [camPos.x, camPos.y, camPos.z], target: [target.x, target.y, target.z], fov };
}

function findByName(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!found && o.name === name) found = o;
  });
  return found;
}

/**
 * ✅ 진짜 “빨려들어가기”:
 * - basePos/baseTarget을 tween → tick()이 그대로 따라가며 렌더
 * - 마지막에 white fade가 완전히 덮인 뒤 onWhiteCovered 실행
 */
function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  basePos: THREE.Vector3;
  baseTarget: THREE.Vector3;
  target: THREE.Vector3;
  fadeEl: HTMLElement;
  stopDistance: number;
  onWhiteCovered: () => void;
}) {
  const { camera, basePos, baseTarget, target, fadeEl, stopDistance, onWhiteCovered } = args;

  // fade overlay 안전 리셋
  fadeEl.style.display = "block";
  fadeEl.style.opacity = "0";
  fadeEl.style.pointerEvents = "none";
  fadeEl.style.background = "#ffffff";
  fadeEl.style.position = "fixed";
  fadeEl.style.inset = "0";
  fadeEl.style.zIndex = "99999";

  // 이동 종점: target 바로 앞에서 멈춤
  const dir = target.clone().sub(basePos);
  if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1);
  dir.normalize();

  const toPos = target.clone().addScaledVector(dir, -Math.max(0.01, stopDistance));

  // “빨려들어가는” 느낌: 전진 + 살짝 FOV 증가
  const toFov = Math.min(72, camera.fov + 14);

  const tl = gsap.timeline();

  tl.to(basePos, { x: toPos.x, y: toPos.y, z: toPos.z, duration: 1.05, ease: "power3.inOut" }, 0);
  tl.to(baseTarget, { x: target.x, y: target.y, z: target.z, duration: 1.05, ease: "power2.inOut" }, 0);
  tl.to(
    camera,
    {
      fov: toFov,
      duration: 0.85,
      ease: "power2.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
    },
    0,
  );

  // 화이트 페이드: 후반부에 빠르게 덮기
  tl.to(fadeEl, { opacity: 1, duration: 0.45, ease: "power2.in" }, 0.72);

  // 완전히 덮인 다음에만 내부로 전환 트리거
  tl.call(() => requestAnimationFrame(onWhiteCovered));
}

function scheduleFadeCleanup(fadeEl: HTMLElement | null, fallbackMs: number) {
  if (!fadeEl) return;

  // 내부가 “준비 완료” 시점에 직접 제거하고 싶으면 아래 이벤트를 내부에서 dispatch 하세요:
  // window.dispatchEvent(new Event("intro:clear-fade"));
  const onClear = () => {
    window.removeEventListener("intro:clear-fade", onClear);
    if (!fadeEl.isConnected) return;
    gsap.to(fadeEl, {
      opacity: 0,
      duration: 0.45,
      ease: "power2.out",
      onComplete: () => fadeEl.remove(),
    });
  };
  window.addEventListener("intro:clear-fade", onClear);

  // fallback: 너무 오래 안 남게 자동 정리
  window.setTimeout(() => {
    if (!fadeEl.isConnected) return;
    onClear();
  }, fallbackMs);
}

function disposeMaterial(mat: any) {
  if (!mat) return;
  const keys = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "envMap"];
  for (const k of keys) if (mat[k]?.dispose) mat[k].dispose();
  mat.dispose?.();
}

/* ---------- UI ---------- */

function createIntroUI() {
  const root = document.createElement("div");
  root.id = "intro-ui";
  root.dataset.state = "loading";

  const loader = document.createElement("div");
  loader.id = "loader-container";

  const track = document.createElement("div");
  track.className = "progress-track";
  const bar = document.createElement("div");
  bar.className = "progress-bar";
  track.appendChild(bar);

  const percent = document.createElement("div");
  percent.className = "percent-text";
  percent.textContent = "0%";

  loader.appendChild(track);
  loader.appendChild(percent);

  const textReveal = document.createElement("div");
  textReveal.className = "intro-text-reveal";

  const lines = ["art", "user", "connect", "arnnect"] as const;
  const lineTexts = { art: "ART", user: "USER", connect: "CONNECT", arnnect: "ARNNECT" };
  const lineEls: HTMLElement[] = [];

  for (const key of lines) {
    const el = document.createElement("div");
    el.className = `intro-line intro-line--${key}`;
    el.textContent = lineTexts[key];
    textReveal.appendChild(el);
    lineEls.push(el);
  }

  const content = document.createElement("div");
  content.className = "intro-content";

  const subtitle = document.createElement("div");
  subtitle.className = "intro-subtitle";
  subtitle.textContent = "Hold for 1 second to enter";

  const enterBtn = document.createElement("button");
  enterBtn.className = "intro-enter";
  enterBtn.type = "button";

  const ring = document.createElement("div");
  ring.className = "intro-ring";
  ring.style.setProperty("--p", "0");

  const enterText = document.createElement("div");
  enterText.className = "intro-enter__label";
  enterText.textContent = "Enter";

  enterBtn.appendChild(ring);
  enterBtn.appendChild(enterText);

  content.appendChild(subtitle);
  content.appendChild(enterBtn);

  const fade = document.createElement("div");
  fade.className = "intro-fade";
  // ✅ CSS가 삐끗해도 무조건 덮도록 안전 스타일
  fade.style.position = "fixed";
  fade.style.inset = "0";
  fade.style.background = "#ffffff";
  fade.style.opacity = "0";
  fade.style.display = "none";
  fade.style.pointerEvents = "none";
  fade.style.zIndex = "99999";

  const backdrop = document.createElement("div");
  backdrop.className = "intro-backdrop";
  backdrop.appendChild(loader);
  backdrop.appendChild(textReveal);

  root.appendChild(backdrop);
  root.appendChild(content);
  root.appendChild(fade);

  document.body.appendChild(root);

  return {
    root,
    enterBtn,
    fadeEl: fade,
    carryFadeToBody: () => {
      // ✅ 페이드를 body로 빼서 dispose(root.remove()) 해도 유지되게
      fade.id = "intro-fade-carry";
      fade.classList.add("intro-fade--carry");
      if (fade.parentElement) fade.parentElement.removeChild(fade);
      document.body.appendChild(fade);
      fade.style.display = "block";
      fade.style.opacity = "1";
      return fade;
    },
    setState: (s: "loading" | "ready" | "entering") => {
      if (s === "ready") {
        gsap.to(loader, {
          opacity: 0,
          duration: 0.6,
          onComplete: () => {
            loader.style.display = "none";

            textReveal.style.opacity = "1";
            const [art, user, connect, arnnect] = lineEls;

            const tl = gsap.timeline({
              onComplete: () => {
                gsap.to(backdrop, {
                  opacity: 0,
                  duration: 1.4,
                  delay: 0.6,
                  ease: "power2.inOut",
                  onComplete: () => {
                    backdrop.style.display = "none";
                    root.dataset.state = "enter-ready";
                  },
                });
              },
            });

            tl.fromTo(art, { opacity: 0, scale: 0.92, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out" }, 0);
            tl.fromTo(user, { opacity: 0, x: 120, filter: "blur(8px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" }, 0.3);
            tl.fromTo(connect, { opacity: 0, x: -120, filter: "blur(8px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" }, 0.6);
            tl.fromTo(arnnect, { opacity: 0, y: 50, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power2.out" }, 1.0);
          },
        });
      } else {
        root.dataset.state = s;
      }
    },
    setProgress: (p01: number, _text: string) => {
      const pct = Math.round(Math.max(0, Math.min(1, p01)) * 100);
      bar.style.width = `${pct}%`;
      percent.textContent = `${pct}%`;
    },
    setHoldProgress: (p01: number) => ring.style.setProperty("--p", String(Math.max(0, Math.min(1, p01)))),
    disableEnter: () => {
      enterBtn.disabled = true;
      enterBtn.classList.add("is-disabled");
      enterText.textContent = "Entering…";
    },
    beginEnter: () => {
      // ✅ 진입 중 UI가 시야를 가리면 바로 숨김
      gsap.to(content, { opacity: 0, duration: 0.2, ease: "power1.out" });
      root.dataset.state = "entering";
    },
  };
}
