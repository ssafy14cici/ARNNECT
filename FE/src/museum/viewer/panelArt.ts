// src/viewer/panelArt.ts
import * as THREE from "three";

export type PanelArtItem = {
  panelName: string; // ex) "EX_PANEL_1"
  imageUrl: string;  // ex) /art/b1.jpg 또는 /artwork/xxx.png
  title: string;     // ex) "작품명"
};

export type AttachPanelArtArgs = {
  sceneRoot: THREE.Object3D;
  items: PanelArtItem[];

  /** 패널 표면에서 띄우기 (깜빡임/관통 방지) */
  epsilon?: number;

  /** 패널 대비 이미지 채우기 비율(1=꽉, 1.02=조금 크게) */
  fill?: number;

  /** 카메라에서 패널 중심으로 레이캐스트해서 정면 face 노말로 붙임 */
  faceCamera?: boolean;

  /** faceCamera=true면 필수 */
  camera?: THREE.Camera;

  /** 이미지 상하 뒤집힘 보정 (기본 true) */
  fixFlipY?: boolean;
};

export type AttachPanelArtResult = {
  clickMeshes: THREE.Object3D[];
  attached: Array<{ panel: string; meshName: string }>;
  missing: string[];
};

function normalizeName(n: string) {
  return (n ?? "").trim().toLowerCase();
}

function findByNameLoose(root: THREE.Object3D, want: string): THREE.Object3D | null {
  const target = normalizeName(want);
  let exact: THREE.Object3D | null = null;
  const candidates: THREE.Object3D[] = [];

  root.traverse((o) => {
    const n = normalizeName(o.name);
    if (!n) return;
    if (n === target) exact = o;
    if (n.includes(target)) candidates.push(o);
  });

  if (exact) return exact;
  if (!candidates.length) return null;

  candidates.sort((a, b) => a.name.length - b.name.length);
  return candidates[0];
}

function getFirstMesh(obj: THREE.Object3D): THREE.Mesh | null {
  if ((obj as any).isMesh) return obj as THREE.Mesh;
  let found: THREE.Mesh | null = null;
  obj.traverse((o) => {
    if (found) return;
    if ((o as any).isMesh) found = o as THREE.Mesh;
  });
  return found;
}

/** 월드 노말 n을 plane의 +Z가 바라보도록 quaternion 생성 */
function quatFromNormal(nWorld: THREE.Vector3): THREE.Quaternion {
  const n = nWorld.clone().normalize();

  let up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(n.dot(up)) > 0.95) up = new THREE.Vector3(1, 0, 0);

  const x = new THREE.Vector3().crossVectors(up, n).normalize();
  const y = new THREE.Vector3().crossVectors(n, x).normalize();

  const m = new THREE.Matrix4();
  m.makeBasis(x, y, n);

  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/** 카메라에서 패널 중심으로 레이캐스트: hit point + world normal(카메라 향하도록 보정) */
function raycastFacing(panelMesh: THREE.Mesh, camera: THREE.Camera) {
  panelMesh.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(panelMesh);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);

  const dir = center.clone().sub(origin).normalize();
  const raycaster = new THREE.Raycaster(origin, dir, 0, origin.distanceTo(center) + 1000);

  const hits = raycaster.intersectObject(panelMesh, true);
  if (!hits.length) return null;

  const hit = hits[0];
  const hitPoint = hit.point.clone();

  const nLocal = hit.face?.normal?.clone();
  if (!nLocal) return null;

  const normalMatrix = new THREE.Matrix3().getNormalMatrix(panelMesh.matrixWorld);
  const nWorld = nLocal.applyMatrix3(normalMatrix).normalize();

  const toCam = origin.clone().sub(hitPoint).normalize();
  if (nWorld.dot(toCam) < 0) nWorld.multiplyScalar(-1);

  return { hitPoint, nWorld };
}

/** 패널(ART plane)의 가로/세로 추정 */
function estimatePanelWH(mesh: THREE.Mesh) {
  const geo = mesh.geometry as THREE.BufferGeometry | undefined;
  if (geo?.attributes?.position) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (bb) {
      const size = new THREE.Vector3();
      bb.getSize(size);

      const axes = [size.x, size.y, size.z].sort((a, b) => b - a);
      const wLocal = axes[0];
      const hLocal = axes[1];

      const s = new THREE.Vector3();
      mesh.getWorldScale(s);

      const scale = Math.max(s.x, s.y, s.z);
      return { w: wLocal * scale, h: hLocal * scale };
    }
  }

  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);

  const axes = [size.x, size.y, size.z].sort((a, b) => b - a);
  return { w: axes[0], h: axes[1] };
}

/** 텍스처 세팅 */
function tuneTexture(tex: THREE.Texture) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  tex.anisotropy = 8;
  tex.needsUpdate = true;
}

/** ✅ 실패 대비 placeholder 텍스처 */
function makePlaceholderTexture(label: string, w = 512, h = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#111318";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = Math.max(8, Math.floor(w * 0.02));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.floor(w * 0.08)}px ui-sans-serif, system-ui, -apple-system`;
  ctx.fillText(label || "NO IMAGE", w / 2, h / 2);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 ${Math.floor(w * 0.035)}px ui-sans-serif, system-ui, -apple-system`;
  ctx.fillText("ARNNECT", w / 2, h / 2 + Math.floor(h * 0.14));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** ✅ 텍스처 로드: 실패해도 placeholder로 resolve */
async function safeLoadTexture(
  loader: THREE.TextureLoader,
  url: string,
  label: string,
  fixFlipY: boolean
): Promise<THREE.Texture> {
  try {
    const tex = await loader.loadAsync(url);
    tuneTexture(tex);
    tex.flipY = fixFlipY ? true : false;
    tex.needsUpdate = true;
    return tex;
  } catch (e) {
    console.warn("[panelArt] texture load failed -> placeholder:", url, e);
    const tex = makePlaceholderTexture(label);
    tuneTexture(tex);
    tex.flipY = fixFlipY ? true : false;
    tex.needsUpdate = true;
    return tex;
  }
}

export async function attachPanelArt(args: AttachPanelArtArgs): Promise<AttachPanelArtResult> {
  const epsilon = args.epsilon ?? 0.06;
  const fill = args.fill ?? 1.02;
  const faceCamera = args.faceCamera ?? true;
  const fixFlipY = args.fixFlipY ?? true;

  const clickMeshes: THREE.Object3D[] = [];
  const attached: Array<{ panel: string; meshName: string }> = [];
  const missing: string[] = [];

  const texLoader = new THREE.TextureLoader();
  // 교차 도메인 이미지일 가능성 대비(안 열려있으면 anyway placeholder로 감)
  try {
    (texLoader as any).setCrossOrigin?.("anonymous");
  } catch {}

  // ✅ 핵심: 1장 실패로 전체가 죽지 않게 "개별 안전 로드"
  const textures = await Promise.all(
    args.items.map((it) => safeLoadTexture(texLoader, it.imageUrl, it.title, fixFlipY))
  );

  for (let i = 0; i < args.items.length; i++) {
    const it = args.items[i];
    const tex = textures[i];

    const panelObj = findByNameLoose(args.sceneRoot, it.panelName);
    if (!panelObj) {
      console.warn("[panelArt] panel not found:", it.panelName);
      missing.push(it.panelName);
      continue;
    }

    const panelMesh = getFirstMesh(panelObj);
    if (!panelMesh) {
      console.warn("[panelArt] found but mesh missing:", it.panelName, "=>", panelObj.name);
      missing.push(it.panelName);
      continue;
    }

    const { w: panelW, h: panelH } = estimatePanelWH(panelMesh);

    let placePoint: THREE.Vector3 | null = null;
    let normalWorld: THREE.Vector3 | null = null;

    if (faceCamera && args.camera) {
      const hit = raycastFacing(panelMesh, args.camera);
      if (hit) {
        placePoint = hit.hitPoint;
        normalWorld = hit.nWorld;
      }
    }

    if (!placePoint || !normalWorld) {
      const box = new THREE.Box3().setFromObject(panelMesh);
      placePoint = new THREE.Vector3();
      box.getCenter(placePoint);
      normalWorld = new THREE.Vector3(0, 0, 1);
    }

    const planeW = panelW * fill;
    const planeH = panelH * fill;

    const geo = new THREE.PlaneGeometry(planeW, planeH);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    const art = new THREE.Mesh(geo, mat);
    art.name = `__ART_IMAGE__${it.panelName}`;
    art.userData.__title = it.title;
    art.userData.__panel = it.panelName;

    art.quaternion.copy(quatFromNormal(normalWorld));
    art.position.copy(placePoint).addScaledVector(normalWorld, epsilon);
    art.renderOrder = 10;

    args.sceneRoot.add(art);

    clickMeshes.push(art);
    attached.push({ panel: it.panelName, meshName: art.name });
  }

  return { clickMeshes, attached, missing };
}
