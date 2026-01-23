/**
 * scene.ts (통파일 / 주석 포함)
 * ======================================================
 * 목표 UX (합의한 흐름)
 * 1) 웹페이지 로딩: UI 로딩 표시 + ENTER 비활성
 * 2) GLB 로딩 완료: 외부(건물) "정면 크게" 시점 세팅 + ENTER 활성
 * 3) ENTER(1초 홀드): 카메라가 문쪽으로 "슝" 이동 + 화이트 플래시
 * 4) 내부로 스왑: 흰 배경 + 기본 갤러리(벽/바닥)
 * 5) 내부 작품: "더미 이미지(임시)" + "액자 GLB" 함께 보이기
 * 6) 작품 클릭: ui.openPanel(title, desc)로 패널 오픈(추후 라우팅 연결 가능)
 *
 * ======================================================
 * 액자 GLB 적용 방법(중요)
 * - 액자 GLB 파일을 아래 경로에 넣어주세요:
 *   public/models/frame.glb
 * - 외부 GLB는 기존처럼:
 *   public/models/simu_museum.glb
 *
 * ======================================================
 * 주의
 * - UiApi 구현체가 프로젝트마다 다를 수 있어 런타임 에러 방지를 위해
 *   UI 호출은 optional chaining 형태로 안전하게 호출합니다.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils.js";
import gsap from "gsap";
import type { UiApi } from "../ui";

type Mode = "EXTERIOR" | "TRANSITION" | "INTERIOR";

export function createScene(canvas: HTMLCanvasElement, ui: UiApi) {
  // UI 구현이 완전히 일치하지 않아도 크래시 방지
  const UI = ui as any;

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

  // ✅ 멀리까지 보이도록 fog 넓힘(첫 코드 기준)
  scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);

  // ✅ 웅장한 느낌(FOV 낮게) (첫 코드 기준)
  const camera = new THREE.PerspectiveCamera(
    36,
    window.innerWidth / window.innerHeight,
    0.1,
    4000
  );

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
   * Exterior floor (임시 단색 바닥)
   * ====================================================== */
  const extFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: "#f6f4ef", roughness: 0.95 })
  );
  extFloor.rotation.x = -Math.PI / 2;
  exterior.add(extFloor);

  /* ======================================================
   * State
   * ====================================================== */
  let mode: Mode = "EXTERIOR";
  let isAnimating = false;
  let glbLoaded = false;

  // 외부 카메라 상태 저장(내부에서 Exit 시 복귀용)
  const exteriorState = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: 1.05,
  };

  /* ======================================================
   * Interior (기본 갤러리 + 더미 이미지 Plane)
   * - 여기서 작품 슬롯(그룹) 생성
   * - 액자 GLB는 attachFramesToArtSlots()에서 로드 후 clone으로 붙임
   * ====================================================== */
  const { artworks, setInteriorCamera, artSlots, artworkSize } = buildInterior(interior);

  // ✅ 내부 액자 GLB 로드 후 작품 슬롯마다 프레임 붙이기
  // frame.glb를 public/models/frame.glb 에 넣어야 합니다.
  attachFramesToArtSlots({
    glbUrl: `${import.meta.env.BASE_URL}models/frame.glb`,
    artSlots,
    artworkSize,
  });

  /* ======================================================
   * GLB Load (Exterior - museum building)
   * ====================================================== */
  const loader = new GLTFLoader();
  const glbRoot = new THREE.Group();
  exterior.add(glbRoot);

  // ✅ 로딩 UI 시작 (입장 전)
  UI.setLoadingVisible?.(true);
  UI.setLoadingProgress?.(0);
  UI.setEnterEnabled?.(false, "Loading…");
  UI.setHeroVisible?.(true);

  loader.load(
    `${import.meta.env.BASE_URL}models/simu_museum.glb`,
    (gltf) => {
      glbRoot.add(gltf.scene);

      /* ----------------------------------------------
       * 모델 정렬 (중심 + 바닥)
       * - center 정렬 후 minY를 0으로 맞춤
       * ---------------------------------------------- */
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = new THREE.Vector3();
      box.getCenter(center);
      gltf.scene.position.sub(center);

      const box2 = new THREE.Box3().setFromObject(gltf.scene);
      gltf.scene.position.y -= box2.min.y;

      /* ======================================================
       * ✅ 시작 카메라: 외부 "정면 크게" (입장 전 시점)
       * ======================================================
       * GLB의 정면 방향이 +Z가 아닐 수 있어 yawDeg로 맞춥니다.
       * - 정면이 옆으로 보이면: 90 / -90 / 180 중 하나로 맞추면 됩니다.
       */
      const FRONT_YAW_DEG = 90; // 필요하면 0 / 90 / -90 / 180로 변경

      frameFrontView(camera, controls, gltf.scene, {
        fill: 0.86, // 더 크게: 0.88~0.92 / 덜 크게: 0.78~0.84
        yawDeg: FRONT_YAW_DEG,
        pitchDeg: 0,
        lift: 0.1,
      });

      // ✅ 로딩 끝: ENTER 활성
      glbLoaded = true;
      UI.setLoadingProgress?.(1);
      UI.setLoadingVisible?.(false);
      UI.setEnterEnabled?.(true, "Hold ENTER for 1s");
    },
    (xhr) => {
      if (xhr.total && xhr.total > 0) {
        UI.setLoadingProgress?.(xhr.loaded / xhr.total);
      }
    },
    (err) => {
      console.error("Museum GLB load failed:", err);
      UI.setLoadingVisible?.(false);
      UI.setEnterEnabled?.(false, "Load failed");
    }
  );

  /* ======================================================
   * ENTER (1초 홀드) -> "슝" + 화이트 + 내부로 스왑
   * ====================================================== */
  const enterHandler = () => {
    if (!glbLoaded) return;
    if (mode !== "EXTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";

    UI.setHeroVisible?.(false);
    UI.setEnterEnabled?.(false, "Entering…");

    // 외부 상태 저장(Exit 시 복귀용)
    exteriorState.cam.copy(camera.position);
    exteriorState.target.copy(controls.target);
    exteriorState.exposure = renderer.toneMappingExposure;

    runEnterSequence({
      camera,
      controls,
      renderer,
      scene,
      exterior,
      interior,
      setInteriorCamera,
      ui: UI,
      onDone: () => {
        mode = "INTERIOR";
        isAnimating = false;
        UI.setExitVisible?.(true);
      },
    });
  };

  // ✅ UI 구현에 onEnterHold가 있으면 그걸 사용
  UI.onEnterHold?.(enterHandler);

  // (방어용) onEnterHold가 없을 때: 키보드 Enter 1초 홀드로 진입
  // 필요 없으면 지워도 됩니다.
  {
    let downAt = 0;
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (downAt !== 0) return;
      downAt = performance.now();
      window.setTimeout(() => {
        if (downAt !== 0 && performance.now() - downAt >= 950) enterHandler();
      }, 1000);
    });
    window.addEventListener("keyup", (e) => {
      if (e.key !== "Enter") return;
      downAt = 0;
    });
  }

  /* ======================================================
   * EXIT (INTERIOR -> EXTERIOR)
   * ====================================================== */
  UI.onExit?.(() => {
    if (mode !== "INTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";
    UI.setExitVisible?.(false);

    const tl = gsap.timeline({
      onComplete: () => {
        mode = "EXTERIOR";
        isAnimating = false;
        UI.setHeroVisible?.(true);
        UI.setEnterEnabled?.(true, "Hold ENTER for 1s");
      },
    });

    // 화이트 플래시 인
    tl.to({}, { duration: 0.18, onStart: () => UI.flash?.(1) });

    // 외부로 스왑 + 카메라 복귀
    tl.add(() => {
      interior.visible = false;
      exterior.visible = true;

      scene.background = new THREE.Color("#f6f4ef");
      scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);
      renderer.toneMappingExposure = exteriorState.exposure;

      camera.position.copy(exteriorState.cam);
      controls.target.copy(exteriorState.target);
      controls.update();
    });

    // 플래시 아웃
    tl.to({}, { duration: 0.45, onUpdate: () => UI.flash?.(0) }, "+=0.04");
  });

  /* ======================================================
   * Artwork Click (INTERIOR)
   * - 작품 Plane 클릭 시 패널 오픈
   * ====================================================== */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function onPointerDown(e: PointerEvent) {
    if (mode !== "INTERIOR") return;

    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(artworks, true);
    if (hits.length === 0) return;

    const meta = hits[0].object.userData?.art as
      | { id: string; title: string; desc: string }
      | undefined;

    if (!meta) return;

    UI.openPanel?.(meta.title, meta.desc);

    // TODO: 라우팅 연결 예시
    // navigate(`/art/${meta.id}`);
  }
  canvas.addEventListener("pointerdown", onPointerDown);

  /* ======================================================
   * Loop / Resize
   * ====================================================== */
  function tick() {
    controls.update();
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
 * ✅ 정면 확대 프레이밍 함수 (세로/가로 FOV 모두 고려)
 * - 외부 입장 전 시점 세팅에 사용
 * ====================================================== */
function frameFrontView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  opts?: {
    fill?: number;
    yawDeg?: number;
    pitchDeg?: number;
    lift?: number;
  }
) {
  const fill = opts?.fill ?? 0.86;
  const yaw = THREE.MathUtils.degToRad(opts?.yawDeg ?? 0);
  const pitch = THREE.MathUtils.degToRad(opts?.pitchDeg ?? 0);
  const lift = opts?.lift ?? 0.1;

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const dir = new THREE.Vector3(0, 0, 1);
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  dir.normalize();

  const target = center.clone();
  target.y = box.min.y + size.y * (0.5 + lift);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const distV = (size.y / (2 * Math.tan(vFov / 2))) / fill;
  const distH = (Math.max(size.x, size.z) / (2 * Math.tan(hFov / 2))) / fill;
  const dist = Math.max(distV, distH);

  const pos = target.clone().add(dir.multiplyScalar(dist));
  camera.position.copy(pos);

  // 클리핑 안정화
  camera.near = Math.max(0.1, dist / 200);
  camera.far = Math.max(4000, dist * 20);
  camera.updateProjectionMatrix();

  controls.target.copy(target);
  controls.update();
}

/* ======================================================
 * Enter Sequence
 * - ENTER 홀드 후 "슝" 이동 + 화이트 플래시 + interior 스왑
 * ====================================================== */
function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  exterior: THREE.Group;
  interior: THREE.Group;
  setInteriorCamera: (camera: THREE.PerspectiveCamera, controls: OrbitControls) => void;
  ui: any;
  onDone: () => void;
}) {
  const { camera, controls, renderer, scene, exterior, interior, setInteriorCamera, ui, onDone } =
    args;

  // ===== 튜닝 포인트 =====
  const MOVE_T = 1.05;
  const FADE_IN = 0.25;
  const FADE_OUT = 0.55;

  // "슝" 전진 거리
  const forwardPush = 6.5;

  // target을 살짝 위로(웅장/몰입감)
  const targetLift = 1.6;

  // forward 기반 목적지 (좌표에 덜 민감)
  const forward = controls.target.clone().sub(camera.position).normalize();
  const endPos = camera.position.clone().add(forward.multiplyScalar(forwardPush));

  const endTarget = controls.target.clone();
  endTarget.y += targetLift;

  const tl = gsap.timeline({ onComplete: onDone });

  // 1) 카메라/타겟 이동
  tl.to(
    camera.position,
    {
      duration: MOVE_T,
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    },
    0
  );
  tl.to(
    controls.target,
    {
      duration: MOVE_T,
      x: endTarget.x,
      y: endTarget.y,
      z: endTarget.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    },
    0
  );

  // 2) 화이트 플래시 인
  tl.to(
    {},
    {
      duration: FADE_IN,
      onStart: () => ui.flash?.(1),
    },
    MOVE_T * 0.75
  );

  // 3) 내부로 스왑
  tl.add(() => {
    exterior.visible = false;
    interior.visible = true;

    scene.background = new THREE.Color("#ffffff");
    scene.fog = new THREE.Fog("#ffffff", 10, 2000);
    renderer.toneMappingExposure = 1.12;

    setInteriorCamera(camera, controls);
    controls.update();
  });

  // 4) 플래시 아웃
  tl.to({}, { duration: FADE_OUT, onUpdate: () => ui.flash?.(0) }, "+=0.05");
}

/* ======================================================
 * Interior builder
 * - 기본 갤러리(벽/바닥) + 작품 Plane(더미 이미지 텍스처)
 * - 작품은 그룹(slot) 단위로 만들고, 액자 GLB는 별도로 로드해서 slot에 붙임
 * ====================================================== */
function buildInterior(root: THREE.Group) {
  // raycaster 대상(작품 plane만 클릭되게)
  const artworks: THREE.Object3D[] = [];

  // 액자 붙일 슬롯들(작품 그룹 + plane 정보)
  const artSlots: Array<{
    group: THREE.Group;
    plane: THREE.Mesh;
  }> = [];

  // 바닥
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

  // 벽
  const wallMat = new THREE.MeshStandardMaterial({
    color: "#fbfbfb",
    roughness: 0.85,
  });

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 85), wallMat);
  leftWall.position.set(-10, 5, -12);
  root.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 85), wallMat);
  rightWall.position.set(10, 5, -12);
  root.add(rightWall);

  const back = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 1.2), wallMat);
  back.position.set(0, 5, -55);
  root.add(back);

  // 조명
  root.add(new THREE.AmbientLight(0xffffff, 1.05));
  const spot = new THREE.DirectionalLight(0xffffff, 0.55);
  spot.position.set(2, 10, 6);
  root.add(spot);

  // 작품 크기 (plane)
  const W = 3.2;
  const H = 2.2;

  // 오른쪽 벽 작품 4개
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.position.set(9.35, 4.2, -16 - i * 9.5);
    g.rotation.y = -Math.PI / 2;
    root.add(g);

    const tex = makeDummyArtworkTexture(`Artwork ${i + 1}`);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0.0,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
    plane.position.z = 0.08; // 프레임보다 살짝 앞으로(나중에 attachFrames에서 재조정)
    plane.userData.art = {
      id: `R-${i + 1}`,
      title: `Artwork ${i + 1}`,
      desc: "Dummy image (CanvasTexture). Replace later with real image URL.",
    };

    g.add(plane);

    artworks.push(plane);
    artSlots.push({ group: g, plane });
  }

  // 왼쪽 벽 작품 4개
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.position.set(-9.35, 4.2, -16 - i * 9.5);
    g.rotation.y = Math.PI / 2;
    root.add(g);

    const tex = makeDummyArtworkTexture(`Artwork ${i + 5}`);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0.0,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
    plane.position.z = 0.08;
    plane.userData.art = {
      id: `L-${i + 1}`,
      title: `Artwork ${i + 5}`,
      desc: "Dummy image (CanvasTexture). Replace later with real image URL.",
    };

    g.add(plane);

    artworks.push(plane);
    artSlots.push({ group: g, plane });
  }

  // 내부 카메라 초기값
  function setInteriorCamera(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    camera.position.set(0.8, 2.2, 9.8);
    controls.target.set(0.8, 2.0, -2.0);
  }

  return {
    artworks,
    setInteriorCamera,
    artSlots,
    artworkSize: { W, H },
  };
}

/* ======================================================
 * 더미 이미지 텍스처(512) 생성
 * - 외부 이미지 파일 없이도 "일시적으로 보이게" 하는 목적
 * ====================================================== */
function makeDummyArtworkTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // 배경
  ctx.fillStyle = "#e9e9e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 라벨 바
  ctx.fillStyle = "#d2d2d2";
  ctx.fillRect(0, 0, canvas.width, 88);

  // 텍스트
  ctx.fillStyle = "#2b2a28";
  ctx.font = "bold 42px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 32, 44);

  // 간단한 도형(작품 느낌)
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "#c7c7c7";
  ctx.beginPath();
  ctx.arc(350, 300, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* ======================================================
 * 액자 GLB 로드 & 작품 슬롯에 부착
 * - frame.glb를 1번만 로드하고, slot마다 clone해서 붙임
 * - 액자 GLB의 원점/방향/축이 제각각일 수 있어 "튜닝 상수" 제공
 * ====================================================== */
function attachFramesToArtSlots(args: {
  glbUrl: string;
  artSlots: Array<{ group: THREE.Group; plane: THREE.Mesh }>;
  artworkSize: { W: number; H: number };
}) {
  const { glbUrl, artSlots, artworkSize } = args;

  // ===== 튜닝 상수 =====
  // 액자 크기: 그림보다 얼마나 크게(비율)
  const FRAME_MARGIN = 0.18;

  // 그림이 액자보다 앞으로 튀어나오는 정도
  const PLANE_POP = 0.08;

  // 액자를 벽쪽으로 얼마나 더 붙이는지
  const FRAME_PUSH = 0.02;

  // 액자 방향이 이상하면 여기만 수정
  // 예) 뒤집혀 있으면 Math.PI, 옆으로 누웠으면 Math.PI/2 등
  const EXTRA_ROT_Y = 0;

  const loader = new GLTFLoader();
  loader.load(
    glbUrl,
    (gltf) => {
      const base = gltf.scene;

      // 원본 프레임은 씬에 직접 넣지 않고 clone해서 사용
      base.traverse((o: any) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      // 원본 프레임 bbox 측정 (스케일 산출)
      const baseBox = new THREE.Box3().setFromObject(base);
      const baseSize = new THREE.Vector3();
      baseBox.getSize(baseSize);

      // 그림(plane) 타겟 크기 + 마진
      const targetW = artworkSize.W * (1 + FRAME_MARGIN);
      const targetH = artworkSize.H * (1 + FRAME_MARGIN);

      // 안전하게 x/y를 "가로/세로"로 가정하고 맞춤
      // (만약 GLB가 다른 축을 가로/세로로 쓰면 여기만 수정하면 됨)
      const sx = targetW / Math.max(1e-6, baseSize.x);
      const sy = targetH / Math.max(1e-6, baseSize.y);
      const s = Math.min(sx, sy);

      for (const slot of artSlots) {
        // SkinnedMesh 가능성까지 고려해 SkeletonUtils.clone 사용
        const frame = base.clone(true);
        frame.traverse((o: any) => {
          if (o.isMesh) {
            o.material = Array.isArray(o.material)
              ? o.material.map((m: any) => m.clone())
              : o.material.clone();
          }
        });



        // 스케일 적용
        frame.scale.setScalar(s);

        // clone된 프레임의 중심을 원점으로 이동(정렬 편하게)
        const b = new THREE.Box3().setFromObject(frame);
        const c = new THREE.Vector3();
        b.getCenter(c);
        frame.position.sub(c);

        // 액자는 벽쪽으로 살짝, 그림은 앞으로 살짝
        frame.position.z -= FRAME_PUSH;
        slot.plane.position.z = PLANE_POP;

        // 방향 보정(필요시)
        frame.rotation.y += EXTRA_ROT_Y;

        // slot.group에 부착
        slot.group.add(frame);
      }
    },
    undefined,
    (err) => {
      console.error("Frame GLB load failed:", err);
    }
  );
}

/**
 * scene.ts (통파일 / 액자 방향 자동 보정 포함)
 * ======================================================
 * 목표 UX
 * 1) 로딩: UI 로딩 표시 + ENTER 비활성
 * 2) 외부 GLB 로딩 완료: "정면 크게" 시점 세팅 + ENTER 활성
 * 3) ENTER(1초 홀드): 카메라 "슝" 이동 + 화이트 플래시
 * 4) 내부 스왑: 흰 배경 + 갤러리(벽/바닥)
 * 5) 내부 작품: 더미 이미지(임시) + 액자 GLB(프레임) 함께 보이기
 * 6) 작품 클릭: ui.openPanel(title, desc)
 *
 * ======================================================
 * 액자 GLB 적용 (필수 경로)
 * - 액자 GLB: public/models/frame.glb
 * - 외부(미술관) GLB: public/models/simu_museum.glb
 *
 * ======================================================
 * 이번 수정의 핵심(액자 방향 이상 해결)
 * - 프레임 GLB가 어떤 축을 "앞/두께/가로/세로"로 쓰는지 제각각이라,
 *   "90도 단위 회전(0/90/180/270)" 후보를 전부 시도해서,
 *   (가로,세로)가 목표(artwork W/H)에 가장 잘 맞고, 두께(Z)가 가장 얇게 되는 방향을 자동 선택합니다.
 * - 그리고 프레임의 "뒷면"이 벽에 박히지 않도록:
 *   frame을 벽 바깥(+Z)으로 밀고, 그림 Plane은 프레임보다 더 앞(+Z)으로 배치합니다.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import type { UiApi } from "../ui";

type Mode = "EXTERIOR" | "TRANSITION" | "INTERIOR";

export function createScene(canvas: HTMLCanvasElement, ui: UiApi) {
  // UiApi 구현이 조금 달라도 런타임 크래시 방지(옵셔널 호출)
  const UI = ui as any;

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

  // 외부: 멀리까지 보이게 fog 넓힘
  scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);

  // 외부: 웅장하게(FOV 낮게)
  const camera = new THREE.PerspectiveCamera(
    36,
    window.innerWidth / window.innerHeight,
    0.1,
    4000
  );

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
   * ====================================================== */
  const extFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: "#f6f4ef", roughness: 0.95 })
  );
  extFloor.rotation.x = -Math.PI / 2;
  exterior.add(extFloor);

  /* ======================================================
   * State
   * ====================================================== */
  let mode: Mode = "EXTERIOR";
  let isAnimating = false;
  let glbLoaded = false;

  const exteriorState = {
    cam: new THREE.Vector3(),
    target: new THREE.Vector3(),
    exposure: 1.05,
  };

  /* ======================================================
   * Interior (갤러리 + 더미 이미지)
   * ====================================================== */
  const { artworks, setInteriorCamera, artSlots, artworkSize } = buildInterior(interior);

  // ✅ 프레임(GLB) 로드 후 각 슬롯에 자동 방향 보정 + 부착
  attachFramesToArtSlots({
    glbUrl: `${import.meta.env.BASE_URL}models/frame.glb`,
    artSlots,
    artworkSize,
  });

  /* ======================================================
   * GLB Load (Exterior - museum building)
   * ====================================================== */
  const loader = new GLTFLoader();
  const glbRoot = new THREE.Group();
  exterior.add(glbRoot);

  // 로딩 UI 시작 (입장 전)
  UI.setLoadingVisible?.(true);
  UI.setLoadingProgress?.(0);
  UI.setEnterEnabled?.(false, "Loading…");
  UI.setHeroVisible?.(true);

  loader.load(
    `${import.meta.env.BASE_URL}models/simu_museum.glb`,
    (gltf) => {
      glbRoot.add(gltf.scene);

      // 모델 정렬: 중심 + 바닥(minY -> 0)
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = new THREE.Vector3();
      box.getCenter(center);
      gltf.scene.position.sub(center);

      const box2 = new THREE.Box3().setFromObject(gltf.scene);
      gltf.scene.position.y -= box2.min.y;

      // 외부 시작 카메라: "정면 크게"
      const FRONT_YAW_DEG = 90; // 필요하면 0/90/-90/180로 조절
      frameFrontView(camera, controls, gltf.scene, {
        fill: 0.86,
        yawDeg: FRONT_YAW_DEG,
        pitchDeg: 0,
        lift: 0.1,
      });

      // 로딩 끝: ENTER 활성
      glbLoaded = true;
      UI.setLoadingProgress?.(1);
      UI.setLoadingVisible?.(false);
      UI.setEnterEnabled?.(true, "Hold ENTER for 1s");
    },
    (xhr) => {
      if (xhr.total && xhr.total > 0) UI.setLoadingProgress?.(xhr.loaded / xhr.total);
    },
    (err) => {
      console.error("Museum GLB load failed:", err);
      UI.setLoadingVisible?.(false);
      UI.setEnterEnabled?.(false, "Load failed");
    }
  );

  /* ======================================================
   * ENTER (1초 홀드)
   * ====================================================== */
  const enterHandler = () => {
    if (!glbLoaded) return;
    if (mode !== "EXTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";

    UI.setHeroVisible?.(false);
    UI.setEnterEnabled?.(false, "Entering…");

    exteriorState.cam.copy(camera.position);
    exteriorState.target.copy(controls.target);
    exteriorState.exposure = renderer.toneMappingExposure;

    runEnterSequence({
      camera,
      controls,
      renderer,
      scene,
      exterior,
      interior,
      setInteriorCamera,
      ui: UI,
      onDone: () => {
        mode = "INTERIOR";
        isAnimating = false;
        UI.setExitVisible?.(true);
      },
    });
  };

  // ui.onEnterHold가 있다면 사용
  UI.onEnterHold?.(enterHandler);

  // (방어용) onEnterHold가 없을 때: 키보드 Enter 1초 홀드로 진입
  {
    let downAt = 0;
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (downAt !== 0) return;
      downAt = performance.now();
      window.setTimeout(() => {
        if (downAt !== 0 && performance.now() - downAt >= 950) enterHandler();
      }, 1000);
    });
    window.addEventListener("keyup", (e) => {
      if (e.key !== "Enter") return;
      downAt = 0;
    });
  }

  /* ======================================================
   * EXIT (INTERIOR -> EXTERIOR)
   * ====================================================== */
  UI.onExit?.(() => {
    if (mode !== "INTERIOR") return;
    if (isAnimating) return;

    isAnimating = true;
    mode = "TRANSITION";
    UI.setExitVisible?.(false);

    const tl = gsap.timeline({
      onComplete: () => {
        mode = "EXTERIOR";
        isAnimating = false;
        UI.setHeroVisible?.(true);
        UI.setEnterEnabled?.(true, "Hold ENTER for 1s");
      },
    });

    tl.to({}, { duration: 0.18, onStart: () => UI.flash?.(1) });

    tl.add(() => {
      interior.visible = false;
      exterior.visible = true;

      scene.background = new THREE.Color("#f6f4ef");
      scene.fog = new THREE.Fog("#f6f4ef", 80, 2200);
      renderer.toneMappingExposure = exteriorState.exposure;

      camera.position.copy(exteriorState.cam);
      controls.target.copy(exteriorState.target);
      controls.update();
    });

    tl.to({}, { duration: 0.45, onUpdate: () => UI.flash?.(0) }, "+=0.04");
  });

  /* ======================================================
   * Artwork Click (INTERIOR)
   * ====================================================== */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function onPointerDown(e: PointerEvent) {
    if (mode !== "INTERIOR") return;

    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(artworks, true);
    if (hits.length === 0) return;

    const meta = hits[0].object.userData?.art as
      | { id: string; title: string; desc: string }
      | undefined;

    if (!meta) return;
    UI.openPanel?.(meta.title, meta.desc);
  }
  canvas.addEventListener("pointerdown", onPointerDown);

  /* ======================================================
   * Loop / Resize
   * ====================================================== */
  function tick() {
    controls.update();
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
 * 외부 정면 확대 프레이밍
 * ====================================================== */
function frameFrontView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  opts?: {
    fill?: number;
    yawDeg?: number;
    pitchDeg?: number;
    lift?: number;
  }
) {
  const fill = opts?.fill ?? 0.86;
  const yaw = THREE.MathUtils.degToRad(opts?.yawDeg ?? 0);
  const pitch = THREE.MathUtils.degToRad(opts?.pitchDeg ?? 0);
  const lift = opts?.lift ?? 0.1;

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const dir = new THREE.Vector3(0, 0, 1);
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  dir.normalize();

  const target = center.clone();
  target.y = box.min.y + size.y * (0.5 + lift);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const distV = (size.y / (2 * Math.tan(vFov / 2))) / fill;
  const distH = (Math.max(size.x, size.z) / (2 * Math.tan(hFov / 2))) / fill;
  const dist = Math.max(distV, distH);

  const pos = target.clone().add(dir.multiplyScalar(dist));
  camera.position.copy(pos);

  camera.near = Math.max(0.1, dist / 200);
  camera.far = Math.max(4000, dist * 20);
  camera.updateProjectionMatrix();

  controls.target.copy(target);
  controls.update();
}

/* ======================================================
 * ENTER 시퀀스: "슝" + 화이트 + 내부 스왑
 * ====================================================== */
function runEnterSequence(args: {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  exterior: THREE.Group;
  interior: THREE.Group;
  setInteriorCamera: (camera: THREE.PerspectiveCamera, controls: OrbitControls) => void;
  ui: any;
  onDone: () => void;
}) {
  const { camera, controls, renderer, scene, exterior, interior, setInteriorCamera, ui, onDone } =
    args;

  const MOVE_T = 1.05;
  const FADE_IN = 0.25;
  const FADE_OUT = 0.55;
  const forwardPush = 6.5;
  const targetLift = 1.6;

  const forward = controls.target.clone().sub(camera.position).normalize();
  const endPos = camera.position.clone().add(forward.multiplyScalar(forwardPush));

  const endTarget = controls.target.clone();
  endTarget.y += targetLift;

  const tl = gsap.timeline({ onComplete: onDone });

  tl.to(
    camera.position,
    {
      duration: MOVE_T,
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    },
    0
  );
  tl.to(
    controls.target,
    {
      duration: MOVE_T,
      x: endTarget.x,
      y: endTarget.y,
      z: endTarget.z,
      ease: "power2.inOut",
      onUpdate: () => controls.update(),
    },
    0
  );

  tl.to(
    {},
    {
      duration: FADE_IN,
      onStart: () => ui.flash?.(1),
    },
    MOVE_T * 0.75
  );

  tl.add(() => {
    exterior.visible = false;
    interior.visible = true;

    scene.background = new THREE.Color("#ffffff");
    scene.fog = new THREE.Fog("#ffffff", 10, 2000);
    renderer.toneMappingExposure = 1.12;

    setInteriorCamera(camera, controls);
    controls.update();
  });

  tl.to({}, { duration: FADE_OUT, onUpdate: () => ui.flash?.(0) }, "+=0.05");
}

/* ======================================================
 * Interior: 갤러리 + 더미 이미지(Plane)
 * - 각 작품은 "slot group"으로 만들고,
 *   그 slot.group의 local +Z 방향이 "벽 바깥"이 되도록 구성합니다.
 *   => 프레임/그림은 +Z로 밀면 벽 밖으로 나옵니다.
 * ====================================================== */
function buildInterior(root: THREE.Group) {
  const artworks: THREE.Object3D[] = [];
  const artSlots: Array<{ group: THREE.Group; plane: THREE.Mesh }> = [];

  // 바닥
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

  // 벽
  const wallMat = new THREE.MeshStandardMaterial({
    color: "#fbfbfb",
    roughness: 0.85,
  });

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 85), wallMat);
  leftWall.position.set(-10, 5, -12);
  root.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 85), wallMat);
  rightWall.position.set(10, 5, -12);
  root.add(rightWall);

  const back = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 1.2), wallMat);
  back.position.set(0, 5, -55);
  root.add(back);

  // 조명
  root.add(new THREE.AmbientLight(0xffffff, 1.05));
  const spot = new THREE.DirectionalLight(0xffffff, 0.55);
  spot.position.set(2, 10, 6);
  root.add(spot);

  // 작품 크기 (Plane)
  const W = 3.2;
  const H = 2.2;

  // 오른쪽 벽 작품 4개
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.position.set(9.35, 4.2, -16 - i * 9.5);
    g.rotation.y = -Math.PI / 2; // 오른쪽 벽 방향 정렬
    root.add(g);

    const tex = makeDummyArtworkTexture(`Artwork ${i + 1}`);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);

    // 프레임 붙일 때 정확한 z를 다시 잡을 거라 일단 0
    plane.position.z = 0;

    plane.userData.art = {
      id: `R-${i + 1}`,
      title: `Artwork ${i + 1}`,
      desc: "Dummy image (CanvasTexture). Replace later with real image URL.",
    };

    g.add(plane);
    artworks.push(plane);
    artSlots.push({ group: g, plane });
  }

  // 왼쪽 벽 작품 4개
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.position.set(-9.35, 4.2, -16 - i * 9.5);
    g.rotation.y = Math.PI / 2; // 왼쪽 벽 방향 정렬
    root.add(g);

    const tex = makeDummyArtworkTexture(`Artwork ${i + 5}`);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
    plane.position.z = 0;

    plane.userData.art = {
      id: `L-${i + 1}`,
      title: `Artwork ${i + 5}`,
      desc: "Dummy image (CanvasTexture). Replace later with real image URL.",
    };

    g.add(plane);
    artworks.push(plane);
    artSlots.push({ group: g, plane });
  }

  function setInteriorCamera(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    camera.position.set(0.8, 2.2, 9.8);
    controls.target.set(0.8, 2.0, -2.0);
  }

  return {
    artworks,
    setInteriorCamera,
    artSlots,
    artworkSize: { W, H },
  };
}

/* ======================================================
 * 더미 이미지 텍스처 (512)
 * ====================================================== */
function makeDummyArtworkTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#e9e9e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#d2d2d2";
  ctx.fillRect(0, 0, canvas.width, 88);

  ctx.fillStyle = "#2b2a28";
  ctx.font = "bold 42px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 32, 44);

  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "#c7c7c7";
  ctx.beginPath();
  ctx.arc(350, 300, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* ======================================================
 * 액자 GLB 로드 & 슬롯에 부착 (방향 자동 보정)
 * ====================================================== */
function attachFramesToArtSlots(args: {
  glbUrl: string;
  artSlots: Array<{ group: THREE.Group; plane: THREE.Mesh }>;
  artworkSize: { W: number; H: number };
}) {
  const { glbUrl, artSlots, artworkSize } = args;

  // ===== 튜닝 상수 =====
  const FRAME_MARGIN = 0.16; // 그림보다 프레임이 얼마나 큰지
  const FRAME_OUT = 0.12;    // 프레임을 벽 밖(+Z)으로 얼마나 띄우는지
  const PLANE_GAP = 0.01;    // ✅ 프레임 앞면에서 그림을 얼마나만 앞으로(튀어나옴 방지)

  const loader = new GLTFLoader();
  loader.load(
    glbUrl,
    (gltf) => {
      const base = gltf.scene;

      base.traverse((o: any) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      // 목표 프레임(가로/세로)
      const targetW = artworkSize.W * (1 + FRAME_MARGIN);
      const targetH = artworkSize.H * (1 + FRAME_MARGIN);

      // 90도 단위 회전 후보 중 최적 방향 선택
      const bestRot = findBestAxisAlignedRotation(base, targetW, targetH);

      for (const slot of artSlots) {
        const frame = base.clone(true);

        // (선택) material 공유 방지
        frame.traverse((o: any) => {
          if (o.isMesh && o.material) {
            o.material = Array.isArray(o.material)
              ? o.material.map((m: any) => m.clone())
              : o.material.clone();
          }
        });

        // 1) 방향 보정
        frame.rotation.set(bestRot.x, bestRot.y, bestRot.z);

        // 2) 회전 후 bbox 기반으로 스케일 결정
        const rotBox = new THREE.Box3().setFromObject(frame);
        const rotSize = new THREE.Vector3();
        rotBox.getSize(rotSize);

        const sx = targetW / Math.max(1e-6, rotSize.x);
        const sy = targetH / Math.max(1e-6, rotSize.y);
        const s = Math.min(sx, sy);
        frame.scale.setScalar(s);

        // 3) 스케일 반영 bbox를 다시 구해서 중심 정렬
        const boxScaled = new THREE.Box3().setFromObject(frame);
        const centerScaled = new THREE.Vector3();
        boxScaled.getCenter(centerScaled);

        // 중심을 원점으로
        frame.position.sub(centerScaled);

        // 4) "벽쪽(back)" 면을 z=0에 맞추고, 벽 밖으로 FRAME_OUT만큼 이동
        //    - center 정렬 후의 bbox를 다시 계산 (정확)
        const boxCentered = new THREE.Box3().setFromObject(frame);

        const backZ = boxCentered.min.z;   // 벽쪽 면(가장 뒤)
        const frontZ = boxCentered.max.z;  // 앞면(가장 앞)

        // backZ가 0이 되게 밀고, 추가로 벽 밖으로 FRAME_OUT
        frame.position.z += -backZ + FRAME_OUT;

        // 5) ✅ plane은 "프레임 앞면" 바로 앞에 붙임 (튀어나옴 방지)
        //    plane 로컬좌표는 slot.group 기준이고, frame.position.z도 slot.group 기준이므로 일관됨.
        const frameFrontFaceZ = frame.position.z + (frontZ - backZ); 
        // (frontZ - backZ) == frame 두께. backZ를 0으로 맞췄기 때문에 이렇게 계산하면 안정적.

        slot.plane.position.z = frameFrontFaceZ + PLANE_GAP;

        slot.group.add(frame);
      }
    },
    undefined,
    (err) => {
      console.error("Frame GLB load failed:", err);
    }
  );
}

/* ======================================================
 * 프레임 GLB의 축 방향이 제각각일 때:
 * 90도 단위 회전 후보들을 전부 평가해서 "가로/세로"가 목표에 맞고 "두께(Z)"가 최소인 방향 선택
 * - 반환값: Euler(x,y,z) (라디안)
 * ====================================================== */
function findBestAxisAlignedRotation(base: THREE.Object3D, targetW: number, targetH: number) {
  const candidates = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

  // 점수 계산:
  // - X/Y가 targetW/targetH에 가까울수록 좋음
  // - Z(두께)가 얇을수록 좋음(가중치 크게)
  let best = { x: 0, y: 0, z: 0, score: Number.POSITIVE_INFINITY };

  // 원본을 직접 돌리면 원상복구가 번거로우니 임시 clone으로 평가
  const tmp = base.clone(true);

  for (const rx of candidates) {
    for (const ry of candidates) {
      for (const rz of candidates) {
        tmp.rotation.set(rx, ry, rz);

        const box = new THREE.Box3().setFromObject(tmp);
        const size = new THREE.Vector3();
        box.getSize(size);

        // 가로/세로는 X/Y로 가정(이게 잘 맞는 방향을 찾는 게 목적)
        const errXY = Math.abs(size.x - targetW) + Math.abs(size.y - targetH);

        // 두께는 Z가 작을수록 좋음 (가중치로 강하게 페널티)
        const thickPenalty = size.z * 4.0;

        // 완전 대칭 프레임이면 여러 후보가 동점일 수 있음 -> thick가 더 얇은 쪽 선호
        const score = errXY + thickPenalty;

        if (score < best.score) best = { x: rx, y: ry, z: rz, score };
      }
    }
  }

  return { x: best.x, y: best.y, z: best.z };
}
