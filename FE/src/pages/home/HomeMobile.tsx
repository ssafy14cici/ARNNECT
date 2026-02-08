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

  // 1) 네비바 표시/숨김 제어 (0번 페이지에서만 보임)
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

  // 2) 하단 텍스트 메뉴 위치 동기화 (메인이 움직이면 얘는 따라만 감)
  useEffect(() => {
    const menu = menuRef.current;
    if (menu) {
      // 텍스트 메뉴는 높이가 작으므로, 인덱스에 맞춰서 부드럽게 이동시킴
      const targetTop = activeIndex * menu.clientHeight;
      menu.scrollTo({
        top: targetTop,
        behavior: "smooth", 
      });
    }
  }, [activeIndex]);

  // 메인 스크롤 이벤트 핸들러 (여기가 핵심: 단순하게 현재 페이지만 계산)
  useEffect(() => {
    const snap = snapRef.current;
    if (!snap) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        // 현재 스크롤 위치를 기준으로 activeIndex 계산
        const idx = Math.round(snap.scrollTop / snap.clientHeight);
        if (idx !== activeIndex) {
          setActiveIndex(idx);
        }
        rafId = null;
      });
    };

    snap.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      snap.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeIndex]); // activeIndex가 의존성에 있어도 raf로 최적화됨

  // 메뉴 클릭 시 해당 위치로 이동
  const scrollToIndex = (idx: number) => {
    const snap = snapRef.current;
    if (!snap) return;
    // 메인 화면을 해당 섹션으로 이동 -> 위 useEffect가 감지해서 activeIndex 업데이트 -> 텍스트 메뉴도 이동
    snap.scrollTo({ top: idx * snap.clientHeight, behavior: "smooth" });
  };

  const handleMenuTrigger = () => {
    const navbarMenuBtn = document.getElementById("menu4");
    if (navbarMenuBtn) navbarMenuBtn.click();
  };

  // UI 상태 클래스
  const uiClass = activeIndex === 0 ? "ui-transition hidden-on-intro" : "ui-transition visible-on-content";
  const currentShape = sections[activeIndex]?.shape || "knot";

  return (
    <div className="mobile-wrapper">
      {/* 배경 라인 */}
      <div className={`fixed-lines ${uiClass}`} aria-hidden="true">
        <div className="line-vertical-center" />
        <div className="line-horizontal-top" />
        <div className="line-horizontal-bottom" />
      </div>

      {/* 내부 헤더 */}
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

      {/* ✅ 3D 모델 영역 (Fixed - 중앙 고정) */}
      {/* activeIndex가 0이면 CSS로 숨김(.hidden). 스크롤 상관없이 항상 중앙에 떠있음 */}
      <div className={`model-area-fixed ${activeIndex === 0 ? "hidden" : ""}`}>
        <Canvas className="homeCanvas" camera={{ position: [0, 0, 14], fov: 35 }}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <Suspense fallback={null}>
            <group rotation={[0.5, 0.5, 0]} scale={0.55}>
              <HoverModel color="#d0d0d0" shape={currentShape} />
            </group>
          </Suspense>
        </Canvas>
      </div>

      {/* ✅ 메인 스크롤 영역 (여기가 터치를 받아서 움직임) */}
      <div ref={snapRef} className="snap-container">
        {sections.map((item) => (
          <section key={item.key} className="snap-section">
            {/* 첫 화면일 때만 배경 사진 렌더링 */}
            {item.key === "intro" && (
              <div className="intro-full-bg">
                <IntroArtworkGrid count={16} onClickArtwork={(id) => navigate(`/artworks/${id}`)} />
                <div className="vignette-overlay" />
              </div>
            )}
            {/* 3D 모델은 여기 없습니다 (model-area-fixed로 분리됨) */}
          </section>
        ))}
      </div>

      {/* 하단 푸터 (텍스트 메뉴) */}
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