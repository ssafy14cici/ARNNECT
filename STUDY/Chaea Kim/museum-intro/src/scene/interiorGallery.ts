import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type Artwork = {
  id: string;
  side: "back" | "left" | "right";
  src: string; // image url
  x: number;   // wall-local coordinate
  y: number;
};

type Options = {
  frameGlbUrl: string; // "/models/frame.glb"
  artworks: Artwork[];
  onOpen?: (art: Artwork) => void;
};

export async function createInteriorGallery(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  opts: Options
) {
  // 1) Renderer quality
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 2) Simple room (replace with your own)
  const room = new THREE.Group();
  scene.add(room);

  const roomW = 16;
  const roomH = 6;
  const roomD = 22;

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 1.0 });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
  backWall.position.set(0, roomH / 2, -roomD / 2);
  room.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
  leftWall.position.set(-roomW / 2, roomH / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  room.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
  rightWall.position.set(roomW / 2, roomH / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  room.add(rightWall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  room.add(floor);

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(5, 10, 6);
  scene.add(dir);

  // 3) Load frame glb once
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(opts.frameGlbUrl);
  const framePrefab = gltf.scene;

  // 4) Texture loader with decent defaults
  const texLoader = new THREE.TextureLoader();
  function loadArtworkTexture(url: string) {
    const tex = texLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  // 5) Spawn frames + planes
  const clickable: { mesh: THREE.Object3D; data: Artwork }[] = [];

  for (const a of opts.artworks) {
    const frame = framePrefab.clone(true);

    // frame scale tuning (you will adjust once)
    frame.scale.set(1.0, 1.0, 1.0);

    // place per wall
    const zBack = -roomD / 2 + 0.05;
    const xLeft = -roomW / 2 + 0.05;
    const xRight = roomW / 2 - 0.05;

    if (a.side === "back") {
      frame.position.set(a.x, a.y, zBack);
      frame.rotation.y = 0;
    } else if (a.side === "left") {
      // left wall faces +X
      frame.position.set(xLeft, a.y, a.x);
      frame.rotation.y = Math.PI / 2;
    } else {
      // right wall faces -X
      frame.position.set(xRight, a.y, a.x);
      frame.rotation.y = -Math.PI / 2;
    }

    // artwork plane inside frame
    const tex = loadArtworkTexture(a.src);
    const artMat = new THREE.MeshBasicMaterial({ map: tex });
    const artPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), artMat);

    // push plane slightly forward so it doesn't z-fight with frame
    artPlane.position.set(0, 0, 0.02);

    // attach (you may need to position this based on your frame model origin)
    frame.add(artPlane);

    room.add(frame);

    // click target: either plane or frame whole
    clickable.push({ mesh: artPlane, data: a });
  }

  // 6) Raycasting interaction
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: Artwork | null = null;

  function setPointerFromEvent(e: PointerEvent, dom: HTMLElement) {
    const r = dom.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  function hitTest() {
    raycaster.setFromCamera(pointer, camera);
    const targets = clickable.map((c) => c.mesh);
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits.length) return null;

    // find mapped data
    const obj = hits[0].object;
    const found = clickable.find((c) => c.mesh === obj || obj.parent === c.mesh);
    return found?.data ?? null;
  }

  const dom = renderer.domElement;

  function onMove(e: PointerEvent) {
    setPointerFromEvent(e, dom);
    const hit = hitTest();
    hovered = hit;
    dom.style.cursor = hit ? "pointer" : "";
  }

  function onClick(e: PointerEvent) {
    setPointerFromEvent(e, dom);
    const hit = hitTest();
    if (!hit) return;
    opts.onOpen?.(hit);
  }

  dom.addEventListener("pointermove", onMove, { passive: true });
  dom.addEventListener("pointerdown", onClick);

  // disposer
  return () => {
    dom.removeEventListener("pointermove", onMove);
    dom.removeEventListener("pointerdown", onClick);
    dom.style.cursor = "";
  };
}
