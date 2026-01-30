// src/viewer/intro.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
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

  // ✅ HDRI (public 폴더 기준 경로)
  hdriUrl?: string;

  // ✅ 초기값(너무 어두우면 exposure 올리고, 너무 하얗게 뜨면 envIntensity 내리기)
  exposure?: number; // default 0.75
  envIntensity?: number; // default 0.65
  lightIntensity?: number; // default 0.85
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

  // ✅ 톤매핑(노출로 밝기 조절)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // 초기값: “어둡다”가 기본이면 조금 올려서 시작
  let exposure = opts.exposure ?? 0.75;
  renderer.toneMappingExposure = exposure;

  // HDR 로딩 실패 대비 기본 배경
  renderer.setClearColor(new THREE.Color("#0f1115"), 1);

  const scene = new THREE.Scene();
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 5000);

  // ✅ 라이트(너무 낮추면 지금처럼 어두워짐)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.30);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, opts.lightIntensity ?? 0.85);
  dir.position.set(10, 18, 10);
  scene.add(dir);

  // ✅ HDRI (PMREM)
  let hdriBg: THREE.Texture | null = null; // 배경(원본 HDR)
  let hdriEnv: THREE.Texture | null = null; // 환경(PMREM)
  if (opts.hdriUrl) {
    try {
      const loaded = await loadHdriWithPmrem(renderer, opts.hdriUrl);
      hdriBg = loaded.background;
      hdriEnv = loaded.environment;
      scene.background = hdriBg;
      scene.environment = hdriEnv;
    } catch (e) {
      console.warn("[Intro] HDRI load failed:", e);
      scene.background = new THREE.Color("#0f1115");
      scene.environment = null;
    }
  } else {
    scene.background = new THREE.Color("#0f1115");
    scene.environment = null;
  }

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

  // ✅ bbox + meshCount 진단 로그
  const box = new THREE.Box3().setFromObject(gltfScene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  let meshCount = 0;
  gltfScene.traverse((o) => {
    if ((o as any).isMesh) meshCount++;
  });

  console.log("[Intro] doorName:", opts.doorName);
  console.log("[Intro] bbox size:", size, "maxDim:", maxDim, "meshCount:", meshCount);

  // ✅ GLB 스케일 큰 경우 자동 near/far
  camera.near = Math.max(0.01, maxDim / 5000);
  camera.far = Math.max(5000, maxDim * 50);
  camera.updateProjectionMatrix();

  // ✅ env intensity (재질이 하얗게/검게 뜨는 걸 여기로 잡음)
  let envIntensity = opts.envIntensity ?? 0.65;
  const applyEnvIntensity = (v: number) => {
    envIntensity = clamp(v, 0.0, 3.0);
    gltfScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as any;
      const apply = (m: any) => {
        if (m && "envMapIntensity" in m) {
          m.envMapIntensity = envIntensity;
          m.needsUpdate = true;
        }
      };
      if (Array.isArray(mat)) mat.forEach(apply);
      else apply(mat);
    });
  };
  applyEnvIntensity(envIntensity);

  // ✅ 포즈 결정(초기 시점)
  const computedPose = opts.startPose ?? computeDoorFacingPose(gltfScene, opts.doorName, maxDim);
  console.log("[Intro] pose:", computedPose);
  applyPose(camera, computedPose);

  const enterTarget = computeEnterTarget(gltfScene, opts.doorName, new THREE.Vector3(...computedPose.target));
  const enterStopDistance = computeEnterStopDistance(gltfScene, opts.doorName, maxDim);
  console.log("[Intro] enterTarget:", enterTarget, "enterStopDistance:", enterStopDistance);

  renderer.render(scene, camera);
  requestAnimationFrame(() => ui.setState("ready"));
  opts.onReady?.(computedPose);

  // 루프(약한 패럴럭스)
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
        ui.beginEnter();

        isEntering = true;

        runEnterSequence({
          camera,
          basePos,
          baseTarget,
          target: enterTarget,
          fadeEl: ui.fadeEl,
          stopDistance: enterStopDistance,
          onWhiteCovered: () => {
            const carried = ui.carryFadeToBody();
            dispose({ keepCarriedFade: true });
            opts.onEntered();
            scheduleFadeCleanup(carried, 500);
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

  const dispose = (_opt?: { keepCarriedFade?: boolean }) => {
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(holdRaf);

    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onMove);

    ui.enterBtn.removeEventListener("pointerdown", startHold);
    ui.enterBtn.removeEventListener("pointerup", endHold);
    ui.enterBtn.removeEventListener("pointercancel", endHold);
    ui.enterBtn.removeEventListener("pointerleave", endHold);

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

    // HDR 리소스 해제
    if (scene.background === hdriBg) scene.background = null;
    if (scene.environment === hdriEnv) scene.environment = null;
    hdriBg?.dispose?.();
    hdriEnv?.dispose?.();

    renderer.dispose();
    ui.root.remove();
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

/* ---------- HDRI helpers ---------- */

async function loadHdriWithPmrem(renderer: THREE.WebGLRenderer, url: string) {
  const rgbe = new RGBELoader();
  const hdr = await rgbe.loadAsync(url);
  hdr.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const env = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();

  return { background: hdr, environment: env };
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
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

function computeEnterTarget(root: THREE.Object3D, doorName: string, fallbackTarget: THREE.Vector3) {
  const door = findByName(root, doorName);
  if (!door) return fallbackTarget.clone();

  const doorBox = new THREE.Box3().setFromObject(door);
  const c = doorBox.getCenter(new THREE.Vector3());
  const s = doorBox.getSize(new THREE.Vector3());

  const AIM_DOWN = 0.24;
  const aim = c.clone();
  aim.y = c.y - Math.max(0.0, s.y) * AIM_DOWN;

  return aim;
}

function computeEnterStopDistance(root: THREE.Object3D, doorName: string, maxDim: number) {
  const door = findByName(root, doorName);
  if (!door) return Math.max(0.22, maxDim * 0.006);

  const doorBox = new THREE.Box3().setFromObject(door);
  const s = doorBox.getSize(new THREE.Vector3());

  const widthLike = Math.max(s.x, s.z, 0.0001);
  const byDoor = widthLike * 0.18;
  const byScale = maxDim * 0.004;

  return Math.max(0.18, byDoor, byScale);
}

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

  fadeEl.style.display = "block";
  fadeEl.style.opacity = "0";
  fadeEl.style.pointerEvents = "none";
  fadeEl.style.background = "#ffffff";
  fadeEl.style.position = "fixed";
  fadeEl.style.inset = "0";
  fadeEl.style.zIndex = "99999";

  const dir = target.clone().sub(basePos);
  if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1);
  dir.normalize();

  const toPos = target.clone().addScaledVector(dir, -Math.max(0.01, stopDistance));
  const toFov = Math.min(70, camera.fov + 12);

  const fadeTriggerDist = Math.max(0.22, stopDistance * 25.0);

  let fadeStarted = false;
  const startFadeNow = () => {
    if (fadeStarted) return;
    fadeStarted = true;
    gsap.to(fadeEl, { opacity: 1, duration: 0.08, ease: "power2.in" });
  };

  const tl = gsap.timeline();

  tl.to(
    basePos,
    {
      x: toPos.x,
      y: toPos.y,
      z: toPos.z,
      duration: 1.2,
      ease: "power3.inOut",
      onUpdate: () => {
        if (!fadeStarted && basePos.distanceTo(target) <= fadeTriggerDist) startFadeNow();
      },
    },
    0,
  );

  tl.to(baseTarget, { x: target.x, y: target.y, z: target.z, duration: 1.2, ease: "power2.inOut" }, 0);

  tl.to(
    camera,
    {
      fov: toFov,
      duration: 0.75,
      ease: "power2.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
    },
    0.12,
  );

  tl.call(() => {
    startFadeNow();
    gsap.to(fadeEl, {
      opacity: 1,
      duration: 0.08,
      ease: "none",
      onComplete: () => requestAnimationFrame(onWhiteCovered),
    });
  });
}

function scheduleFadeCleanup(fadeEl: HTMLElement | null, fallbackMs: number) {
  if (!fadeEl) return;

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

  const api = {
    root,
    enterBtn,
    fadeEl: fade,

    carryFadeToBody: () => {
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

            tl.fromTo(
              art,
              { opacity: 0, scale: 0.92, filter: "blur(16px)" },
              { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out" },
              0,
            );
            tl.fromTo(
              user,
              { opacity: 0, x: 120, filter: "blur(8px)" },
              { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" },
              0.3,
            );
            tl.fromTo(
              connect,
              { opacity: 0, x: -120, filter: "blur(8px)" },
              { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" },
              0.6,
            );
            tl.fromTo(
              arnnect,
              { opacity: 0, y: 50, filter: "blur(12px)" },
              { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power2.out" },
              1.0,
            );
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
      gsap.to(content, { opacity: 0, duration: 0.2, ease: "power1.out" });
      root.dataset.state = "entering";
    },
  };

  return api;
}
