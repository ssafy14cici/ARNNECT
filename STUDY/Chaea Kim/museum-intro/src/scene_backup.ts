import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import type { UiApi } from "./ui";

type Mode = "EXTERIOR" | "TRANSITION" | "INTERIOR";

/**
 * ======================================================
 * 합의된 UX/연출 요구사항
 * ======================================================
 * 1) 인트로: (요청에 의해 제거) 시작 시점에서 자동 이동/회전 없음
 * 2) 정문 기준: 문 중심 + 문 앞 바닥 포인트(B)
 * 3) ENTER 활성: 입구 반경 안에서만(B)
 * 4) ENTER 전환: 문 열림(실제 회전 우선) + 화이트 플래시 + 내부
 * 5) 내부 시점 제한: 적용(B)
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
  scene.fog = new THREE.Fog("#f6f4ef", 20, 160);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

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
   * Exterior floor (임시 단색)
   * - 사용자가 나중에 텍스처 이미지로 교체 가능하도록 material 분리
   * ====================================================== */
  // const extFloorMat = new THREE.MeshStandardMaterial({
  //   color: "#f6f4ef",
  //   roughness: 0.95,
  //   metalness: 0,
  // });
  // const extFloor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), extFloorMat);
  // extFloor.rotation.x = -Math.PI / 2;
  // extFloor.position.y = -0.02;
  // exterior.add(extFloor);

  /* ======================================================
   * GLB Exterior
   * ====================================================== */
  const loader = new GLTFLoader();
  const glbRoot = new THREE.Group();
  exterior.add(glbRoot);

  let mode: Mode = "EXTERIOR";
  let isAnimating = false;
  let glbLoaded = false;

  // 자동 인트로 tween (요청에 의해 "생성/사용"하지 않지만, 기존 ENTER 로직의 kill 분기를 위해 변수만 유지)
  let autoIntroTween: gsap.core.Timeline | null = null;

  // 외부 카메라 상태 저장(복귀용)
  const exteriorState = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: 1.05,
  };

  // ===== 정문 기준(사용자 픽 결과로 확정) =====
  const doorPoint = new THREE.Vector3(
    -15.596491297528615,
    4.148570807641073,
    -0.04568469109688261
  );
  const floorPoint = new THREE.Vector3(
    -16.060906911421863,
    2.0473003017564952,
    0.027251137036417555
  );

  // 내부에서 사용할 "입구 중심"(월드)
  const entranceWorld = doorPoint.clone();

  // 바깥 방향(정문 앞쪽) — 바닥 포인트의 XZ를 사용해 방향 안정화
  // door->floor (XZ만) : 정면 방향 추정
  const outwardDir = new THREE.Vector3(floorPoint.x - doorPoint.x, 0, floorPoint.z - doorPoint.z)
    .normalize()
    .multiplyScalar(1);

  // ENTER 활성화 임계값(입구 근처) — GLB 로드 후 보정
  let enterRadius = 8; // fallback

  // 문(양개문) 피벗(힌지)용
  let leftDoorPivot: THREE.Object3D | null = null;
  let rightDoorPivot: THREE.Object3D | null = null;

  // 문 열릴 때 안쪽 빛 연출용
  const innerGlow = new THREE.PointLight(0xffffff, 0);
  innerGlow.distance = 40;
  innerGlow.decay = 2;
  exterior.add(innerGlow);

  // ENTER 가능 여부 상태(매 프레임 토글 방지)
  let enterEnabled = false;

  loader.load(
    `${import.meta.env.BASE_URL}models/simu_museum.glb`,
    (gltf) => {
      glbRoot.add(gltf.scene);

      /* ----------------------------------------------
       * GLB 정렬/지면 보정
       * - 1) 중심 정렬 (x,z)
       * - 2) minY -> 0
       * ---------------------------------------------- */
      const box0 = new THREE.Box3().setFromObject(gltf.scene);
      const center0 = new THREE.Vector3();
      const size0 = new THREE.Vector3();
      box0.getCenter(center0);
      box0.getSize(size0);

      gltf.scene.position.x -= center0.x;
      gltf.scene.position.z -= center0.z;

      const box1 = new THREE.Box3().setFromObject(gltf.scene);
      gltf.scene.position.y -= box1.min.y;

      // 모델 크기 기반으로 enterRadius 튜닝
      const box2 = new THREE.Box3().setFromObject(gltf.scene);
      const size2 = new THREE.Vector3();
      box2.getSize(size2);
      const maxDim = Math.max(size2.x, size2.y, size2.z);

      enterRadius = Math.max(6, maxDim * 0.12);

      /* ----------------------------------------------
       * 문 오브젝트 탐색: canatst / canatdr 계열
       * ---------------------------------------------- */
      const doorLeftCandidates: THREE.Object3D[] = [];
      const doorRightCandidates: THREE.Object3D[] = [];

      gltf.scene.traverse((o) => {
        const n = (o.name || "").toLowerCase();
        if (n.includes("canatst")) doorLeftCandidates.push(o);
        if (n.includes("canatdr")) doorRightCandidates.push(o);
      });

      const pickBiggest = (arr: THREE.Object3D[]) => {
        let best: THREE.Object3D | null = null;
        let bestScore = -Infinity;
        for (const o of arr) {
          const b = new THREE.Box3().setFromObject(o);
          const s = new THREE.Vector3();
          b.getSize(s);
          const score = s.x * s.y + s.y * s.z + s.x * s.z;
          if (score > bestScore) {
            bestScore = score;
            best = o;
          }
        }
        return best;
      };

      const doorL = pickBiggest(doorLeftCandidates);
      const doorR = pickBiggest(doorRightCandidates);

      if (doorL && doorR) {
        leftDoorPivot = makeHingePivot({
          root: gltf.scene,
          door: doorL,
          isLeft: true,
        });
        rightDoorPivot = makeHingePivot({
          root: gltf.scene,
          door: doorR,
          isLeft: false,
        });
      } else {
        console.warn("[Door] could not find both door leaves. Fallback: no real door rotation.");
      }

      /* ----------------------------------------------
       * ✅ 시작 시점 유지(4방향 자동 선택) — 그대로
       * ---------------------------------------------- */
      const startDist = maxDim * 0.45;
      const startHeight = Math.max(2.0, maxDim * 0.12);

      const candidates = [
        new THREE.Vector3(0, startHeight, startDist),
        new THREE.Vector3(0, startHeight, -startDist),
        new THREE.Vector3(startDist, startHeight, 0),
        new THREE.Vector3(-startDist, startHeight, 0),
      ];

      let bestCamPos = candidates[0].clone().add(entranceWorld);
      let bestScore = -Infinity;

      const modelCenter = new THREE.Vector3(0, maxDim * 0.25, 0);
      for (const offset of candidates) {
        const camPos = entranceWorld.clone().add(offset);
        const toModel = modelCenter.clone().sub(camPos).normalize();
        const toEntrance = entranceWorld.clone().sub(camPos).normalize();
        const score = toModel.dot(toEntrance);
        if (score > bestScore) {
          bestScore = score;
          bestCamPos = camPos.clone();
        }
      }

      camera.position.copy(bestCamPos);
      controls.target.copy(entranceWorld);
      controls.update();

      /* ----------------------------------------------
       * 🚫 인트로 자동 이동(회전+전진) 제거
       * - 요청: "시점이동 빼고 아무것도 건드리지마"
       * - 따라서 autoIntroTween 생성/진행을 하지 않는다.
       * ---------------------------------------------- */

      glbLoaded = true;

      // 문 안쪽 빛 위치
      innerGlow.position.copy(entranceWorld.clone().add(outwardDir.clone().multiplyScalar(-2)));
      innerGlow.position.y = entranceWorld.y + 1.0;

      // ENTER는 거리 조건으로 tick에서 enable됨
    },
    undefined,
    (err) => console.error("GLB load failed:", err)
  );

  /* ======================================================
   * Interior (원래 설정 유지 + 내부 제한 적용)
   * ====================================================== */
  buildInterior(interior);

  const interiorBounds = {
    minX: -8,
    maxX: 8,
    minZ: -55,
    maxZ: 6,
  };

  function applyInteriorLimits() {
    controls.minDistance = 2.5;
    controls.maxDistance = 14;

    controls.minPolarAngle = THREE.MathUtils.degToRad(20);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(85);

    controls.target.x = THREE.MathUtils.clamp(controls.target.x, interiorBounds.minX, interiorBounds.maxX);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, interiorBounds.minZ, interiorBounds.maxZ);
  }

  /* ======================================================
   * ENTER 활성 조건 (입구 반경 안에서만)
   * ====================================================== */
  function updateEnterAvailability() {
    if (!glbLoaded || mode !== "EXTERIOR" || isAnimating) {
      if (enterEnabled) {
        enterEnabled = false;
        ui.setEnterEnabled(false);
      }
      return;
    }

    const d = camera.position.distanceTo(floorPoint);
    const shouldEnable = d <= enterRadius;

    if (shouldEnable !== enterEnabled) {
      enterEnabled = shouldEnable;
      if (enterEnabled) ui.setEnterEnabled(true, "Click to enter");
      else ui.setEnterEnabled(false, "Approach the entrance, then enter");
    }
  }

  /* ======================================================
   * ENTER (문 열림 + 내부 빛 + 화이트 플래시 + 내부 전환)
   * ====================================================== */
  ui.onEnter(() => {
    if (!glbLoaded || mode !== "EXTERIOR" || isAnimating) return;
    if (!enterEnabled) return;

    // 혹시 외부에서 다른 코드가 autoIntroTween을 만들어도 안전하게 kill
    if (autoIntroTween) {
      autoIntroTween.kill();
      autoIntroTween = null;
    }

    isAnimating = true;
    mode = "TRANSITION";

    ui.setHeroVisible(false);
    ui.setEnterEnabled(false);

    exteriorState.cam.copy(camera.position);
    exteriorState.target.copy(controls.target);
    exteriorState.exposure = renderer.toneMappingExposure;

    const OPEN_TIME = 1.05;
    const FLASH_IN = 0.22;
    const FLASH_OUT = 0.55;

    const tl = gsap.timeline({
      onComplete: () => {
        mode = "INTERIOR";
        isAnimating = false;
        ui.setExitVisible(true);
      },
    });

    tl.add(() => {
      const openAngle = THREE.MathUtils.degToRad(70);

      if (leftDoorPivot && rightDoorPivot) {
        gsap.to(leftDoorPivot.rotation, {
          y: leftDoorPivot.rotation.y + openAngle,
          duration: OPEN_TIME,
          ease: "power2.inOut",
        });
        gsap.to(rightDoorPivot.rotation, {
          y: rightDoorPivot.rotation.y - openAngle,
          duration: OPEN_TIME,
          ease: "power2.inOut",
        });
      }
    }, 0);

    tl.to(
      innerGlow,
      {
        intensity: 7.5,
        duration: OPEN_TIME * 0.9,
        ease: "power2.inOut",
      },
      0
    );

    tl.to(
      {},
      {
        duration: FLASH_IN,
        onStart: () => ui.flash(1),
      },
      OPEN_TIME * 0.85
    );

    tl.add(() => {
      exterior.visible = false;
      interior.visible = true;

      scene.background = new THREE.Color("#ffffff");
      scene.fog = new THREE.Fog("#ffffff", 10, 200);
      renderer.toneMappingExposure = 1.12;

      camera.position.set(0.8, 2.2, 9.8);
      controls.target.set(0.8, 2.0, -2.0);

      applyInteriorLimits();
      controls.update();
    });

    tl.to(
      {},
      {
        duration: FLASH_OUT,
        onUpdate: () => ui.flash(0),
      },
      `+=0.05`
    );
  });

  /* ======================================================
   * BACK (내부 -> 외부 복귀)
   * ====================================================== */
  ui.onExit(() => {
    if (mode !== "INTERIOR" || isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";
    ui.setExitVisible(false);

    const CLOSE_TIME = 0.65;

    const tl = gsap.timeline({
      onComplete: () => {
        mode = "EXTERIOR";
        isAnimating = false;
        ui.setHeroVisible(true);
        // ENTER는 tick에서 거리조건으로 자동 제어
      },
    });

    tl.to({}, { duration: 0.22, onStart: () => ui.flash(1) });

    tl.add(() => {
      interior.visible = false;
      exterior.visible = true;

      scene.background = new THREE.Color("#f6f4ef");
      scene.fog = new THREE.Fog("#f6f4ef", 20, 160);
      renderer.toneMappingExposure = exteriorState.exposure;

      camera.position.copy(exteriorState.cam);
      controls.target.copy(exteriorState.target);

      controls.minDistance = 0;
      controls.maxDistance = Infinity;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;

      controls.update();
    });

    tl.add(() => {
      if (leftDoorPivot) {
        gsap.to(leftDoorPivot.rotation, { y: 0, duration: CLOSE_TIME, ease: "power2.inOut" });
      }
      if (rightDoorPivot) {
        gsap.to(rightDoorPivot.rotation, { y: 0, duration: CLOSE_TIME, ease: "power2.inOut" });
      }
      gsap.to(innerGlow, { intensity: 0, duration: CLOSE_TIME, ease: "power2.inOut" });
    }, 0);

    tl.to({}, { duration: 0.55, onUpdate: () => ui.flash(0) });
  });

  /* ======================================================
   * Loop / Resize
   * ====================================================== */
  function tick() {
    controls.update();

    updateEnterAvailability();

    if (mode === "INTERIOR") {
      applyInteriorLimits();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ======================================================
 * 문 힌지 피벗 생성
 * ====================================================== */
function makeHingePivot(params: { root: THREE.Object3D; door: THREE.Object3D; isLeft: boolean }) {
  const { root, door, isLeft } = params;

  const bbox = new THREE.Box3().setFromObject(door);
  const hingeWorld = new THREE.Vector3();

  const hx = isLeft ? bbox.min.x : bbox.max.x;
  const hy = (bbox.min.y + bbox.max.y) * 0.5;
  const hz = (bbox.min.z + bbox.max.z) * 0.5;

  hingeWorld.set(hx, hy, hz);

  const pivot = new THREE.Object3D();
  pivot.position.copy(hingeWorld);
  root.add(pivot);

  pivot.attach(door);

  pivot.rotation.set(0, 0, 0);

  return pivot;
}

/* ======================================================
 * Interior builder (기존 유지)
 * ====================================================== */
function buildInterior(root: THREE.Group) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 90),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.18,
      metalness: 0.03,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: "#fbfbfb",
    roughness: 0.85,
  });

  const left = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 85), wallMat);
  left.position.set(-10, 5, -12);
  root.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 85), wallMat);
  right.position.set(10, 5, -12);
  root.add(right);

  const back = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 1.2), wallMat);
  back.position.set(0, 5, -55);
  root.add(back);

  root.add(new THREE.AmbientLight(0xffffff, 1.05));
}
