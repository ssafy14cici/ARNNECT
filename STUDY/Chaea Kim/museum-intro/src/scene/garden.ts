import * as THREE from "three";

/**
 * 외부 씬에 "사방 전체 조경"을 깔아주는 모듈.
 * - 다른 프로젝트에서 그대로 addGarden(exterior)만 하면 재사용 가능.
 */
export function addGarden(exterior: THREE.Group) {
  const garden = new THREE.Group();
  garden.name = "Garden";
  exterior.add(garden);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({
      color: "#b7c99b",
      roughness: 0.95,
      metalness: 0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  garden.add(ground);

  // Paths
  const pathMat = new THREE.MeshStandardMaterial({ color: "#b7aa9d", roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: "#8f8377", roughness: 0.9 });

  const addPath = (x: number, z: number, w: number, l: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, l), pathMat);
    base.position.y = 0.02;
    g.add(base);

    const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, l), curbMat);
    curbL.position.set(-w / 2 - 0.08, 0.03, 0);
    g.add(curbL);

    const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, l), curbMat);
    curbR.position.set(w / 2 + 0.08, 0.03, 0);
    g.add(curbR);

    garden.add(g);
  };

  // Cross + Outer ring 느낌
  addPath(0, 0, 4, 240, 0);
  addPath(0, 0, 4, 240, Math.PI / 2);

  addPath(0, 140, 3, 300, 0);
  addPath(0, -140, 3, 300, 0);
  addPath(140, 0, 3, 300, Math.PI / 2);
  addPath(-140, 0, 3, 300, Math.PI / 2);

  // Trees (instanced)
  const treeCount = 260;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.2, 8);
  const leafGeo = new THREE.SphereGeometry(0.9, 8, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#5d4e37", roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: "#3e7d3f", roughness: 0.9 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeCount);

  const dummy = new THREE.Object3D();

  let i = 0;
  while (i < treeCount) {
    const r = 240 + Math.random() * 170; // 외곽 위주
    const ang = Math.random() * Math.PI * 2;
    const x = Math.cos(ang) * r + (Math.random() - 0.5) * 30;
    const z = Math.sin(ang) * r + (Math.random() - 0.5) * 30;

    // 중앙(박물관 주변)은 비우기
    if (Math.abs(x) < 70 && Math.abs(z) < 70) continue;

    const s = 0.85 + Math.random() * 0.8;

    dummy.position.set(x, 1.1, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, 2.4 * s, z);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);

    i++;
  }

  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  garden.add(trunks, leaves);

  // Lamps (simple)
  for (let k = 0; k < 12; k++) {
    const p = new THREE.Group();
    const t = (k / 12) * Math.PI * 2;
    const rad = 105;
    p.position.set(Math.cos(t) * rad, 0, Math.sin(t) * rad);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: "#2c2c2c", roughness: 0.7 })
    );
    pole.position.y = 1.7;
    p.add(pole);

    const bulb = new THREE.PointLight(0xfff2d2, 0.55, 18, 2);
    bulb.position.set(0, 3.0, 0);
    p.add(bulb);

    garden.add(p);
  }

  return garden;
}
