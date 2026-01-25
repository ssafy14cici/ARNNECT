import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

import type { UiApi } from "../ui";
import type { Mode } from "./state";

import { loadMuseumExterior } from "./exterior";
import { buildInterior, type ArtSlot } from "./interior";
import { attachFramesToArtSlots, refitExistingFrameForSlot } from "./frames";
import { runEnterSequence } from "./enterSequence";
import { frameFrontView, projectWorldToScreen } from "./math";

/**
 * scene/index.ts
 * ======================================================
 * Fixes included:
 * 1) Floor dot pattern: cover plane is placed above the GLB floor TOP surface (not y=0).
 * 2) Exterior BEFORE enter: free orbit + zoom is allowed; only "punch through inside" is prevented via minDistance clamp.
 * 3) ENTER: hold 1s UI -> swoosh move + white flash -> swap while flash is ON.
 * 4) INTERIOR: click artwork/frame -> focus to front; prev/next wraps around (fluid path).
 * 5) EXIT: swap/restore while flash is ON + restore EXACT starting camera/target + restore exterior zoom clamp.
 * 6) Input safety: controls.enabled is locked during transitions to prevent user interference.
 */

export function createScene(canvas: HTMLCanvasElement, ui: UiApi) {
  /* ======================================================
   * Renderer
   * ====================================================== */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ======================================================
   * Scene / Camera / Controls
   * ====================================================== */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f6f4ef");
  scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 4000);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  // EXTERIOR: zoom allowed (user requested), but clamp prevents pushing "through" inside
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableRotate = true;
  controls.minPolarAngle = THREE.MathUtils.degToRad(25);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(80);

  /* ======================================================
   * Lights (Exterior)
   * ====================================================== */
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(10, 20, 10);
  scene.add(sun);

  /* ======================================================
   * Groups
   * ====================================================== */
  const exterior = new THREE.Group();
  const interior = new THREE.Group();
  interior.visible = false;
  scene.add(exterior, interior);

  /* ======================================================
   * State
   * ====================================================== */
  let mode: Mode = "EXTERIOR";
  let isAnimating = false;
  let glbLoaded = false;

  // Exact exterior restore state
  const exteriorStart = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: renderer.toneMappingExposure,
    minDistance: 0,
    maxDistance: 0,
  };

  /* ======================================================
   * Interior build + frames
   * ====================================================== */
  const { artworks, artSlots, setInteriorCamera } = buildInterior(interior);

  // Attach frames (async, safe)
  attachFramesToArtSlots({
    glbUrl: `${import.meta.env.BASE_URL}models/frame.glb`,
    artSlots,
    materialStyle: "gold",
  }).catch((e) => console.error("frame.glb load failed:", e));

  /* ======================================================
   * UI init
   * ====================================================== */
  ui.setHeroVisible(true);
  ui.setLoadingVisible(true);
  ui.setLoadingProgress(0);
  ui.setEnterEnabled(false, "Loading…");
  ui.setExitVisible(false);
  ui.setNavVisible(false);
  ui.flash(0);

  /* ======================================================
   * Load Exterior Museum
   * ====================================================== */
  loadMuseumExterior({
    parent: exterior,
    url: `${import.meta.env.BASE_URL}models/simu_museum.glb`,
    overrideFloorPattern: true, // remove dots/pattern
    floorColor: "#f6f4ef",
    addArnnectSign: false,
    onProgress: (p01) => ui.setLoadingProgress(p01),
    onLoaded: (museumScene) => {
      // Exterior "front" framing
      const FRONT_YAW_DEG = 90; // change only among 0/90/-90/180 if needed
      frameFrontView(camera, controls, museumScene, {
        fill: 0.86,
        yawDeg: FRONT_YAW_DEG,
        pitchDeg: 0,
        lift: 0.1,
      });

      // Exterior zoom clamp: allow zoom, but prevent punching through
      const startDist = camera.position.distanceTo(controls.target);
      controls.minDistance = startDist * 0.58;  // tune 0.55~0.70
      controls.maxDistance = startDist * 2.8;

      // Save for exact Exit restore
      exteriorStart.cam.copy(camera.position);
      exteriorStart.target.copy(controls.target);
      exteriorStart.exposure = renderer.toneMappingExposure;
      exteriorStart.minDistance = controls.minDistance;
      exteriorStart.maxDistance = controls.maxDistance;

      glbLoaded = true;
      ui.setLoadingVisible(false);
      ui.setLoadingProgress(1);
      ui.setEnterEnabled(true, "Hold for 1s");
    },
    onError: (err) => {
      console.error("museum glb load failed:", err);
      ui.setLoadingVisible(false);
      ui.setEnterEnabled(false, "Load failed");
    },
  });

  /* ======================================================
   * ENTER (hold 1s) -> Interior
   * ====================================================== */
  const enterHandler = () => {
    if (!glbLoaded) return;
    if (mode !== "EXTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";

    ui.setEnterEnabled(false, "Entering…");
    ui.setHeroVisible(false);

    controls.enabled = false;

    runEnterSequence({
      camera,
      controls,
      renderer,
      scene,
      exterior,
      interior,
      setInteriorCamera,
      ui: {
        flash: ui.flash,
        setExitVisible: ui.setExitVisible,
        setNavVisible: ui.setNavVisible,
      },
      onDone: () => {
        mode = "INTERIOR";
        isAnimating = false;

        // Interior: allow zoom + reasonable clamps
        controls.enableZoom = true;
        controls.minDistance = 6.5;
        controls.maxDistance = 20.0;

        // Restrict rotation so user doesn't spin behind walls too much
        controls.minAzimuthAngle = THREE.MathUtils.degToRad(-70);
        controls.maxAzimuthAngle = THREE.MathUtils.degToRad(70);
        controls.minPolarAngle = THREE.MathUtils.degToRad(20);
        controls.maxPolarAngle = THREE.MathUtils.degToRad(82);

        controls.enabled = true;

        ui.setNavHint("← / → : focus,  UPLOAD : apply to selected");
      },
    });
  };

  ui.onEnterHold(enterHandler);

  /* ======================================================
   * EXIT (Interior -> Exterior) : swap during flash ON
   * ====================================================== */
  ui.onExit(() => {
    if (mode !== "INTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";

    ui.setExitVisible(false);
    ui.setNavVisible(false);
    ui.closePanel();

    controls.enabled = false;

    gsap.timeline({
      onComplete: () => {
        mode = "EXTERIOR";
        isAnimating = false;
        controls.enabled = true;

        ui.setHeroVisible(true);
        ui.setEnterEnabled(true, "Hold for 1s");
      },
    })
    .to({}, { duration: 0.16, onStart: () => ui.flash(1) })
    .add(() => {
      // swap while flash is ON
      interior.visible = false;
      exterior.visible = true;

      scene.background = new THREE.Color("#f6f4ef");
      scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);
      renderer.toneMappingExposure = exteriorStart.exposure;

      camera.position.copy(exteriorStart.cam);
      controls.target.copy(exteriorStart.target);

      // Restore EXTERIOR controls: zoom allowed with clamp (no punch-through)
      controls.enableZoom = true;
      controls.minDistance = exteriorStart.minDistance;
      controls.maxDistance = exteriorStart.maxDistance;

      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      controls.minPolarAngle = THREE.MathUtils.degToRad(25);
      controls.maxPolarAngle = THREE.MathUtils.degToRad(80);
      controls.update();
    })
    .to({}, { duration: 0.42, onUpdate: () => ui.flash(0) }, "+=0.02");
  });

  /* ======================================================
   * Interior navigation (waypoints + prev/next + upload)
   * ====================================================== */
  let selectedSlotId: string = artSlots[0]?.id ?? "";

  function getSlotById(id: string) {
    return artSlots.find((s) => s.id === id);
  }

  function getSlotCenterWorld(slot: ArtSlot) {
    const c = new THREE.Vector3();
    slot.plane.getWorldPosition(c);
    return c;
  }

  function getSlotNormalWorld(slot: ArtSlot) {
    const q = new THREE.Quaternion();
    slot.group.getWorldQuaternion(q);
    return new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
  }

  function goToSlot(slot: ArtSlot) {
    if (mode !== "INTERIOR") return;
    if (isAnimating) return;

    selectedSlotId = slot.id;

    const center = getSlotCenterWorld(slot);
    const n = getSlotNormalWorld(slot);

    // View from the front
    const dist = 6.2;
    const viewPos = center.clone().add(n.multiplyScalar(dist)).add(new THREE.Vector3(0, 0.15, 0));
    const viewTarget = center.clone().add(new THREE.Vector3(0, 0.08, 0));

    isAnimating = true;
    gsap.timeline({
      onComplete: () => {
        isAnimating = false;
      },
    })
    .to(camera.position, {
      duration: 0.85,
      x: viewPos.x,
      y: viewPos.y,
      z: viewPos.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    }, 0)
    .to(controls.target, {
      duration: 0.85,
      x: viewTarget.x,
      y: viewTarget.y,
      z: viewTarget.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    }, 0);
  }

  // wrap-around prev/next (fluid path)
  function goPrev() {
    if (mode !== "INTERIOR") return;
    const idx = artSlots.findIndex((s) => s.id === selectedSlotId);
    if (idx < 0 || artSlots.length === 0) return;
    const next = artSlots[(idx - 1 + artSlots.length) % artSlots.length];
    goToSlot(next);
  }

  function goNext() {
    if (mode !== "INTERIOR") return;
    const idx = artSlots.findIndex((s) => s.id === selectedSlotId);
    if (idx < 0 || artSlots.length === 0) return;
    const next = artSlots[(idx + 1) % artSlots.length];
    goToSlot(next);
  }

  ui.onPrev(goPrev);
  ui.onNext(goNext);

  ui.onWaypointClick((id) => {
    const s = getSlotById(id);
    if (s) goToSlot(s);
  });

  // Keyboard (interior only)
  window.addEventListener("keydown", (e) => {
    if (mode !== "INTERIOR") return;
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "ArrowRight") goNext();
    if (e.key === "Escape") ui.closePanel();
  });

  // Upload applies to selected slot
  ui.onUpload(async () => {
    if (mode !== "INTERIOR") return;
    const slot = getSlotById(selectedSlotId);
    if (!slot) return;

    const file = await pickImageFile();
    if (!file) return;

    const { texture, width, height } = await loadTextureFromFile(file);

    applyArtworkToSlot(slot, texture, width, height);
    refitExistingFrameForSlot(slot); // auto refit frame
  });

  // Click artwork OR frame => select + focus
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "INTERIOR") return;

    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(artworks, true);
    if (hits.length === 0) return;

    // Slot id can be on clicked mesh or any parent (frame meshes)
    let obj: THREE.Object3D | null = hits[0].object;
    let slotId: string | undefined;

    while (obj && !slotId) {
      slotId = (obj as any).userData?.slotId as string | undefined;
      obj = obj.parent;
    }

    if (!slotId) return;

    const slot = getSlotById(slotId);
    if (!slot) return;

    selectedSlotId = slot.id;
    goToSlot(slot);

    ui.openPanel(slot.label, "Selected. Use UPLOAD to apply an image to this frame.");
  });

  /* ======================================================
   * Loop: render + interior waypoints update
   * ====================================================== */
  function updateWaypoints() {
    if (mode !== "INTERIOR") {
      ui.setWaypoints([]);
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;

    const pts = artSlots.map((s) => {
      const center = getSlotCenterWorld(s);
      center.y += 0.15;

      const p = projectWorldToScreen(center, camera, w, h);
      return {
        id: s.id,
        x: p.x,
        y: p.y,
        active: s.id === selectedSlotId,
        hidden: !p.visible,
      };
    });

    ui.setWaypoints(pts);
  }

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    updateWaypoints();
    requestAnimationFrame(tick);
  }
  tick();

  /* ======================================================
   * Resize
   * ====================================================== */
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ======================================================
 * Upload helpers
 * ====================================================== */

async function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

async function loadTextureFromFile(file: File): Promise<{ texture: THREE.Texture; width: number; height: number }> {
  const url = URL.createObjectURL(file);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });

  const tex = new THREE.Texture(img);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  return { texture: tex, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}

/**
 * Recompute plane size to "contain" the image inside slot.maxW/maxH and apply texture.
 */
function applyArtworkToSlot(slot: ArtSlot, texture: THREE.Texture, imgW: number, imgH: number) {
  const aspect = imgW / Math.max(1, imgH);

  let w = slot.maxW;
  let h = w / aspect;

  if (h > slot.maxH) {
    h = slot.maxH;
    w = h * aspect;
  }

  slot.plane.geometry.dispose();
  slot.plane.geometry = new THREE.PlaneGeometry(w, h);

  const mat = slot.plane.material as THREE.MeshStandardMaterial;
  mat.map = texture;
  mat.roughness = 0.82;
  mat.metalness = 0.02;
  mat.needsUpdate = true;
}
