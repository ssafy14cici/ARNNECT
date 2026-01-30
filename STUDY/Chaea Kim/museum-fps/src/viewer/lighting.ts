import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

export function applyGalleryLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 전체 조명
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);

  // 천장에서 내려오는 간접광
  const hemi = new THREE.HemisphereLight(0xffffff, 0x999999, 0.8);
  hemi.position.set(0, 200, 0);
  scene.add(hemi);

  // 그림자용 디렉셔널 라이트
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(50, 300, 50);
  sun.shadow.bias = -0.005;
  sun.shadow.normalBias = 0.05;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -500;
  sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500;
  sun.shadow.camera.bottom = -500;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 1000;
  sun.castShadow = true;
  scene.add(sun);

  scene.background = new THREE.Color("#e0e0e0");
}

export function controlLight(keyCode: string) {}

export function optimizeMaterials(model: THREE.Group) {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;

      // 💡 바닥 얼룩이 특히 심하다면 바닥 재질만 따로 잡아서 그림자를 덜 받게 합니다.
      const name = mesh.name.toLowerCase();
      if (name.includes("floor") || name.includes("ground")) {
        mat.roughness = 1.0;
        mat.color.set("#cccccc");
        mesh.receiveShadow = true;
        mesh.castShadow = false;
      } else if (name.includes("panel")) {
        // 패널: 그림자를 만들어서 입체감 유지
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      } else {
        mat.color.set("#bbbbbb");
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

    // 캔버스에 사진 + 하단 이름 텍스트를 그림
    const canvas = document.createElement("canvas");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      // 배경 - 패널 색상
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, size, size);

      // 사진 영역 (상단 중앙 약 60%)
      const margin = 100;
      const imgAreaTop = margin;
      const imgAreaW = size - margin * 2;
      const imgAreaH = size * 0.6;

      // 비율 유지하며 중앙 배치
      const scale = Math.min(imgAreaW / img.width, imgAreaH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = imgAreaTop + (imgAreaH - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      // 하단 이름 텍스트 (사진 바로 아래 작게)
      const textY = imgAreaTop + imgAreaH + 60;
      ctx.fillStyle = "#333333";
      ctx.font = "36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, size / 2, textY);

      // 텍스처 적용
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      panel.material = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.5,
        metalness: 0.0,
      });
    };
  });
}

export function setupPanelClick(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  model: THREE.Group,
  arts: PanelArt[],
) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const panelNames = new Set(arts.map((a) => a.panelName));
  const panelMeshes: THREE.Mesh[] = [];

  model.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh && panelNames.has(o.name)) {
      panelMeshes.push(o as THREE.Mesh);
    }
  });

  renderer.domElement.addEventListener("click", (e: MouseEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(panelMeshes, false);
    if (hits.length === 0) return;

    const hit = hits[0].object;
    const art = arts.find((a) => a.panelName === hit.name);
    if (!art) return;

    showPanelModal(art.label);
  });
}

function showPanelModal(label: string) {
  // 이미 열려있으면 무시
  if (document.getElementById("panel-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "panel-modal";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;";

  const box = document.createElement("div");
  box.style.cssText =
    "background:#fff;border-radius:12px;padding:40px 48px;text-align:center;font-family:system-ui,sans-serif;min-width:280px;";

  const title = document.createElement("h2");
  title.style.cssText = "margin:0 0 12px;font-size:22px;color:#222;";
  title.textContent = label;

  const desc = document.createElement("p");
  desc.style.cssText = "margin:0 0 24px;font-size:15px;color:#666;";
  desc.textContent = "작품 상세 페이지로 이동합니다. (준비 중)";

  const btn = document.createElement("button");
  btn.style.cssText =
    "background:#333;color:#fff;border:none;border-radius:8px;padding:10px 32px;font-size:15px;cursor:pointer;";
  btn.textContent = "닫기";
  btn.addEventListener("click", () => overlay.remove());

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  box.append(title, desc, btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function createComposer(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.05, 0.2, 0.98
  );
  composer.addPass(bloomPass);
  return composer;
}