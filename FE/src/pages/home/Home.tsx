import { Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import HoverModel from "../../components/HoverModel"; // Navbar에서 쓰던 그 컴포넌트
import "../../styles/home.css";

export default function Home() {
  const navigate = useNavigate();

  // ✅ 우리 Navbar 데이터와 일치시킨 섹션 정보
  // (Close와 Logout은 제외하고 실제 이동 가능한 6개 페이지만 구성)
  const sections = useMemo(
    () => [
      { 
        key: "yourtaste", 
        label: "너의 취향은", 
        path: "/yourtaste", 
        desc: "Discover Your Taste" 
      },
      { 
        key: "search", 
        label: "Search", 
        path: "/search", 
        desc: "Find Inspiration" 
      },
      { 
        key: "feed", 
        label: "Feed", 
        path: "/feed", 
        desc: "Share Your World" 
      },
      { 
        key: "lounge", 
        label: "Lounge", 
        path: "/lounge", 
        desc: "Connect with Artists" 
      },
      { 
        key: "profile", 
        label: "Profile", 
        path: "/profile/me/feed", 
        desc: "Your Archive" 
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
          onClick={() => navigate(item.path)} // ✅ 클릭 시 해당 페이지로 이동
        >
          {/* 1. 텍스트 정보 (The-Artery 스타일) */}
          <div className="content-overlay">
            {/* 인덱스 번호 (01, 02 ...) */}
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

          {/* 2. 3D 모델 배경 (HoverModel 재사용) */}
          <div className="canvas-wrapper">
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <pointLight position={[-10, -10, -5]} color="blue" intensity={1} />
              
              <Suspense fallback={null}>
                {/* scale={2.2}: 화면에 꽉 차게 키움
                  rotation: 섹션마다 조금씩 다르게 돌려놓음 (심심하지 않게)
                */}
                <group 
                  scale={2.2} 
                  rotation={[index * 0.5, index * 0.3, 0]}
                >
                   {/* Navbar에서 쓰던 HoverModel 그대로 사용.
                      필요하다면 color prop을 넘겨서 색상을 바꿀 수도 있음.
                   */}
                   <HoverModel color={index % 2 === 0 ? "#ffffff" : "#cccccc"} />
                </group>
              </Suspense>
            </Canvas>
          </div>
          
          {/* 첫 번째 섹션에만 스크롤 유도 표시 */}
          {index === 0 && <div className="scroll-indicator">SCROLL</div>}
        </section>
      ))}
    </div>
  );
}