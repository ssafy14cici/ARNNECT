// src/viewer/intro.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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

export type IntroRuntime = { dispose: () => void };

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

  // ✅ frustum은 GLB bbox 보고 나중에 재설정
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

  // ✅ GLB 스케일이 크면 far=5000에서 다 잘림 → far/near를 bbox로 자동 설정
  // - near 너무 크면 가까운 면이 잘리니 maxDim 기반으로 보수적으로 잡음
  camera.near = Math.max(0.01, maxDim / 5000);
  camera.far = Math.max(5000, maxDim * 50);
  camera.updateProjectionMatrix();

  // 포즈 결정
  const computedPose = opts.startPose ?? computeDoorFacingPose(gltfScene, opts.doorName, maxDim);
  console.log("[Intro] pose:", computedPose);

  applyPose(camera, computedPose);

  // ✅ 1프레임 먼저 모델 렌더 후 UI 공개
  renderer.render(scene, camera);
  requestAnimationFrame(() => ui.setState("ready"));

  opts.onReady?.(computedPose);

  // 루프(약한 패럴럭스)
  let alive = true;
  let raf = 0;

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

    const wobble = 0.12;
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

        runEnterSequence({
          camera,
          fromPos: basePos.clone(),
          fromFov: camera.fov,
          target: new THREE.Vector3(...computedPose.target),
          fadeEl: ui.fadeEl,
          // maxDim 기반으로 stopDistance 조절(스케일 큰 모델에서 관통 방지)
          stopDistance: Math.max(0.6, maxDim * 0.02),
          onDone: () => {
            dispose();
            opts.onEntered();
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

  const dispose = () => {
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(holdRaf);

    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onMove);

    ui.enterBtn.removeEventListener("pointerdown", startHold);
    ui.enterBtn.removeEventListener("pointerup", endHold);
    ui.enterBtn.removeEventListener("pointercancel", endHold);
    ui.enterBtn.removeEventListener("pointerleave", endHold);

    gltfScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as any;
      if (Array.isArray(mat)) mat.forEach(disposeMaterial);
      else disposeMaterial(mat);
    });

    renderer.dispose();
    ui.root.remove();
  };

  return { dispose };
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

  // 문 못 찾으면 정면(Z)에서 fit
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

  // center -> door 방향으로 바깥을 잡음(회전 안 믿고 기하학으로)
  let outward = doorPos.clone().sub(center);
  if (outward.lengthSq() < 1e-8) outward = new THREE.Vector3(0, 0, 1);
  outward.normalize();

  const fov = 50;
  const halfFov = THREE.MathUtils.degToRad(fov * 0.5);
  const radius = Math.max(0.001, maxDim * 0.5);
  const dist = (radius / Math.tan(halfFov)) * 1.25;

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

function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  fromPos: THREE.Vector3;
  fromFov: number;
  target: THREE.Vector3;
  fadeEl: HTMLElement;
  stopDistance: number;
  onDone: () => void;
}) {
  const { camera, fromPos, fromFov, target, fadeEl, stopDistance, onDone } = args;

  const dir = target.clone().sub(fromPos).normalize();
  const endPos = target.clone().addScaledVector(dir, -stopDistance);

  const endFov = Math.max(22, fromFov * 0.6);
  const duration = 900;
  const t0 = performance.now();

  fadeEl.style.display = "block";
  fadeEl.style.opacity = "0";

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const step = () => {
    const t = Math.min((performance.now() - t0) / duration, 1);
    const k = ease(t);

    camera.position.copy(fromPos).lerp(endPos, k);
    camera.fov = THREE.MathUtils.lerp(fromFov, endFov, k);
    camera.updateProjectionMatrix();
    camera.lookAt(target);

    const fadeStart = 0.65;
    const fp = t <= fadeStart ? 0 : (t - fadeStart) / (1 - fadeStart);
    fadeEl.style.opacity = String(Math.min(fp, 1));

    if (t < 1) requestAnimationFrame(step);
    else {
      fadeEl.style.opacity = "1";
      requestAnimationFrame(onDone);
    }
  };

  requestAnimationFrame(step);
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

  const loading = document.createElement("div");
  loading.className = "intro-loading";

  const barWrap = document.createElement("div");
  barWrap.className = "intro-progress";

  const bar = document.createElement("div");
  bar.className = "intro-progress__bar";

  const label = document.createElement("div");
  label.className = "intro-progress__label";
  label.textContent = "Loading…";

  barWrap.appendChild(bar);
  loading.appendChild(barWrap);
  loading.appendChild(label);

  const content = document.createElement("div");
  content.className = "intro-content";

  const title = document.createElement("div");
  title.className = "intro-title";
  title.textContent = "ARNNECT MUSEUM";

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

  content.appendChild(title);
  content.appendChild(subtitle);
  content.appendChild(enterBtn);

  const fade = document.createElement("div");
  fade.className = "intro-fade";

  root.appendChild(loading);
  root.appendChild(content);
  root.appendChild(fade);

  document.body.appendChild(root);

  return {
    root,
    enterBtn,
    fadeEl: fade,
    setState: (s: "loading" | "ready") => (root.dataset.state = s),
    setProgress: (p01: number, text: string) => {
      bar.style.width = `${Math.round(Math.max(0, Math.min(1, p01)) * 100)}%`;
      label.textContent = text;
    },
    setHoldProgress: (p01: number) => ring.style.setProperty("--p", String(Math.max(0, Math.min(1, p01)))),
    disableEnter: () => {
      enterBtn.disabled = true;
      enterBtn.classList.add("is-disabled");
      enterText.textContent = "Entering…";
    },
  };
}
