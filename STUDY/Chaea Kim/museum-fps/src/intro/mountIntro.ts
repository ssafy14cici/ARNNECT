import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";

import type { CameraPose, MountIntroOptions, IntroRuntime } from "./types";
import { clamp, lerp } from "./utils";
import { loadHdriWithPmrem } from "./hdri";
import { computeFocusBox, findByName } from "./focusBox";
import { computeSafeAreaRatios, refinePoseToSafeArea } from "./safeArea";
import { runEnterSequence, scheduleFadeCleanup } from "./enterSequence";
import { createIntroUI } from "./ui";

export async function mountIntro(canvas: HTMLCanvasElement, opts: MountIntroOptions): Promise<IntroRuntime> {
  const holdMs = opts.holdMs ?? 1000;

  const framingScale = opts.framingScale ?? 1.0;
  const safeAreaPadPx = opts.safeAreaPadPx ?? 16;
  const bottomSafeRatioOpt = opts.bottomSafeRatio ?? 0.02;
  const topWhitespaceRatio = opts.topWhitespaceRatio;
  const outlierFactor = opts.focusBoxOutlierFactor ?? 8;
  const distanceFactor = opts.distanceFactor ?? 0.4;

  const ui = createIntroUI();

  ui.setState("loading");
  ui.setProgress(0, opts.skipLoading ? "" : "Loading…");

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

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 0.75;

  renderer.setClearColor(new THREE.Color("#0f1115"), 1);

  const scene = new THREE.Scene();
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 5000);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, opts.lightIntensity ?? 0.85);
  dir.position.set(10, 18, 10);
  scene.add(dir);

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

  // bbox: 전체(sceneBox) + 프레이밍용(focusBox)
  const sceneBox = new THREE.Box3().setFromObject(gltfScene);
  const focusBox = computeFocusBox(gltfScene, opts.doorName, outlierFactor, opts.focusYClip);

  const sceneSize = sceneBox.getSize(new THREE.Vector3());
  const sceneMaxDim = Math.max(sceneSize.x, sceneSize.y, sceneSize.z);

  const focusSize = focusBox.getSize(new THREE.Vector3());
  const focusMaxDim = Math.max(focusSize.x, focusSize.y, focusSize.z);

  console.log("[Intro] scene bbox:", sceneSize, "sceneMaxDim:", sceneMaxDim);
  console.log("[Intro] focus bbox:", focusSize, "focusMaxDim:", focusMaxDim);

  camera.near = Math.max(0.01, sceneMaxDim / 5000);
  camera.far = Math.max(5000, sceneMaxDim * 50);
  camera.updateProjectionMatrix();

  // env intensity
  let envIntensity = opts.envIntensity ?? 0.65;
  applyEnvIntensity(gltfScene, envIntensity);

  // initial pose
  const focusCenter = focusBox.getCenter(new THREE.Vector3());

  let computedPose =
    opts.startPose ??
    computeDoorFacingPose({
      root: gltfScene,
      doorName: opts.doorName,
      center: focusCenter,
      maxDim: focusMaxDim,
      distanceFactor,
    });

  // safe-area refine
  {
    const { topSafeRatio, bottomSafeRatio } = computeSafeAreaRatios({
      ui,
      padPx: safeAreaPadPx,
      bottomSafeRatio: bottomSafeRatioOpt,
      topWhitespaceRatio,
    });

    computedPose = refinePoseToSafeArea({
      pose: computedPose,
      box: focusBox,
      camera,
      topSafeRatio,
      bottomSafeRatio,
      scale: framingScale,
    });
  }

  applyPose(camera, computedPose);

  const basePos = new THREE.Vector3(...computedPose.position);
  const baseTarget = new THREE.Vector3(...computedPose.target);

  const enterTarget = computeEnterTarget(gltfScene, opts.doorName, baseTarget.clone());
  const enterStopDistance = computeEnterStopDistance(gltfScene, opts.doorName, focusMaxDim);

  renderer.render(scene, camera);

  requestAnimationFrame(() => {
    ui.setState("ready", opts.skipLoading);

    // layout 안정 후 1회 재보정
    requestAnimationFrame(() => {
      const { topSafeRatio, bottomSafeRatio } = computeSafeAreaRatios({
        ui,
        padPx: safeAreaPadPx,
        bottomSafeRatio: bottomSafeRatioOpt,
        topWhitespaceRatio,
      });

      const refined = refinePoseToSafeArea({
        pose: { position: [basePos.x, basePos.y, basePos.z], target: [baseTarget.x, baseTarget.y, baseTarget.z], fov: camera.fov },
        box: focusBox,
        camera,
        topSafeRatio,
        bottomSafeRatio,
        scale: framingScale,
      });

      gsap.to(basePos, { x: refined.position[0], y: refined.position[1], z: refined.position[2], duration: 0.9, ease: "power2.inOut" });
      gsap.to(baseTarget, { x: refined.target[0], y: refined.target[1], z: refined.target[2], duration: 0.9, ease: "power2.inOut" });
    });
  });

  opts.onReady?.(computedPose);

  // loop
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

    tmpPos.copy(basePos).addScaledVector(tmpRight, pointerS.x * ORBIT).addScaledVector(tmpUp, pointerS.y * ORBIT);
    camera.position.copy(tmpPos);

    tmpTgt.copy(baseTarget).addScaledVector(tmpRight, pointerS.x * LOOK).addScaledVector(tmpUp, pointerS.y * LOOK);
    camera.lookAt(tmpTgt);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    const { topSafeRatio, bottomSafeRatio } = computeSafeAreaRatios({
      ui,
      padPx: safeAreaPadPx,
      bottomSafeRatio: bottomSafeRatioOpt,
      topWhitespaceRatio,
    });

    const refined = refinePoseToSafeArea({
      pose: { position: [basePos.x, basePos.y, basePos.z], target: [baseTarget.x, baseTarget.y, baseTarget.z], fov: camera.fov },
      box: focusBox,
      camera,
      topSafeRatio,
      bottomSafeRatio,
      scale: framingScale,
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

/* ---------- local helpers ---------- */

function applyPose(camera: THREE.PerspectiveCamera, pose: CameraPose) {
  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(...pose.target);
}

function computeDoorFacingPose(args: {
  root: THREE.Object3D;
  doorName: string;
  center: THREE.Vector3;
  maxDim: number;
  distanceFactor: number;
}): CameraPose {
  const { root, doorName, center, maxDim, distanceFactor } = args;

  const door = findByName(root, doorName);

  if (!door || maxDim <= 0) {
    const fov = 50;
    const halfFov = THREE.MathUtils.degToRad(fov * 0.5);
    const radius = Math.max(0.001, maxDim * 0.5);
    const dist = (radius / Math.tan(halfFov)) * 1.15;
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
  const dist = (radius / Math.tan(halfFov)) * clamp(distanceFactor, 0.15, 0.9);

  const lift = Math.max(maxDim * 0.12, 1.6);
  const camPos = doorPos.clone().addScaledVector(outward, dist).add(new THREE.Vector3(0, lift, 0));
  const target = doorPos.clone().add(new THREE.Vector3(0, lift * 0.35, 0));

  return { position: [camPos.x, camPos.y, camPos.z], target: [target.x, target.y, target.z], fov };
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

function applyEnvIntensity(root: THREE.Object3D, v: number) {
  const envIntensity = clamp(v, 0.0, 3.0);
  root.traverse((obj) => {
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
}

function disposeMaterial(mat: any) {
  if (!mat) return;
  const keys = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "envMap"];
  for (const k of keys) if (mat[k]?.dispose) mat[k].dispose();
  mat.dispose?.();
}
