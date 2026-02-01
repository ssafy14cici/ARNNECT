// FE/src/pages/home/HomeMobile.tsx
import { Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import HoverModel from "../../shared/ui/three/HoverModel";
import "./homemobile.css";

type ShapeType = "knot" | "sphere" | "box" | "octahedron" | "torus";

export default function HomeMobile() {
  const navigate = useNavigate();

  const sections = useMemo(
    () => [
      { key: "preference", label: "너의 취향은", path: "/preference", desc: "Discover Your Preference", shape: "octahedron" as ShapeType },
      { key: "search", label: "Search", path: "/search", desc: "Find Inspiration", shape: "sphere" as ShapeType },
      { key: "feed", label: "Feed", path: "/feed", desc: "Share Your World", shape: "box" as ShapeType },
      { key: "lounge", label: "Lounge", path: "/lounge", desc: "Connect with Artists", shape: "torus" as ShapeType },
      { key: "profile", label: "Profile", path: "/profile/me/feed", desc: "Your Archive", shape: "sphere" as ShapeType },
    ],
    []
  );

  return (
    <div className="mobile-snap-container">
      {sections.map((item, index) => (
        <section
          key={item.key}
          className="mobile-section"
          onClick={() => navigate(item.path)}
        >
          {/* 1. 3D 배경 (상단 배치) */}
          <div className="mobile-canvas-wrapper">
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.7} />
              <pointLight position={[10, 10, 10]} intensity={1.5} />
              <Suspense fallback={null}>
                <group scale={1.7} rotation={[index * 0.7, 0, 0]}>
                  <HoverModel
                    color={index % 2 === 0 ? "#ffffff" : "#cccccc"}
                    shape={item.shape}
                  />
                </group>
              </Suspense>
            </Canvas>
          </div>

          {/* 2. 텍스트 정보 (하단 고정) */}
          <div className="mobile-info-overlay">
            <div className="m-index">{(index + 1).toString().padStart(2, "0")}</div>
            <h2 className="m-title">{item.label}</h2>
            <p className="m-desc">{item.desc}</p>
            <div className="m-explore-tag">EXPLORE →</div>
          </div>

          {index === 0 && <div className="m-scroll-indicator">SCROLL</div>}
        </section>
      ))}
    </div>
  );
}