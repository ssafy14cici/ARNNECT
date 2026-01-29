loader.load(
  opts.glbUrl,
  (gltf) => {
    const root = gltf.scene;
    scene.add(root);

    // 바닥 판정용: 메시들 수집
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) meshes.push(m);
    });

    // 중심/크기
    const box = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // ✅ "위에서 아래로" 쏴서 바닥 찾기 (건물 내부 중심 근처)
    const top = new THREE.Vector3(center.x, box.max.y + Math.max(10, size.y * 0.2), center.z);
    const ray = new THREE.Raycaster(top, new THREE.Vector3(0, -1, 0), 0, size.y * 3 + 100);
    const hits = ray.intersectObjects(meshes, true);

    // 기본 eye 높이
    const EYE = 1.6;

    if (hits.length > 0) {
      // 가장 위에서 쏜 레이의 첫 히트가 "바닥/무언가 표면"이 됨
      const p = hits[0].point;

      // ✅ 그 지점 위로 스폰
      camera.position.set(p.x, p.y + EYE, p.z);

      // 내부를 바라보게
      camera.lookAt(center.x, p.y + EYE, center.z);
    } else {
      // fallback: bbox 기반
      const maxDim = Math.max(size.x, size.y, size.z) || 20;
      camera.position.set(center.x, center.y + EYE, center.z + maxDim * 0.15);
      camera.lookAt(center);
    }

    console.log("[spawn] center", center, "box", box);
  },
  undefined,
  (err) => console.error("[viewer] GLB load failed:", err)
);
