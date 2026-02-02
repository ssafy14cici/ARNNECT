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
      { key: "intro", index: "00", label: "ANNECT", sub: "HERITAGE", path: null, shape: "knot" as ShapeType },
      { key: "preference", index: "01", label: "Your Taste", sub: "Discover", path: "/preference", shape: "octahedron" as ShapeType },
      { key: "search", index: "02", label: "Search", sub: "Inspiration", path: "/search", shape: "sphere" as ShapeType },
      { key: "feed", index: "03", label: "Feed", sub: "Share World", path: "/feed", shape: "box" as ShapeType },
      { key: "lounge", index: "04", label: "Lounge", sub: "Connect", path: "/lounge", shape: "torus" as ShapeType },
      { key: "profile", index: "05", label: "Archive", sub: "Profile", path: "/profile/me/feed", shape: "sphere" as ShapeType },
    ],
    []
  );

  // [핵심] 기존 Navbar의 햄버거 버튼(id="menu4")을 강제로 클릭하게 만듭니다.
  const handleMenuTrigger = () => {
    const navbarMenuBtn = document.getElementById("menu4");
    if (navbarMenuBtn) {
      navbarMenuBtn.click();
    } else {
      console.warn("Navbar menu button (#menu4) not found.");
    }
  };

  return (
    <div className="mobile-wrapper">
      {/* [1. 배경 라인 레이어 (Fixed)] */}
      <div className="fixed-lines">
        <div className="line-vertical-center"></div>
        <div className="line-horizontal-top"></div>
        <div className="line-horizontal-bottom"></div>
      </div>

      {/* [2. 고정 헤더 (Top 25% 영역)] */}
      <header className="fixed-header">
        {/* 로고 (왼쪽) - 클릭 시 /feed 이동 */}
        <div 
          className="header-left" 
          onClick={() => navigate('/feed')} 
          style={{ cursor: 'pointer' }}
        >
          <div className="logo-box">
            <span>THE<br/>ANNECT</span>
          </div>
        </div>

        {/* 메뉴 (오른쪽) - 클릭 시 기존 Navbar의 메뉴 열기 */}
        <div 
          className="header-right" 
          onClick={handleMenuTrigger} // 여기서 Navbar와 연결
          style={{ cursor: 'pointer' }}
        >
          <div className="hamburger"></div>
        </div>
      </header>

      {/* [3. 스크롤 컨텐츠] */}
      <div className="snap-container">
        {sections.map((item, i) => (
          <section 
            key={item.key} 
            className="snap-section"
            onClick={() => item.path && navigate(item.path)}
          >
            <div className="model-area">
              <Canvas camera={{ position: [0, 0, 14], fov: 35 }} dpr={[1, 2]}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />
                <Suspense fallback={null}>
                  <group rotation={[0.5, 0.5, 0]} scale={0.55}>
                    <HoverModel 
                      color={i === 0 ? "#ffffff" : "#d0d0d0"} 
                      shape={item.shape} 
                    />
                  </group>
                </Suspense>
              </Canvas>
            </div>

            <div className="info-area">
               <div className="info-left">
                  <div className="scroll-content">
                    <span className="scroll-text">SCROLL</span>
                    <div className="scroll-line"></div>
                  </div>
               </div>

               <div className="info-right">
                  <span className="index-text">{item.index}</span>
                  <h2 className="main-title">{item.label}</h2>
                  <div className="arrow-down">↓</div>
               </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}