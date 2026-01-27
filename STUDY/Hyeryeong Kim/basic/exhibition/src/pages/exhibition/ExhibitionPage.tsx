import { Canvas } from "@react-three/fiber";
import { Environment, Loader } from "@react-three/drei";
import { Suspense, useState } from "react";
import GalleryScene from "./scene/GalleryScene";
import "./exhibition.css";

export default function ExhibitionPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="exRoot">
      <Canvas
        className="exCanvas"
        dpr={[1, 2]}
        camera={{ fov: 55, position: [-7.5, 1.6, -18], near: 0.1, far: 300 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#f7f6f2"]} />
        <fog attach="fog" args={["#f7f6f2", 40, 220]} />

        <ambientLight intensity={0.65} />
        <directionalLight position={[18, 30, 10]} intensity={1.1} />
        <directionalLight position={[-18, 18, -10]} intensity={0.35} />

        <Suspense fallback={null}>
          <GalleryScene selectedId={selectedId} onSelect={setSelectedId} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="exHud">
        <button
          className="exBack"
          onClick={() => setSelectedId(null)}
          disabled={!selectedId}
        >
          돌아가기
        </button>

        <div className="exCaption">
          <div className="exTitle">EXHIBITION</div>
          <div className="exSub">작품 클릭 → 확대 / 돌아가기 → 원위치</div>
        </div>
      </div>

      <Loader />
    </div>
  );
}
