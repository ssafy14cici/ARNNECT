// src/viewer/lighting.ts
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

/** uiMount를 실수로 안 넘겨도 museum uiLayer로 최대한 자동 귀속 */
function resolveUiMount(uiMount?: HTMLElement): HTMLElement {
  if (uiMount && uiMount !== document.body) return uiMount;

  const layer =
    document.querySelector<HTMLElement>("#museum-ui-layer") ||
    document.querySelector<HTMLElement>('[data-museum-ui-layer="1"]');

  return layer ?? (uiMount ?? document.body);
}

function markUi(el: HTMLElement, scope: string) {
  el.dataset.museumUi = "1";
  el.dataset.museumUiScope = scope;
  return el;
}

export function applyGalleryLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 낮은 앰비언트 — 어둡지만 완전히 검지는 않게
  const ambient = new THREE.AmbientLight(0xd0e0f8, 0.85);
  scene.add(ambient);

  // 천장 간접광 — 위/아래 색 차이로 입체감
  const hemi = new THREE.HemisphereLight(0xc8ddf0, 0x888888, 1.0);
  hemi.position.set(0, 200, 0);
  scene.add(hemi);

  // 메인 디렉셔널 — 강한 그림자로 3D 입체감
  const sun = new THREE.DirectionalLight(0xe8f0ff, 2.2);
  sun.position.set(30, 250, 60);
  sun.shadow.bias = -0.003;
  sun.shadow.normalBias = 0.04;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -500;
  sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500;
  sun.shadow.camera.bottom = -500;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 1000;
  sun.castShadow = true;
  scene.add(sun);

  // 보조광 — 반대편에서 약하게 비춰서 완전 검정 방지
  const fill = new THREE.DirectionalLight(0xc0d8f0, 0.8);
  fill.position.set(-40, 150, -30);
  scene.add(fill);

  scene.background = new THREE.Color("#d8d8d8");
}

export function controlLight(_keyCode: string) {}

/** 재질 최적화 (배열 material 등 안전 처리) */
export function optimizeMaterials(model: THREE.Group) {
  const SIDE = new THREE.Color("#bbbbbb");
  const FLOOR = new THREE.Color("#cccccc");

  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const name = (mesh.name ?? "").toLowerCase();

    // material이 배열일 수도 있으니 안전하게 처리
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !(mat as any).isMeshStandardMaterial) continue;

      if (name.includes("floor") || name.includes("ground")) {
        mat.roughness = 1.0;
        mat.color?.set?.(FLOOR);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
      } else if (name.includes("panel")) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      } else {
        mat.color?.set?.(SIDE);
        mat.roughness = 0.8;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    }
  });
}

export type PanelArt = { panelName: string; imageUrl: string; label: string };

export function applyPanelArt(model: THREE.Group, arts: PanelArt[]) {
  arts.forEach(({ panelName, imageUrl, label }) => {
    const panel = model.getObjectByName(panelName) as THREE.Mesh | undefined;
    if (!panel) return;

    const canvas = document.createElement("canvas");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      // 배경
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, size, size);

      // 사진 영역
      const margin = 100;
      const imgAreaTop = margin;
      const imgAreaW = size - margin * 2;
      const imgAreaH = size * 0.6;

      const scale = Math.min(imgAreaW / img.width, imgAreaH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = imgAreaTop + (imgAreaH - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      // 하단 텍스트
      const textY = imgAreaTop + imgAreaH + 60;
      ctx.fillStyle = "#333333";
      ctx.font = "36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, size / 2, textY);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      panel.material = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.5,
        metalness: 0.0,
      });
    };

    img.onerror = () => {
      // 이미지 실패해도 패널이 깨지진 않게
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#333";
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, size / 2, size / 2);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      panel.material = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.7,
        metalness: 0.0,
      });
    };
  });
}

/**
 * 패널 클릭 시 모달 띄우기
 * - uiMount는 반드시 uiLayer로 (resolveUiMount로 방어)
 * - 반환값(dispose)을 destroy에서 호출해야 이벤트 누수 없음
 */
export function setupPanelClick(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  model: THREE.Group,
  arts: PanelArt[],
  uiMount?: HTMLElement,
) {
  const mount = resolveUiMount(uiMount);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const panelNames = new Set(arts.map((a) => a.panelName));
  const panelMeshes: THREE.Mesh[] = [];

  model.traverse((o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && panelNames.has(o.name)) panelMeshes.push(m);
  });

  const onClick = (e: MouseEvent) => {
    // 모달 위 클릭은 무시(안전)
    if ((e.target as HTMLElement | null)?.closest?.("#panel-modal")) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    pointer.x = x * 2 - 1;
    pointer.y = -(y * 2 - 1);

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(panelMeshes, false);
    if (!hits.length) return;

    const hit = hits[0].object;
    const art = arts.find((a) => a.panelName === hit.name);
    if (!art) return;

    showPanelModal(art.label, mount);
  };

  renderer.domElement.addEventListener("click", onClick);

  // ✅ destroy에서 이 반환 함수를 호출해야 함
  return () => {
    renderer.domElement.removeEventListener("click", onClick);
    // 모달이 열려있으면 닫아주기(선택)
    mount.querySelector("#panel-modal")?.remove();
  };
}

function showPanelModal(label: string, uiMount: HTMLElement) {
  // uiMount 기준 중복 방지
  if (uiMount.querySelector("#panel-modal")) return;

  const overlay = markUi(document.createElement("div"), "lighting");
  overlay.id = "panel-modal";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.6);" +
    "display:flex;align-items:center;justify-content:center;z-index:99999;" +
    "pointer-events:auto;";

  const box = markUi(document.createElement("div"), "lighting");
  box.style.cssText =
    "background:#fff;border-radius:12px;padding:40px 48px;text-align:center;" +
    "font-family:MuseumClassic,system-ui,sans-serif;min-width:280px;" +
    "pointer-events:auto;";

  // 캔버스 쪽으로 이벤트 새는 거 방지
  overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
  box.addEventListener("pointerdown", (e) => e.stopPropagation());

  const title = document.createElement("h2");
  title.style.cssText = "margin:0 0 12px;font-size:22px;color:#222;";
  title.textContent = label;

  const desc = document.createElement("p");
  desc.style.cssText = "margin:0 0 24px;font-size:15px;color:#666;";
  desc.textContent = "작품 상세 페이지로 이동합니다. (준비 중)";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.style.cssText =
    "background:#333;color:#fff;border:none;border-radius:8px;padding:10px 32px;font-size:15px;cursor:pointer;";
  btn.textContent = "닫기";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    overlay.remove();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  box.append(title, desc, btn);
  overlay.appendChild(box);

  // ✅ body 금지. uiMount로만.
  uiMount.appendChild(overlay);
}

export function createComposer(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const rect = renderer.domElement.getBoundingClientRect();
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(rect.width, rect.height), 0.05, 0.2, 0.98);
  composer.addPass(bloomPass);

  return composer;
}
