import * as THREE from "three";

export type PanelArtItem = { imageUrl: string; title: string };
export type WaypointPose = { pos: [number, number, number]; yaw: number; pitch: number };
export type AttachPanelArtResult = {
  clickMeshes: THREE.Mesh[];
  attached: Array<{ idx: number; title: string; targetName: string; size: [number, number] }>;
  missing: Array<{ idx: number; title: string; reason: string }>;
};

type AttachArgs = {
  sceneRoot: THREE.Object3D;
  items: PanelArtItem[];
  waypoints: WaypointPose[];
  epsilon?: number;
  maxDist?: number;
  faceProbeScale?: number;
};

function computeDirFromYawPitch(yaw: number, pitch: number) {
  return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ")).normalize();
}

function isBadTarget(o: THREE.Object3D) {
  const n = (o.name ?? "").toLowerCase();
  return n.includes("__art") || n.includes("__image") || n.includes("__name");
}

async function loadImageTexture(url: string) {
  const loader = new THREE.TextureLoader();
  try {
    const tex = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  } catch {
    return new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
  }
}

function makeNameTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.roundRect(10, 10, 492, 108, 20); ctx.fill();
  ctx.fillStyle = "white"; ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getWorldNormalFromHit(hit: THREE.Intersection) {
  if (hit.face) {
    const normal = hit.face.normal.clone();
    return normal.transformDirection(hit.object.matrixWorld).normalize();
  }
  return new THREE.Vector3(0, 0, 1);
}

/** 패널의 실제 경계를 측정하고 중심 편차를 반환 */
function refinePanelBounds(params: {
  target: THREE.Mesh;
  hitPoint: THREE.Vector3;
  normal: THREE.Vector3;
  rayTargets: THREE.Object3D[];
}) {
  const { target, hitPoint, normal, rayTargets } = params;
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, normal).normalize();
  const localUp = new THREE.Vector3().crossVectors(normal, right).normalize();
  
  const rc = new THREE.Raycaster();
  rc.far = 5;
  const backDir = normal.clone().multiplyScalar(-1);

  const march = (dir: THREE.Vector3) => {
    let d = 0;
    for (let i = 0; i < 40; i++) {
      const p = hitPoint.clone().add(normal.clone().multiplyScalar(0.1)).addScaledVector(dir, d);
      rc.set(p, backDir);
      if (!rc.intersectObjects(rayTargets, true).some(h => h.object.uuid === target.uuid)) break;
      d += 0.1;
    }
    return d;
  };

  const leftD = march(right.clone().multiplyScalar(-1));
  const rightD = march(right);
  const upD = march(localUp);
  const downD = march(localUp.clone().multiplyScalar(-1));

  return {
    w: leftD + rightD,
    h: upD + downD,
    offsetX: (rightD - leftD) / 2, // 가로 치우침 보정
    offsetY: (upD - downD) / 2  // 세로 치우침 보정 (중앙 정렬 핵심)
  };
}

export async function attachPanelArt(args: AttachArgs): Promise<AttachPanelArtResult> {
  const epsilon = args.epsilon ?? 0.05; // 벽 안으로 박히지 않게 여유 공간 확보
  const clickMeshes: THREE.Mesh[] = [];
  const attached: AttachPanelArtResult["attached"] = [];
  const missing: AttachPanelArtResult["missing"] = [];

  const raycaster = new THREE.Raycaster();
  const rayTargets: THREE.Object3D[] = [];
  args.sceneRoot.traverse(o => { if ((o as THREE.Mesh).isMesh && !isBadTarget(o)) rayTargets.push(o); });

  for (let i = 0; i < Math.min(args.items.length, args.waypoints.length); i++) {
    const item = args.items[i];
    const wp = args.waypoints[i];
    raycaster.set(new THREE.Vector3(...wp.pos), computeDirFromYawPitch(wp.yaw, wp.pitch));
    const hits = raycaster.intersectObjects(rayTargets, true);

    if (!hits.length) { missing.push({ idx: i, title: item.title, reason: "no hit" }); continue; }

    const hit = hits[0];
    const normal = getWorldNormalFromHit(hit);
    const bounds = refinePanelBounds({ target: hit.object as THREE.Mesh, hitPoint: hit.point, normal, rayTargets });

    const group = new THREE.Group();
    group.name = `__ART_GROUP_${i}`;
    
    // 1. 위치 설정: 클릭 지점 + 패널 중심 편차 보정 + epsilon
    const upVec = new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3().crossVectors(upVec, normal).normalize();
    const localUpVec = new THREE.Vector3().crossVectors(normal, rightVec).normalize();
    
    const centerPoint = hit.point.clone()
      .addScaledVector(rightVec, bounds.offsetX)
      .addScaledVector(localUpVec, bounds.offsetY)
      .addScaledVector(normal, epsilon);

    group.position.copy(centerPoint);
    // 2. 각도 설정: 법선 방향을 정확히 바라보게 (기울어짐 방지)
    group.lookAt(centerPoint.clone().add(normal));

    args.sceneRoot.add(group);
    group.updateMatrixWorld();
    hit.object.attach(group);

    // 3. 사진 및 이름표 생성 (크기 최적화)
    const imgTex = await loadImageTexture(item.imageUrl);
    const imgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.w * 0.85, bounds.h * 0.6),
      new THREE.MeshStandardMaterial({ 
        map: imgTex, 
        polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -10 // 벽 뚫고 나오게 강제
      })
    );
    imgMesh.position.set(0, bounds.h * 0.05, 0); // 그룹 중앙에서 살짝 위로
    imgMesh.userData.__title = item.title;

    const nameMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.w * 0.45, bounds.h * 0.12),
      new THREE.MeshBasicMaterial({ map: makeNameTexture(item.title), transparent: true, polygonOffset: true, polygonOffsetFactor: -11 })
    );
    nameMesh.position.set(0, -bounds.h * 0.35, 0.01);

    group.add(imgMesh, nameMesh);
    clickMeshes.push(imgMesh);
    attached.push({ idx: i, title: item.title, targetName: hit.object.name, size: [bounds.w, bounds.h] });
  }
  return { clickMeshes, attached, missing };
}