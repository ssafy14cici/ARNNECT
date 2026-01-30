// FE/src/pages/home/Home.tsx
import { Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import HoverModel from "../../components/HoverModel"; 
import "../../styles/home.css";

// Shape 타입 임포트 혹은 재정의 (Navbar와 동일하게 맞춤)
type ShapeType = "knot" | "sphere" | "box" | "octahedron" | "torus";

export default function Home() {
  const navigate = useNavigate();

  // ✅ 섹션 정보 (Navbar와 일관성 유지 + Shape 추가)
  const sections = useMemo(
    () => [
      { 
        key: "preference", 
        label: "너의 취향은", 
        path: "/preference", 
        desc: "Discover Your Preference",
        shape: "octahedron" as ShapeType
      },
      { 
        key: "search", 
        label: "Search", 
        path: "/search", 
        desc: "Find Inspiration",
        shape: "sphere" as ShapeType
      },
      { 
        key: "feed", 
        label: "Feed", 
        path: "/feed", 
        desc: "Share Your World",
        shape: "box" as ShapeType
      },
      { 
        key: "lounge", 
        label: "Lounge", 
        path: "/lounge", 
        desc: "Connect with Artists",
        shape: "torus" as ShapeType
      },
      { 
        key: "profile", 
        label: "Profile", 
        path: "/profile/me/feed", 
        desc: "Your Archive",
        shape: "sphere" as ShapeType // Profile은 sphere 재사용
      },
    ],
    []
  );

  return (
    <div className="snap-container">
      {sections.map((item, index) => (
        <section 
          key={item.key} 
          className="snap-section"
          onClick={() => navigate(item.path)}
        >
          {/* 1. 텍스트 정보 */}
          <div className="content-overlay">
            <div className="index-number">
              {(index + 1).toString().padStart(2, "0")}
            </div>
            
            <div className="title-group">
              <h2 className="main-title">{item.label}</h2>
              <p className="sub-desc">{item.desc}</p>
              
              <div className="explore-btn">
                EXPLORE <span className="arrow">→</span>
              </div>
            </div>
          </div>

          {/* 2. 3D 모델 배경 */}
          <div className="canvas-wrapper">
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <pointLight position={[-10, -10, -5]} color="blue" intensity={1} />
              
              <Suspense fallback={null}>
                {/* scale: 화면 꽉 차게 
                  rotation: 섹션마다 조금씩 다르게 회전
                */}
                <group 
                  scale={2.2} 
                  rotation={[index * 0.5, index * 0.3, 0]}
                >
                   {/* ✅ 여기서도 shape 전달해서 섹션마다 다른 모양 보여주기 */}
                   <HoverModel 
                     color={index % 2 === 0 ? "#ffffff" : "#e0e0e0"} 
                     shape={item.shape}
                   />
                </group>
              </Suspense>
            </Canvas>
          </div>
          
          {/* 첫 번째 섹션 스크롤 유도 */}
          {index === 0 && <div className="scroll-indicator">SCROLL</div>}
        </section>
      ))}
    </div>
  );
}