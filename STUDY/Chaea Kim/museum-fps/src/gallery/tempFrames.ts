import * as THREE from "three";

type Pose = { pos: THREE.Vector3; target: THREE.Vector3 };

type FrameOpts = {
  basePath?: string; // default "/art"
  skipFirst?: boolean; // default true

  width?: number;
  height?: number;

  offset?: number;
  border?: number;

  maxDistance?: number;

  ignoreNamePrefixes?: string[];

  /**
   * ✅ 모든 작품의 높이를 동일하게 맞추고 싶을 때 사용.
   * - 기본값: 1.6 (눈높이 기준)
   * - null이면 레이캐스트 히트 포인트의 y를 그대로 사용
   */
  fixedY?: number | null;

  /**
   * fixedY를 쓸 때, "작품 중심"을 fixedY로 둘지,
   * 아니면 "하단 기준"으로 둘지 선택.
   * - "center": 작품 중심 y = fixedY (기본)
   * - "bottom": 작품 하단 y = fixedY (벽걸이 느낌)
   */
  fixedYMode?: "center" | "bottom";
};

function worldNormalFromHit(hit: THREE.Intersection): THREE.Vector3 {
  const n = new THREE.Vector3();
  if (hit.face) {
    n.copy(hit.face.normal);
    const m = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    n.applyMatrix3(m).normalize();
  } else {
    n.set(0, 0, 1);
  }
  return n;
}

export function createTempFramesRaycasted(
  root: THREE.Object3D,
  poses: Pose[],
  opts: FrameOpts = {}
) {
  const basePath = opts.basePath ?? "/art";
  const skipFirst = opts.skipFirst ?? true;

  const width = opts.width ?? 2.2;
  const height = opts.height ?? 1.6;
  const offset = opts.offset ?? 0.06;
  const border = opts.border ?? 0.12;
  const maxDistance = opts.maxDistance ?? 200;

  const fixedY = opts.fixedY ?? 1.6; // ✅ 기본: 눈높이 근처로 통일
  const fixedYMode = opts.fixedYMode ?? "center";

  const ignorePrefixes = opts.ignoreNamePrefixes ?? ["TEMP_", "ART_", "FRAME_"];

  const group = new THREE.Group();
  group.name = "TEMP_FRAMES";

  const raycaster = new THREE.Raycaster();

  // 작품: 조명 영향 X
  const texLoader = new THREE.TextureLoader();

  const frameMat = new THREE.MeshBasicMaterial({
    color: 0x111111,
    toneMapped: false,
  });

  const baseArtMat = new THREE.MeshBasicMaterial({
    toneMapped: false,
  });

  // Raycast 대상 meshes
  const candidates: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!o.name) return;
    for (const p of ignorePrefixes) {
      if (o.name.startsWith(p)) return;
    }
    if ((o as any).isMesh) candidates.push(o);
  });

  const makeOne = (index: number, pose: Pose) => {
    const dir = new THREE.Vector3().subVectors(pose.target, pose.pos).normalize();
    if (dir.lengthSq() === 0) return;

    raycaster.set(pose.pos, dir);
    raycaster.far = maxDistance;

    const hits = raycaster.intersectObjects(candidates, true);
    if (!hits.length) {
      console.warn(`[TEMP_FRAMES] no hit for pose ${index}`);
      return;
    }

    const hit = hits[0];
    const hitPoint = hit.point.clone();

    // 월드 노멀
    const n = worldNormalFromHit(hit);
    const toCam = new THREE.Vector3().subVectors(pose.pos, hitPoint).normalize();
    if (n.dot(toCam) < 0) n.negate();

    // ✅ 높이 통일: y만 고정값으로 강제 (원하면 off 가능)
    if (fixedY !== null) {
      if (fixedYMode === "center") {
        hitPoint.y = fixedY;
      } else {
        // bottom: 하단 기준 => 중심 y = fixedY + height/2
        hitPoint.y = fixedY + height * 0.5;
      }
    }

    // 이미지 번호: WP_1 -> a1.jpg ...
    const imgNum = index;
    const url = `${basePath}/b${imgNum}.jpg`;

    const tex = texLoader.load(
      url,
      undefined,
      undefined,
      () => console.warn(`[TEMP_FRAMES] failed to load: ${url}`)
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const artMat = baseArtMat.clone();
    artMat.map = tex;

    const artGeo = new THREE.PlaneGeometry(width, height);
    const frameGeo = new THREE.PlaneGeometry(width + border, height + border);

    const art = new THREE.Mesh(artGeo, artMat);
    art.name = `ART_${imgNum}`;

    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.name = `FRAME_${imgNum}`;

    // 벽에서 살짝 띄워서 붙이기
    const posOnWall = hitPoint.clone().add(n.clone().multiplyScalar(offset));
    art.position.copy(posOnWall);
    frame.position.copy(posOnWall.clone().add(n.clone().multiplyScalar(-0.001)));

    // 회전: plane의 +Z가 노멀 방향(n)을 향하도록
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    art.quaternion.copy(q);
    frame.quaternion.copy(q);

    const pack = new THREE.Group();
    pack.name = `ARTPACK_${imgNum}`;
    pack.add(frame);
    pack.add(art);

    group.add(pack);
  };

  for (let i = 0; i < poses.length; i++) {
    if (skipFirst && i === 0) continue;
    makeOne(i, poses[i]);
  }

  return group;
}
