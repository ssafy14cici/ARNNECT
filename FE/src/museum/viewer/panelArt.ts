// src/viewer/panelArt.ts
import * as THREE from "three";

export type PanelArtItem = {
  panelName: string; // ex) "ART_1"
  imageUrl: string;  // ex) /art/b1.jpg
  title: string;     // ex) "최수원" (지금은 userData만)
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

/** 패널(ART plane)의 가로/세로 추정: geometry(local) 우선, 없으면 Box3 fallback */
function estimatePanelWH(mesh: THREE.Mesh) {
  // 1) geometry 기반 (가장 정확: “프레임보다 작다” 문제를 가장 잘 잡음)
  const geo = mesh.geometry as THREE.BufferGeometry | undefined;
  if (geo?.attributes?.position) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (bb) {
      const size = new THREE.Vector3();
      bb.getSize(size);

      // plane이면 두 축만 의미 있음. 보통 z는 두께(거의 0)
      const axes = [size.x, size.y, size.z].sort((a, b) => b - a);
      const wLocal = axes[0];
      const hLocal = axes[1];

      // ✅ 월드 스케일 반영
      const s = new THREE.Vector3();
      mesh.getWorldScale(s);

      // local bbox는 mesh local, scale만 곱하면 충분
      // (rotation은 bbox 축에 영향 없고 planeW/H 만들 때는 스칼라만 필요)
      const w = wLocal * Math.max(s.x, s.y, s.z);
      const h = hLocal * Math.max(s.x, s.y, s.z);
      return { w, h };
    }
  }

  // 2) fallback: Box3(fromObject)
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);

  const axes = [size.x, size.y, size.z].sort((a, b) => b - a);
  return { w: axes[0], h: axes[1] };
}

/** 텍스처 세팅: 지지직/모아레 줄이기 */
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

export async function attachPanelArt(args: AttachPanelArtArgs): Promise<AttachPanelArtResult> {
  const epsilon = args.epsilon ?? 0.06; // ✅ 살짝만 띄움 (너무 떠보이면 싫어함)
  const fill = args.fill ?? 1.02;       // ✅ 프레임보다 살짝 크게 (빈 여백 제거)
  const faceCamera = args.faceCamera ?? true;
  const fixFlipY = args.fixFlipY ?? true;

  const clickMeshes: THREE.Object3D[] = [];
  const attached: Array<{ panel: string; meshName: string }> = [];
  const missing: string[] = [];

  const texLoader = new THREE.TextureLoader();

  const textures = await Promise.all(
    args.items.map(
      (it) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          texLoader.load(it.imageUrl, (tex) => resolve(tex), undefined, reject);
        })
    )
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

    // 패널 w/h (정확)
    const { w: panelW, h: panelH } = estimatePanelWH(panelMesh);

    // 정면 배치용 hit/normal
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

    tuneTexture(tex);

    // ✅ 상하 뒤집힘 보정
    tex.flipY = fixFlipY ? true : false;
    tex.needsUpdate = true;

    // ✅ "패널에 꽉" (왜곡 허용, fill로 오버스캔)
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
