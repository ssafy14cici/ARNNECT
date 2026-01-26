import * as THREE from "three";

export type ArtSlot = {
  id: string;
  label: string;

  // scene graph
  group: THREE.Group;
  plane: THREE.Mesh;

  // size constraints for artwork image (contain)
  maxW: number;
  maxH: number;

  // optional frame holder
  frameRoot?: THREE.Object3D;
};

export type FrameTuning = {
  scale: number;
  // frame origin 보정 (프레임 모델 원점이 중앙이 아닐 때)
  offset: THREE.Vector3;
  // plane이 프레임 앞/뒤로 파고들면 z-fight 생김 → depth로 미세 조정
  planeZ: number;
  // plane 크기 비율(프레임 내부 창 크기에 맞추기)
  artScale: number;
};

export type InteriorBuildResult = {
  artworks: THREE.Object3D[];
  artSlots: ArtSlot[];
  setInteriorCamera(camera: THREE.PerspectiveCamera, controls: any): void;

  // ✅ 신규: 외부에서 이미지/프레임을 주입하기 위한 API
  applyArtworkImage(
    renderer: THREE.WebGLRenderer,
    slotId: string,
    imageUrl: string
  ): Promise<void>;

  attachFramePrefab(
    slotId: string,
    framePrefab: THREE.Object3D,
    tuning?: Partial<FrameTuning>
  ): void;
};

export function buildInterior(root: THREE.Group): InteriorBuildResult {
  const artworks: THREE.Object3D[] = [];
  const artSlots: ArtSlot[] = [];

  // ---------- Room constants ----------
  const ROOM_W = 28;
  const ROOM_H = 12;
  const ROOM_L = 70;

  const FLOOR_Y = 0;
  const CEIL_Y = ROOM_H;

  // ---------- Floor (clean, no dot) ----------
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.18,
    metalness: 0.02,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_L), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y, -ROOM_L / 2 + 10);
  floor.receiveShadow = true;
  root.add(floor);

  // ---------- Walls ----------
  const wallMat = new THREE.MeshStandardMaterial({
    color: "#fbfbfb",
    roughness: 0.88,
    metalness: 0.0,
  });

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, ROOM_H, ROOM_L), wallMat);
  leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, -ROOM_L / 2 + 10);
  root.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, ROOM_H, ROOM_L), wallMat);
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, -ROOM_L / 2 + 10);
  root.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W + 1.2, ROOM_H, 1.2), wallMat);
  backWall.position.set(0, ROOM_H / 2, -ROOM_L + 10);
  root.add(backWall);

  // ---------- Ceiling pattern (reference vibe) ----------
  const ceilingTex = makeCeilingPatternTexture();
  ceilingTex.wrapS = ceilingTex.wrapT = THREE.RepeatWrapping;
  ceilingTex.repeat.set(3, 10);

  const ceilMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.95,
    metalness: 0.0,
    map: ceilingTex,
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_L), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CEIL_Y, -ROOM_L / 2 + 10);
  root.add(ceiling);

  // ---------- Molding (simple) ----------
  const moldMat = new THREE.MeshStandardMaterial({
    color: "#f3f3f3",
    roughness: 0.75,
  });

  const moldThickness = 0.25;
  const moldDepth = 0.35;

  const leftMold = new THREE.Mesh(new THREE.BoxGeometry(moldDepth, moldThickness, ROOM_L), moldMat);
  leftMold.position.set(-ROOM_W / 2 + 0.5, CEIL_Y - 0.4, -ROOM_L / 2 + 10);
  root.add(leftMold);

  const rightMold = new THREE.Mesh(new THREE.BoxGeometry(moldDepth, moldThickness, ROOM_L), moldMat);
  rightMold.position.set(ROOM_W / 2 - 0.5, CEIL_Y - 0.4, -ROOM_L / 2 + 10);
  root.add(rightMold);

  const backMold = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, moldThickness, moldDepth), moldMat);
  backMold.position.set(0, CEIL_Y - 0.4, -ROOM_L + 10 + 0.45);
  root.add(backMold);

  // ---------- Columns (subtle) ----------
  const colMat = new THREE.MeshStandardMaterial({
    color: "#f7f7f7",
    roughness: 0.85,
  });

  for (let i = 0; i < 5; i++) {
    const z = -18 - i * 10;
    const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, ROOM_H, 18), colMat);
    colL.position.set(-6.2, ROOM_H / 2, z);
    root.add(colL);

    const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, ROOM_H, 18), colMat);
    colR.position.set(6.2, ROOM_H / 2, z);
    root.add(colR);
  }

  // ---------- Lighting (soft, gallery-like) ----------
  root.add(new THREE.AmbientLight(0xffffff, 1.02));

  const key = new THREE.DirectionalLight(0xffffff, 0.65);
  key.position.set(3, 10.5, 7);
  root.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.22);
  fill.position.set(-8, 6, -10);
  root.add(fill);

  // ---------- Art slots ----------
  const artMatBase = new THREE.MeshStandardMaterial({
    color: "#d9d9d9",
    roughness: 0.90,
    metalness: 0.0,
  });

  function addWallSlot(cfg: {
    id: string;
    label: string;
    wall: "L" | "R" | "F";
    x: number;
    y: number;
    z: number;
    yaw: number;
    maxW: number;
    maxH: number;
  }) {
    const g = new THREE.Group();
    g.position.set(cfg.x, cfg.y, cfg.z);
    g.rotation.y = cfg.yaw;

    // plane local normal +Z
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(cfg.maxW, cfg.maxH), artMatBase.clone());
    plane.position.set(0, 0, 0);
    plane.userData.slotId = cfg.id;

    // avoid z-fighting
    plane.position.z = 0.03;

    g.add(plane);

    const slot: ArtSlot = {
      id: cfg.id,
      label: cfg.label,
      group: g,
      plane,
      maxW: cfg.maxW,
      maxH: cfg.maxH,
    };

    g.userData.slotId = cfg.id;

    root.add(g);
    artSlots.push(slot);
    artworks.push(g);

    return slot;
  }

  // Right wall: 4
  for (let i = 0; i < 4; i++) {
    addWallSlot({
      id: `R-${i + 1}`,
      label: `Artwork ${i + 1}`,
      wall: "R",
      x: ROOM_W / 2 - 0.55,
      y: 5.1,
      z: -16 - i * 10,
      yaw: -Math.PI / 2,
      maxW: 3.4 - i * 0.15,
      maxH: 2.3,
    });
  }

  // Left wall: 4
  for (let i = 0; i < 4; i++) {
    addWallSlot({
      id: `L-${i + 1}`,
      label: `Artwork ${i + 5}`,
      wall: "L",
      x: -ROOM_W / 2 + 0.55,
      y: 5.1,
      z: -16 - i * 10,
      yaw: Math.PI / 2,
      maxW: 3.4 - i * 0.15,
      maxH: 2.3,
    });
  }

  // Front wall: 3
  const frontZ = -ROOM_L + 10 + 0.9;
  const xs = [-7.5, 0, 7.5];
  for (let i = 0; i < 3; i++) {
    addWallSlot({
      id: `F-${i + 1}`,
      label: `Front ${i + 1}`,
      wall: "F",
      x: xs[i],
      y: 5.0,
      z: frontZ,
      yaw: Math.PI,
      maxW: 3.6,
      maxH: 2.5,
    });
  }

  function setInteriorCamera(camera: THREE.PerspectiveCamera, controls: any) {
    camera.position.set(0, 2.6, 12.8);
    controls.target.set(0, 5.0, -12.0);
  }

  // ============================
  // ✅ NEW: artwork texture apply
  // ============================
  const texLoader = new THREE.TextureLoader();

  function fitContain(slot: ArtSlot, tex: THREE.Texture) {
    const img = tex.image as { width: number; height: number } | undefined;
    if (!img?.width || !img?.height) return;

    const iw = img.width;
    const ih = img.height;
    const maxW = slot.maxW;
    const maxH = slot.maxH;

    const s = Math.min(maxW / iw, maxH / ih);
    const w = iw * s;
    const h = ih * s;

    // geometry replace (contain)
    const mesh = slot.plane;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(w, h);
  }

  async function applyArtworkImage(
    renderer: THREE.WebGLRenderer,
    slotId: string,
    imageUrl: string
  ) {
    const slot = artSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const tex = await new Promise<THREE.Texture>((resolve, reject) => {
      texLoader.load(
        imageUrl,
        (t) => resolve(t),
        undefined,
        (err) => reject(err)
      );
    });

    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;

    fitContain(slot, tex);

    const mat = slot.plane.material as THREE.MeshStandardMaterial;
    mat.map = tex;
    mat.color = new THREE.Color("#ffffff"); // map 색 왜곡 방지
    mat.roughness = 0.85;
    mat.metalness = 0.0;
    mat.needsUpdate = true;
  }

  // ============================
  // ✅ NEW: attach frame prefab
  // ============================
  const DEFAULT_FRAME_TUNING: FrameTuning = {
    scale: 1.0,
    offset: new THREE.Vector3(0, 0, 0),
    planeZ: 0.03,
    artScale: 1.0,
  };

  function attachFramePrefab(
    slotId: string,
    framePrefab: THREE.Object3D,
    tuning?: Partial<FrameTuning>
  ) {
    const slot = artSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const t: FrameTuning = {
      ...DEFAULT_FRAME_TUNING,
      ...tuning,
      offset: (tuning?.offset ?? DEFAULT_FRAME_TUNING.offset).clone(),
    };

    // remove old frame
    if (slot.frameRoot) {
      slot.group.remove(slot.frameRoot);
      // dispose는 prefab 공유일 수 있으니 여기선 하지 않음
      slot.frameRoot = undefined;
    }

    const frame = framePrefab.clone(true);
    frame.position.copy(t.offset);
    frame.scale.setScalar(t.scale);

    // plane을 프레임 기준으로 재조정
    slot.plane.position.z = t.planeZ;
    slot.plane.scale.setScalar(t.artScale);

    // frame이 plane을 가릴 수 있으니 plane이 항상 frame 앞에 오도록 렌더 정렬
    slot.plane.renderOrder = 2;
    frame.traverse((o) => {
      (o as any).renderOrder = 1;
    });

    // slotId를 frame 자식까지 전파 (raycaster가 frame mesh를 찍어도 slot 매핑 가능)
    frame.traverse((o) => {
      o.userData.slotId = slot.id;
    });

    slot.group.add(frame);
    slot.frameRoot = frame;
  }

  return {
    artworks,
    artSlots,
    setInteriorCamera,
    applyArtworkImage,
    attachFramePrefab,
  };
}

function makeCeilingPatternTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;

  const pts: { x: number; y: number }[] = [];
  const N = 120;
  for (let i = 0; i < N; i++) {
    pts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
    });
  }

  function dist2(a: any, b: any) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const neighbors = pts
      .map((p, idx) => ({ p, idx, d: dist2(a, p) }))
      .filter((o) => o.idx !== i)
      .sort((u, v) => u.d - v.d)
      .slice(0, 3);

    for (const nb of neighbors) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(nb.p.x, nb.p.y);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "rgba(0,0,0,0.14)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 28; i++) {
    const a = pts[Math.floor(Math.random() * pts.length)];
    const b = pts[Math.floor(Math.random() * pts.length)];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
