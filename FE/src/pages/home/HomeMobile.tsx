import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";

import HoverModel from "../../shared/ui/three/HoverModel";
import IntroArtworkGrid from "./IntroArtworkGrid";
import "./homemobile.css";

type ShapeType = "knot" | "sphere" | "box" | "octahedron" | "torus";

type Section = {
  key: string;
  index: string;
  label: string;
  sub: string;
  path: string | null;
  shape: ShapeType;
};

export default function HomeMobile() {
  const navigate = useNavigate();

  const snapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const sections: Section[] = useMemo(
    () => [
      { key: "intro", index: "00", label: "ANNECT", sub: "HERITAGE", path: null, shape: "knot" },
      { key: "preference", index: "01", label: "Your Taste", sub: "Discover", path: "/preference", shape: "octahedron" },
      { key: "search", index: "02", label: "Search", sub: "Inspiration", path: "/search", shape: "sphere" },
      { key: "feed", index: "03", label: "Feed", sub: "Share World", path: "/feed", shape: "box" },
      { key: "lounge", index: "04", label: "Lounge", sub: "Connect", path: "/lounge", shape: "torus" },
      { key: "profile", index: "05", label: "Archive", sub: "Profile", path: "/members/me", shape: "sphere" },
    ],
    []
  );

  // ✅ 1) 네비바 표시/숨김 로직
  // activeIndex === 0 이면 네비바 표시, 1 이상이면 숨김
  useEffect(() => {
    const commonNavbar = document.querySelector(".nav") as HTMLElement;
    if (commonNavbar) {
      if (activeIndex === 0) {
        commonNavbar.style.opacity = "1";
        commonNavbar.style.pointerEvents = "auto";
        commonNavbar.style.transition = "opacity 0.4s ease";
      } else {
        commonNavbar.style.opacity = "0";
        commonNavbar.style.pointerEvents = "none";
      }
    }
  }, [activeIndex]);

  // Navbar의 햄버거 메뉴 트리거
  const handleMenuTrigger = () => {
    const navbarMenuBtn = document.getElementById("menu4");
    if (navbarMenuBtn) navbarMenuBtn.click();
  };

  const scrollToIndex = (idx: number) => {
    const snap = snapRef.current;
    const menu = menuRef.current;
    if (!snap || !menu) return;

    const clamped = Math.max(0, Math.min(idx, sections.length - 1));

    syncingRef.current = true;
    snap.scrollTo({ top: clamped * snap.clientHeight, behavior: "auto" });
    menu.scrollTo({ top: clamped * menu.clientHeight, behavior: "auto" });
    syncingRef.current = false;

    setActiveIndex(clamped);
  };

  useEffect(() => {
    const snap = snapRef.current;
    if (!snap) return;

    const handleScroll = () => {
      if (syncingRef.current) return;
      if (rafRef.current != null) return;
      
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        // 스크롤 위치에 따른 인덱스 계산
        const idx = Math.round(snap.scrollTop / snap.clientHeight);
        if (idx !== activeIndex) setActiveIndex(idx);
      });
    };

    snap.addEventListener("scroll", handleScroll, { passive: true });
    return () => snap.removeEventListener("scroll", handleScroll);
  }, [activeIndex]);

  // UI 클래스: 0번 화면이면 하단 숨김(hidden-on-intro), 1번 이상이면 표시(visible-on-content)
  const uiClass = activeIndex === 0 ? "ui-transition hidden-on-intro" : "ui-transition visible-on-content";

  return (
    <div className="mobile-wrapper">
      {/* 배경 라인 (첫 화면에선 숨김) */}
      <div className={`fixed-lines ${uiClass}`} aria-hidden="true">
        <div className="line-vertical-center" />
        <div className="line-horizontal-top" />
        <div className="line-horizontal-bottom" />
      </div>

      {/* 내부 헤더 (첫 화면에선 숨김) */}
      <header className={`fixed-header ${uiClass}`}>
        <div className="header-left" onClick={() => navigate("/feed")}>
          <div className="logo-box">
            <span>THE<br />ANNECT</span>
          </div>
        </div>
        <div className="header-right" onClick={handleMenuTrigger}>
          <div className="hamburger" />
        </div>
      </header>

      {/* 메인 스크롤 영역 */}
      <div ref={snapRef} className="snap-container">
        {sections.map((item, i) => (
          <section key={item.key} className="snap-section">
            
            {/* ✅ 첫 화면 전용: 배경 사진 꽉 채우기 */}
            {item.key === "intro" && (
              <div className="intro-full-bg">
                <IntroArtworkGrid count={16} onClickArtwork={(id) => navigate(`/artworks/${id}`)} />
                <div className="vignette-overlay" />
              </div>
            )}

            {/* ✅ 3D 모델 영역: 첫 화면(i===0)에서는 렌더링하지 않음 */}
            <div className="model-area">
              <Canvas className="homeCanvas" camera={{ position: [0, 0, 14], fov: 35 }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <Suspense fallback={null}>
                  <group rotation={[0.5, 0.5, 0]} scale={0.55}>
                    {/* 👇 여기서 i !== 0 조건으로 첫 화면 3D 제거 */}
                    {i !== 0 && (
                      <HoverModel color="#d0d0d0" shape={item.shape} />
                    )}
                  </group>
                </Suspense>
              </Canvas>
            </div>
          </section>
        ))}
      </div>

      {/* 하단 푸터 (첫 화면에선 숨김) */}
      <footer className={`fixed-footer ${uiClass}`}>
        <div className="footer-left">
          <div className="scroll-content">
            <span className="scroll-text">SCROLL</span>
            <div className="scroll-line" />
          </div>
        </div>

        <div className="footer-right">
          <div ref={menuRef} className="menu-scroller">
            {sections.map((item, idx) => (
              <div
                key={item.key}
                className={`menu-item ${idx === activeIndex ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (idx === activeIndex) handleMenuTrigger();
                  else scrollToIndex(idx);
                }}
              >
                <span className="index-text">{item.index}</span>
                <h2 className="main-title">{item.label}</h2>
                <div className="arrow-down">↓</div>
              </div>
            ))}
          </div>
          <button className="menu-enter" onClick={() => sections[activeIndex].path && navigate(sections[activeIndex].path!)}>
            ENTER
          </button>
        </div>
      </footer>
    </div>
  );
}