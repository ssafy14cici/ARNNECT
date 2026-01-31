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

  // ✅ 내부에서 돌아올 때 로딩 애니메이션 건너뛰기
  skipLoading?: boolean;
};

export type IntroRuntime = {
  dispose: () => void;
  setPose: (pose: CameraPose, duration?: number) => void;
};

export async function mountIntro(canvas: HTMLCanvasElement, opts: MountIntroOptions): Promise<IntroRuntime> {
  const holdMs = opts.holdMs ?? 1000;

  const ui = createIntroUI();
  if (opts.skipLoading) {
    ui.setState("loading");
    ui.setProgress(0, "");
  } else {
    ui.setState("loading");
    ui.setProgress(0, "Loading…");
  }

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

  let exposure = opts.exposure ?? 0.75;
  renderer.toneMappingExposure = exposure;

  renderer.setClearColor(new THREE.Color("#0f1115"), 1);

  const scene = new THREE.Scene();
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 5000);

  // ✅ 라이트
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, opts.lightIntensity ?? 0.85);
  dir.position.set(10, 18, 10);
  scene.add(dir);

  // ✅ HDRI (PMREM)
  let hdriBg: THREE.Texture | null = null;
  let hdriEnv: THREE.Texture | null = null;
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

  // ✅ env intensity
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
  let computedPose = opts.startPose ?? computeDoorFacingPose(gltfScene, opts.doorName, maxDim);

  /**
   * ✅ 핵심: UI 상단 오버레이(히어로/메뉴)가 차지하는 영역만큼 "상단 안전영역"을 확보하고,
   * 그 안전영역 아래로 건물이 들어가도록 카메라 포즈를 자동 보정한다.
   */
  {
    const { topSafeRatio, bottomSafeRatio } = computeSafeAreaRatios(ui);
    computedPose = refinePoseToSafeArea({
      pose: computedPose,
      box,
      camera,
      topSafeRatio,
      bottomSafeRatio,
    });
  }

  console.log("[Intro] pose:", computedPose);
  applyPose(camera, computedPose);

  // base pose (tick에서 이 값들을 기준으로 살짝 패럴럭스/룩 적용)
  const basePos = new THREE.Vector3(...computedPose.position);
  const baseTarget = new THREE.Vector3(...computedPose.target);

  // enter target
  const enterTarget = computeEnterTarget(gltfScene, opts.doorName, baseTarget.clone());
  const enterStopDistance = computeEnterStopDistance(gltfScene, opts.doorName, maxDim);
  console.log("[Intro] enterTarget:", enterTarget, "enterStopDistance:", enterStopDistance);

  renderer.render(scene, camera);

  // ✅ ready 상태 진입 (내부 복귀 skipLoading 포함)
  requestAnimationFrame(() => {
    ui.setState("ready", opts.skipLoading);

    // ✅ 레이아웃이 한 프레임 안정된 뒤 다시 "상단 안전영역"을 측정해 부드럽게 보정
    requestAnimationFrame(() => {
      const { topSafeRatio, bottomSafeRatio } = computeSafeAreaRatios(ui);
      const refined = refinePoseToSafeArea({
        pose: { position: [basePos.x, basePos.y, basePos.z], target: [baseTarget.x, baseTarget.y, baseTarget.z], fov: camera.fov },
        box,
        camera,
        topSafeRatio,
        bottomSafeRatio,
      });

      // 너무 과도하게 튀는 느낌 방지(작게만 보정되도록)
      gsap.to(basePos, { x: refined.position[0], y: refined.position[1], z: refined.position[2], duration: 0.9, ease: "power2.inOut" });
      gsap.to(baseTarget, { x: refined.target[0], y: refined.target[1], z: refined.target[2], duration: 0.9, ease: "power2.inOut" });
    });
  });

  opts.onReady?.(computedPose);

  // 루프(마우스에 따른 "살짝 둘러보기")
  let alive = true;
  let raf = 0;
  let isEntering = false;

  const pointerT = { x: 0, y: 0 };
  const pointerS = { x: 0, y: 0 };

  const onMove = (e: PointerEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointerT.x = clamp(nx, -1, 1);
    pointerT.y = clamp(-ny, -1, 1);
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const tmpTgt = new THREE.Vector3();

  const tick = () => {
    if (!alive) return;

    const active = isEntering ? 0 : 1;

    const DAMP = 0.1;
    pointerS.x = lerp(pointerS.x, pointerT.x, DAMP);
    pointerS.y = lerp(pointerS.y, pointerT.y, DAMP);

    const dist = basePos.distanceTo(baseTarget);

    const ORBIT = clamp(dist * 0.035, 0.03, dist * 0.08) * active;
    const LOOK = clamp(dist * 0.02, 0.02, dist * 0.06) * active;

    tmpForward.copy(baseTarget).sub(basePos);
    if (tmpForward.lengthSq() < 1e-8) tmpForward.set(0, 0, -1);
    tmpForward.normalize();

    tmpRight.crossVectors(tmpForward, camera.up);
    if (tmpRight.lengthSq() < 1e-8) tmpRight.set(1, 0, 0);
    tmpRight.normalize();

    tmpUp.crossVectors(tmpRight, tmpForward);
    if (tmpUp.lengthSq() < 1e-8) tmpUp.set(0, 1, 0);
    tmpUp.normalize();

    tmpPos.copy(basePos)
      .addScaledVector(tmpRight, pointerS.x * ORBIT)
      .addScaledVector(tmpUp, pointerS.y * ORBIT);

    camera.position.copy(tmpPos);

    tmpTgt.copy(baseTarget)
      .addScaledVector(tmpRight, pointerS.x * LOOK)
      .addScaledVector(tmpUp, pointerS.y * LOOK);

    camera.lookAt(tmpTgt);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // resize
  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // ✅ 리사이즈 시에도 안전영역 재계산해서 프레이밍 유지 (즉시 반영)
    const { topSafeRatio, bottomSafeRatio } = computeSafeAreaRatios(ui);
    const refined = refinePoseToSafeArea({
      pose: { position: [basePos.x, basePos.y, basePos.z], target: [baseTarget.x, baseTarget.y, baseTarget.z], fov: camera.fov },
      box,
      camera,
      topSafeRatio,
      bottomSafeRatio,
    });

    basePos.set(...refined.position);
    baseTarget.set(...refined.target);
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
            scheduleFadeCleanup(carried, 15000);
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

/* ---------- Safe-area framing (핵심) ---------- */

function computeSafeAreaRatios(ui: ReturnType<typeof createIntroUI>) {
  const h = Math.max(1, window.innerHeight);

  // hero/menu가 display:none이면 rect가 0일 수 있어서 fallback 필요
  const heroRect = ui.heroOverlay.getBoundingClientRect();
  const menuRect = ui.menuBtn.getBoundingClientRect();

  const measuredTopPx = Math.max(heroRect.bottom || 0, menuRect.bottom || 0);

  // ✅ 여유 패딩(텍스트 breathing room)
  const PAD_PX = 24;

  // ✅ 측정 실패(0에 가까움) 대비 기본값
  const DEFAULT_TOP_SAFE_RATIO = 0.30;

  const topSafePx = measuredTopPx + PAD_PX;
  let topSafeRatio = topSafePx / h;
  if (topSafeRatio < 0.12) topSafeRatio = DEFAULT_TOP_SAFE_RATIO;

  topSafeRatio = clamp(topSafeRatio, 0.0, 0.48);

  // 바닥은 너무 딱 붙으면 답답해서 살짝만 남김
  const bottomSafeRatio = 0.03;

  return { topSafeRatio, bottomSafeRatio };
}

function refinePoseToSafeArea(args: {
  pose: CameraPose;
  box: THREE.Box3;
  camera: THREE.PerspectiveCamera;
  topSafeRatio: number;      // 화면 상단에서 차지하는 비율(0..1)
  bottomSafeRatio: number;   // 화면 하단 여백 비율(0..1)
}) {
  const { pose, box, camera, topSafeRatio, bottomSafeRatio } = args;

  if (!box || box.isEmpty()) return pose;

  const pos = new THREE.Vector3(...pose.position);
  const target0 = new THREE.Vector3(...pose.target);

  const desiredYMin = -1 + 2 * clamp(bottomSafeRatio, 0, 0.2);    // NDC
  const topLimit = 1 - 2 * clamp(topSafeRatio, 0, 0.48);         // NDC
  const avail = Math.max(0.25, topLimit - desiredYMin);

  const corners = getBoxCorners(box);

  const setCam = (p: THREE.Vector3, t: THREE.Vector3) => {
    camera.position.copy(p);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(t);
    camera.updateMatrixWorld(true);
  };

  const yRange = (p: THREE.Vector3, t: THREE.Vector3) => {
    setCam(p, t);
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const c of corners) {
      const v = c.clone().project(camera);
      yMin = Math.min(yMin, v.y);
      yMax = Math.max(yMax, v.y);
    }
    return { yMin, yMax, span: yMax - yMin };
  };

  // 1) 거리 보정: 상단/하단 안전영역 내에 bbox가 들어오도록 뒤로 빼기
  let target = target0.clone();
  let p = pos.clone();

  for (let i = 0; i < 6; i++) {
    const r = yRange(p, target);
    if (r.span <= avail) break;

    const factor = clamp(r.span / avail, 1.02, 1.35);
    p = target.clone().add(p.clone().sub(target).multiplyScalar(factor));
  }

  // 2) 바닥을 하단에 맞추기: target의 Y를 올려서(=카메라가 위를 보게) 전체를 아래로 내려 보이게
  //    단, 맞춘 뒤 상단이 topLimit을 넘으면 다시 거리 보정 반복
  const shiftMax = Math.max(0.5, box.getSize(new THREE.Vector3()).y) * 1.2;

  for (let pass = 0; pass < 4; pass++) {
    const base = target0.clone();
    let lo = -shiftMax;
    let hi = shiftMax;

    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) * 0.5;
      const t = base.clone().add(new THREE.Vector3(0, mid, 0));
      const r = yRange(p, t);

      // yMin이 desiredYMin보다 크면(덜 음수) => 객체가 너무 위 => 더 아래로 내려야 함 => targetY를 더 올림(mid 증가)
      if (r.yMin > desiredYMin) lo = mid;
      else hi = mid;
    }

    target = base.clone().add(new THREE.Vector3(0, hi, 0));
    const r2 = yRange(p, target);

    if (r2.yMax <= topLimit + 0.01) break;

    // 상단이 안전영역을 침범하면 카메라를 뒤로 빼서 다시 시도
    const need = clamp((r2.yMax - topLimit) / Math.max(0.1, avail), 0.08, 0.35);
    const factor = 1 + need;
    p = target.clone().add(p.clone().sub(target).multiplyScalar(factor));
  }

  return {
    position: [p.x, p.y, p.z],
    target: [target.x, target.y, target.z],
    fov: pose.fov,
  };
}

function getBoxCorners(box: THREE.Box3) {
  const min = box.min;
  const max = box.max;
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];
}

/* ---------- misc helpers ---------- */

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ---------- pose helpers ---------- */

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

  // ✅ 메뉴 햄버거 버튼
  const menuBtn = document.createElement("button");
  menuBtn.className = "intro-menu-btn";
  menuBtn.type = "button";
  menuBtn.innerHTML = `<span>MENU</span><span class="intro-menu-icon"><span></span><span></span></span>`;

  // ✅ 히어로 오버레이 (건물 위 텍스트)
  const heroOverlay = document.createElement("div");
  heroOverlay.className = "intro-hero";

  const heroLine1 = document.createElement("div");
  heroLine1.className = "intro-hero__line intro-hero__line--main";
  heroLine1.textContent = "당신의 예술가를 발견하고\n당신의 취향을 완성하세요";
  heroLine1.style.whiteSpace = "pre-line";

  const heroLine2 = document.createElement("div");
  heroLine2.className = "intro-hero__line intro-hero__line--sub";
  heroLine2.textContent = "예술가와 당신이 연결되는 곳";

  const heroLine3 = document.createElement("div");
  heroLine3.className = "intro-hero__line intro-hero__line--brand";
  heroLine3.textContent = "ARNNECT";

  heroOverlay.appendChild(heroLine1);
  heroOverlay.appendChild(heroLine2);
  heroOverlay.appendChild(heroLine3);

  const content = document.createElement("div");
  content.className = "intro-content";

  const subtitle = document.createElement("div");
  subtitle.className = "intro-subtitle";
  subtitle.textContent = "Hold to enter";

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
  root.appendChild(menuBtn);
  root.appendChild(heroOverlay);
  root.appendChild(content);
  root.appendChild(fade);

  document.body.appendChild(root);

  const api = {
    root,
    enterBtn,
    fadeEl: fade,

    // ✅ 측정용으로 노출 (safe area 계산)
    heroOverlay,
    menuBtn,

    carryFadeToBody: () => {
      fade.id = "intro-fade-carry";
      fade.classList.add("intro-fade--carry");
      if (fade.parentElement) fade.parentElement.removeChild(fade);
      document.body.appendChild(fade);
      fade.style.display = "block";
      fade.style.opacity = "1";
      return fade;
    },

    setState: (s: "loading" | "ready" | "entering", skipLoading?: boolean) => {
      if (s === "ready" && skipLoading) {
        loader.style.display = "none";
        backdrop.style.display = "none";
        root.dataset.state = "enter-ready";

        heroOverlay.style.opacity = "1";
        menuBtn.style.opacity = "1";
      } else if (s === "ready") {
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

                    gsap.fromTo(heroOverlay, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" });
                    gsap.fromTo(menuBtn, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out", delay: 0.3 });
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

    hideBackdrop: () => {
      loader.style.display = "none";
      backdrop.style.display = "none";
    },

    beginEnter: () => {
      gsap.to(content, { opacity: 0, duration: 0.2, ease: "power1.out" });
      gsap.to(heroOverlay, { opacity: 0, duration: 0.3, ease: "power1.out" });
      gsap.to(menuBtn, { opacity: 0, duration: 0.3, ease: "power1.out" });
      root.dataset.state = "entering";
    },
  };

  return api;
}
