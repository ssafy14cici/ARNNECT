import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

type Waypoint = {
  name?: string;
  pos: [number, number, number]; // camera position
  yaw: number;   // radians
  pitch: number; // radians
};

type Options = {
  glbUrl?: string;
  // 시작시점 강제 지정(원하면 사용)
  start?: Waypoint;
};

// ====== 여기에 네가 콘솔에서 찍은 웨이포인트를 붙여넣기 ======
const WAYPOINTS: Waypoint[] = [
  // 예시:
  // { name: "start", pos: [0, 1.6, 5], yaw: 0, pitch: 0 },
];

export function mountMainHallWalk(canvas: HTMLCanvasElement, opts: Options = {}) {
  const glbUrl = opts.glbUrl ?? `${import.meta.env.BASE_URL}models/main_hall0.glb`;

  /* =========================
   * Renderer
   * ========================= */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // 자연광/그림자 느낌
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* =========================
   * Scene / Camera
   * ========================= */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#151515");

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 8000);
  camera.position.set(0, 1.6, 5);

  /* =========================
   * Controls (1인칭)
   * ========================= */
  const controls = new PointerLockControls(camera, renderer.domElement);
  renderer.domElement.addEventListener("click", () => controls.lock());

  /* =========================
   * Lights: 자연광 + 상부 샤프트 느낌
   * ========================= */
  // 실내 기본광(너무 어둡지 않게)
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 0.35));

  // "바깥 자연광" 방향광(태양)
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(40, 80, 20);       // 밖에서 비스듬히 들어오는 방향
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;

  // 천장 틈에서 들어오는 "샤프트" 느낌 스포트(가짜지만 효과 좋음)
  const shaft = new THREE.SpotLight(0xffffff, 3.0, 260, Math.PI * 0.18, 0.6, 1.0);
  shaft.position.set(0, 35, 0); // 천장 위쪽
  shaft.target.position.set(0, 0, 0);
  shaft.castShadow = true;
  shaft.shadow.mapSize.set(1024, 1024);
  scene.add(shaft);
  scene.add(shaft.target);

  /* =========================
   * Load GLB
   * ========================= */
  const loader = new GLTFLoader();
  const colliders: THREE.Object3D[] = [];

  loader.load(
    glbUrl,
    (gltf) => {
      const root = gltf.scene;
      scene.add(root);

      // 그림자/충돌 등록
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;

        // 그림자 받게(자연광 느낌 강화)
        m.castShadow = false;
        m.receiveShadow = true;

        colliders.push(m);
      });

      // start 옵션 있으면 적용
      if (opts.start) {
        applyWaypoint(opts.start);
      }
    },
    undefined,
    (err) => console.error("[viewer] GLB load failed:", err)
  );

  /* =========================
   * 입력: IME 무관 (event.code)
   * ========================= */
  const key = { w: false, a: false, s: false, d: false, shift: false };

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW": key.w = true; break;
      case "KeyA": key.a = true; break;
      case "KeyS": key.s = true; break;
      case "KeyD": key.d = true; break;
      case "ShiftLeft":
      case "ShiftRight": key.shift = true; break;

      // 현재 시점 찍기
      case "KeyP": {
        const wp = captureWaypoint();
        console.log("[WAYPOINT]", JSON.stringify(wp));
        break;
      }

      // 이전/다음 포인트 이동
      case "BracketLeft": goPrevWaypoint(); break;   // [
      case "BracketRight": goNextWaypoint(); break;  // ]
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW": key.w = false; break;
      case "KeyA": key.a = false; break;
      case "KeyS": key.s = false; break;
      case "KeyD": key.d = false; break;
      case "ShiftLeft":
      case "ShiftRight": key.shift = false; break;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  /* =========================
   * 중력 + 바닥 레이캐스트 (내려감 허용)
   * ========================= */
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  let velocityY = 0;

  const EYE_HEIGHT = 1.6;
  const GRAVITY = -28;
  const MOVE_SPEED = 2.4;

  function updateWalk(dt: number) {
    if (!controls.isLocked) return;

    // --- ✅ WASD 방향 정상화 ---
    // PointerLockControls:
    // - moveForward(+) = 전진
    // - moveRight(+)   = 오른쪽
    let forward = 0;
    let right = 0;

    if (key.w) forward += 1;
    if (key.s) forward -= 1;
    if (key.d) right += 1;
    if (key.a) right -= 1;

    if (forward !== 0 || right !== 0) {
      const len = Math.hypot(forward, right);
      forward /= len;
      right /= len;

      const speed = MOVE_SPEED * (key.shift ? 1.6 : 1.0);
      controls.moveForward(forward * speed * dt);
      controls.moveRight(right * speed * dt);
    }

    // --- 중력 ---
    velocityY += GRAVITY * dt;
    camera.position.y += velocityY * dt;

    // --- 바닥 충돌(레이) ---
    // 카메라 위치에서 아래로 쏴서 바닥 높이 맞춤
    raycaster.set(camera.position, down);
    raycaster.far = 8;

    const hits = raycaster.intersectObjects(colliders, true);
    if (hits.length > 0) {
      const floorY = hits[0].point.y;
      const minY = floorY + EYE_HEIGHT;

      if (camera.position.y < minY) {
        camera.position.y = minY;
        velocityY = 0;
      }
    }
  }

  /* =========================
   * 웨이포인트 캡처/적용/이동
   * ========================= */
  function getYawPitch() {
    // PointerLockControls는 yawObject(y)와 pitchObject(x)를 내부적으로 사용
    // camera.rotation은 직접 쓰지 말고 quaternion->euler로 안전하게 추출
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    return { yaw: e.y, pitch: e.x };
  }

  function captureWaypoint(): Waypoint {
    const { yaw, pitch } = getYawPitch();
    return {
      pos: [camera.position.x, camera.position.y, camera.position.z],
      yaw,
      pitch,
    };
  }

  function applyWaypoint(wp: Waypoint) {
    camera.position.set(wp.pos[0], wp.pos[1], wp.pos[2]);
    camera.rotation.set(wp.pitch, wp.yaw, 0, "YXZ"); // roll=0 고정
  }

  // 부드러운 이동(간단 tween)
  let wpIndex = 0;
  let tween:
    | null
    | {
        t: number;
        dur: number;
        fromPos: THREE.Vector3;
        toPos: THREE.Vector3;
        fromYaw: number;
        toYaw: number;
        fromPitch: number;
        toPitch: number;
      } = null;

  function startTweenTo(wp: Waypoint, dur = 0.9) {
    const { yaw, pitch } = getYawPitch();

    tween = {
      t: 0,
      dur,
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(wp.pos[0], wp.pos[1], wp.pos[2]),
      fromYaw: yaw,
      toYaw: wp.yaw,
      fromPitch: pitch,
      toPitch: wp.pitch,
    };
  }

  function easeInOut(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function updateTween(dt: number) {
    if (!tween) return;
    tween.t += dt;
    const u = Math.min(1, tween.t / tween.dur);
    const k = easeInOut(u);

    camera.position.lerpVectors(tween.fromPos, tween.toPos, k);

    const yaw = THREE.MathUtils.lerp(tween.fromYaw, tween.toYaw, k);
    const pitch = THREE.MathUtils.lerp(tween.fromPitch, tween.toPitch, k);
    camera.rotation.set(pitch, yaw, 0, "YXZ");

    // 이동 중에는 중력 영향 제거(웨이포인트 정확도 우선)
    velocityY = 0;

    if (u >= 1) tween = null;
  }

  function goPrevWaypoint() {
    if (WAYPOINTS.length === 0) return;
    wpIndex = (wpIndex - 1 + WAYPOINTS.length) % WAYPOINTS.length;
    startTweenTo(WAYPOINTS[wpIndex], 0.9);
  }

  function goNextWaypoint() {
    if (WAYPOINTS.length === 0) return;
    wpIndex = (wpIndex + 1) % WAYPOINTS.length;
    startTweenTo(WAYPOINTS[wpIndex], 0.9);
  }

  /* =========================
   * Resize
   * ========================= */
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  /* =========================
   * Loop
   * ========================= */
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.033);

    // 웨이포인트 트윈 중이면 워킹 입력/중력 대신 트윈 우선
    if (tween) updateTween(dt);
    else updateWalk(dt);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return {
    controls,
    captureWaypoint,
  };
}
