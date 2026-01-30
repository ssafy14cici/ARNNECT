// src/viewer/panelArt.ts
import * as THREE from "three";

export type PanelArtItem = {
  panelName: string; // ex) "ART_1"
  imageUrl: string;  // ex) /art/b1.jpg
  title: string;     // ex) "최수원"
};

export type AttachPanelArtArgs = {
  sceneRoot: THREE.Object3D;
  items: PanelArtItem[];

  /** 패널 표면에서 살짝 띄우기 */
  epsilon?: number;

  /** 패널 대비 이미지 채우기 비율 */
  fill?: number;

  /** 카메라 기준 정면면(face) 노말로 붙이기 (강력 권장 true) */
  faceCamera?: boolean;

  /** faceCamera=true일 때 필수 */
  camera?: THREE.Camera;
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

function fitPlaneToPanel(panelSize: THREE.Vector3, fill: number) {
  const axes = [
    { v: panelSize.x },
    { v: panelSize.y },
    { v: panelSize.z },
  ].sort((a, b) => b.v - a.v);

  const w = axes[0].v * fill;
  const h = axes[1].v * fill;
  return { w, h };
}

/**
 * 월드 노말 n을 plane의 +Z가 바라보도록 quaternion 생성.
 * up이 n과 너무 평행이면 대체 up 사용.
 */
function quatFromNormal(nWorld: THREE.Vector3): THREE.Quaternion {
  const n = nWorld.clone().normalize();

  let up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(n.dot(up)) > 0.95) up = new THREE.Vector3(1, 0, 0);

  const x = new THREE.Vector3().crossVectors(up, n).normalize();
  const y = new THREE.Vector3().crossVectors(n, x).normalize();

  const m = new THREE.Matrix4();
  // basis: X, Y, Z(=normal)
  m.makeBasis(x, y, n);

  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return q;
}

/**
 * 카메라에서 패널 중심으로 레이캐스트해서
 * "카메라를 향한 face"의 노말을 월드로 얻는다.
 */
function getFacingNormalByRaycast(panelMesh: THREE.Mesh, camera: THREE.Camera): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
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

  // face normal은 local space라서 world로 변환 필요
  const nLocal = hit.face?.normal?.clone();
  if (!nLocal) return null;

  const normalMatrix = new THREE.Matrix3().getNormalMatrix(panelMesh.matrixWorld);
  const nWorld = nLocal.applyMatrix3(normalMatrix).normalize();

  // 카메라를 향하도록 보정(노말이 반대면 뒤집기)
  const toCam = origin.clone().sub(hitPoint).normalize();
  if (nWorld.dot(toCam) < 0) nWorld.multiplyScalar(-1);

  return { point: hitPoint, normal: nWorld };
}

export async function attachPanelArt(args: AttachPanelArtArgs): Promise<AttachPanelArtResult> {
  const epsilon = args.epsilon ?? 0.02;
  const fill = args.fill ?? 0.86;
  const faceCamera = args.faceCamera ?? true;

  const clickMeshes: THREE.Object3D[] = [];
  const attached: Array<{ panel: string; meshName: string }> = [];
  const missing: string[] = [];

  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(
    args.items.map(
      (it) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            it.imageUrl,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.anisotropy = 8;
              tex.flipY = false; // ✅ 텍스처 뒤집힘 방지
              resolve(tex);
            },
            undefined,
            reject
          );
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

    // 크기(패널 bbox)
    const box = new THREE.Box3().setFromObject(panelMesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    const { w, h } = fitPlaneToPanel(size, fill);

    // ✅ 붙일 위치/정면 노말을 레이캐스트로 안정적으로 획득
    let placePoint: THREE.Vector3 | null = null;
    let normalWorld: THREE.Vector3 | null = null;

    if (faceCamera) {
      if (!args.camera) {
        console.warn("[panelArt] faceCamera=true but camera missing. fallback to bbox center.");
      } else {
        const hit = getFacingNormalByRaycast(panelMesh, args.camera);
        if (hit) {
          placePoint = hit.point;
          normalWorld = hit.normal;
        }
      }
    }

    // fallback: bbox center + 대충 정면(월드 +Z)
    if (!placePoint || !normalWorld) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      placePoint = center;
      normalWorld = new THREE.Vector3(0, 0, 1);
    }

    // plane 생성
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.FrontSide,
    });

    const plane = new THREE.Mesh(geo, mat);
    plane.name = `__ART_PLANE__${it.panelName}`;
    plane.userData.__title = it.title;
    plane.userData.__panel = it.panelName;
    plane.userData.__imageUrl = it.imageUrl;

    // ✅ 노말 기준으로 plane 방향 정렬 (+Z가 노말을 바라보게)
    plane.quaternion.copy(quatFromNormal(normalWorld));

    // ✅ 표면에서 살짝 띄워서 z-fighting/관통 방지
    plane.position.copy(placePoint).addScaledVector(normalWorld, epsilon);

    args.sceneRoot.add(plane);

    clickMeshes.push(plane);
    attached.push({ panel: it.panelName, meshName: plane.name });
  }

  return { clickMeshes, attached, missing };
}
