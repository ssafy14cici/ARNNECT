import * as THREE from "three";
import { useMemo } from "react";

type Props = {
  width: number;
  depth: number;
  height: number;
};

export default function CeilingDecor({ width, depth, height }: Props) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];

    // 천장에 은은한 선 패턴(랜덤 폴리라인 느낌)
    const count = 220;
    for (let i = 0; i < count; i++) {
      const x1 = (Math.random() - 0.5) * width;
      const z1 = (Math.random() - 0.5) * depth;
      const x2 = x1 + (Math.random() - 0.5) * 4.5;
      const z2 = z1 + (Math.random() - 0.5) * 4.5;

      pts.push(x1, 0, z1, x2, 0, z2);
    }

    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [width, depth]);

  return (
    <group position={[0, height - 0.02, 0]}>
      <lineSegments geometry={geom}>
        <lineBasicMaterial color="#8f8c85" transparent opacity={0.12} />
      </lineSegments>
    </group>
  );
}
