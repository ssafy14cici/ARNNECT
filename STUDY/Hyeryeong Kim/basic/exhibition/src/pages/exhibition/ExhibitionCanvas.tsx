import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import GalleryScene, { type ArtworkLite } from "./scene/GalleryScene";
import Overlay from "./ui/Overlay";

export default function ExhibitionCanvas() {
  // TODO: 실제론 여기서 API로 받아서 넣으면 됨
  const artworks = useMemo<ArtworkLite[]>(
    () => [
      { id: "1", imageUrl: "/demo/1.jpg", title: "A" },
      { id: "2", imageUrl: "/demo/2.jpg", title: "B" },
      { id: "3", imageUrl: "/demo/3.jpg", title: "C" },
      { id: "4", imageUrl: "/demo/4.jpg", title: "D" },
      { id: "5", imageUrl: "/demo/5.jpg", title: "E" },
      { id: "6", imageUrl: "/demo/6.jpg", title: "F" },
      { id: "7", imageUrl: "/demo/7.jpg", title: "G" },
      { id: "8", imageUrl: "/demo/8.jpg", title: "H" },
      { id: "9", imageUrl: "/demo/9.jpg", title: "I" },
      { id: "10", imageUrl: "/demo/10.jpg", title: "J" },
      { id: "11", imageUrl: "/demo/11.jpg", title: "K" },
      { id: "12", imageUrl: "/demo/12.jpg", title: "L" },
    ],
    []
  );

  const [canGoBack, setCanGoBack] = useState(false);
  const [onBack, setOnBack] = useState<null | (() => void)>(null);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ fov: 55, near: 0.05, far: 500 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#f7f7f6"]} />
        <Suspense fallback={null}>
          <GalleryScene
            glbUrl="/models/hall_v1.glb"
            artworks={artworks}
            onCanGoBackChange={setCanGoBack}
            onBackReady={setOnBack}
          />
          <Preload all />
        </Suspense>
      </Canvas>

      <Overlay
        canGoBack={canGoBack}
        onBack={() => onBack?.()}
      />
    </div>
  );
}
