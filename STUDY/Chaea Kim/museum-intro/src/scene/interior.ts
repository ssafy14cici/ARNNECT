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

export function buildInterior(root: THREE.Group) {
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

  // ---------- Art slots (left/right walls + 3 front panels) ----------
  // Common art material placeholder
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

    // plane's normal points +Z (viewer direction) in the slot local space
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(cfg.maxW, cfg.maxH), artMatBase.clone());
    plane.position.set(0, 0, 0);
    plane.userData.slotId = cfg.id;

    // lift the plane slightly from the wall (avoid z-fighting)
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

    // For raycaster convenience, also store slotId at group level (clicking frame meshes)
    g.userData.slotId = cfg.id;

    root.add(g);
    artSlots.push(slot);

    // Raycaster can intersect plane or frame children; add group so it catches both.
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

  // "Front wall 3 panels" (back wall centered, 3 slots)
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
      yaw: Math.PI, // facing toward +Z (viewer standing in front)
      maxW: 3.6,
      maxH: 2.5,
    });
  }

  // ---------- Interior camera preset ----------
  function setInteriorCamera(camera: THREE.PerspectiveCamera, controls: any) {
    // Entrance-ish position: slightly above floor, looking deep into gallery.
    camera.position.set(0, 2.6, 12.8);
    controls.target.set(0, 5.0, -12.0);
  }

  return { artworks, artSlots, setInteriorCamera };
}

function makeCeilingPatternTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle line color
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;

  // Generate a "network" pattern by connecting random points to nearest neighbors
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
    // find 3 nearest neighbors
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

  // Add a few thicker primary lines
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
