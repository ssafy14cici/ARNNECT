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
  
  // ✅ 스크롤 루프(서로 무한 호출) 방지용 Ref
  const syncingRef = useRef(false);

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

  // 1) 네비바 표시/숨김 로직
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

  // Navbar 햄버거 트리거
  const handleMenuTrigger = () => {
    const navbarMenuBtn = document.getElementById("menu4");
    if (navbarMenuBtn) navbarMenuBtn.click();
  };

  // 특정 인덱스로 이동 (버튼 클릭 시)
  const scrollToIndex = (idx: number) => {
    const snap = snapRef.current;
    const menu = menuRef.current;
    if (!snap || !menu) return;

    const clamped = Math.max(0, Math.min(idx, sections.length - 1));

    syncingRef.current = true; // 동기화 락 걸기
    snap.scrollTo({ top: clamped * snap.clientHeight, behavior: "auto" });
    menu.scrollTo({ top: clamped * menu.clientHeight, behavior: "auto" });
    
    // 잠시 후 락 해제
    setTimeout(() => { syncingRef.current = false; }, 100);

    setActiveIndex(clamped);
  };

  /**
   * ✅ 핵심: 양방향 스크롤 동기화 로직
   * 메인 화면을 밀면 텍스트가 따라오고, 텍스트를 밀면 메인 화면이 따라옵니다.
   */
  useEffect(() => {
    const snap = snapRef.current;
    const menu = menuRef.current;
    if (!snap || !menu) return;

    // 1. 메인(Snap) -> 메뉴(Menu) 동기화
    const handleSnapScroll = () => {
      if (syncingRef.current) return; // 락이 걸려있으면 무시
      syncingRef.current = true;      // 락 걸기

      // 메인 스크롤 비율 계산
      const ratio = snap.scrollTop / (snap.scrollHeight - snap.clientHeight);
      // 메뉴 스크롤 위치 적용
      if (menu.scrollHeight > menu.clientHeight) {
         menu.scrollTop = ratio * (menu.scrollHeight - menu.clientHeight);
      }

      // 인덱스 업데이트
      const idx = Math.round(snap.scrollTop / snap.clientHeight);
      if (idx !== activeIndex) setActiveIndex(idx);

      syncingRef.current = false;     // 락 해제
    };

    // 2. 메뉴(Menu) -> 메인(Snap) 동기화
    const handleMenuScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      // 메뉴 스크롤 비율 계산
      const ratio = menu.scrollTop / (menu.scrollHeight - menu.clientHeight);
      // 메인 스크롤 위치 적용
      if (snap.scrollHeight > snap.clientHeight) {
        snap.scrollTop = ratio * (snap.scrollHeight - snap.clientHeight);
      }

      // (선택) 메뉴 스크롤 시에도 인덱스 업데이트
      // const idx = Math.round(snap.scrollTop / snap.clientHeight);
      // if (idx !== activeIndex) setActiveIndex(idx);

      syncingRef.current = false;
    };

    snap.addEventListener("scroll", handleSnapScroll, { passive: true });
    menu.addEventListener("scroll", handleMenuScroll, { passive: true });

    return () => {
      snap.removeEventListener("scroll", handleSnapScroll);
      menu.removeEventListener("scroll", handleMenuScroll);
    };
  }, [activeIndex, sections.length]); // 의존성

  const uiClass = activeIndex === 0 ? "ui-transition hidden-on-intro" : "ui-transition visible-on-content";

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

      {/* 메인 스크롤 영역 */}
      <div ref={snapRef} className="snap-container">
        {sections.map((item, i) => (
          <section key={item.key} className="snap-section">
            
            {/* 첫 화면 전용: 배경 사진 꽉 채우기 */}
            {item.key === "intro" && (
              <div className="intro-full-bg">
                <IntroArtworkGrid count={16} onClickArtwork={(id) => navigate(`/artworks/${id}`)} />
                <div className="vignette-overlay" />
              </div>
            )}

            {/* 3D 모델 영역 (첫 화면 제외) */}
            <div className="model-area">
              <Canvas className="homeCanvas" camera={{ position: [0, 0, 14], fov: 35 }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <Suspense fallback={null}>
                  <group rotation={[0.5, 0.5, 0]} scale={0.55}>
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

      {/* 하단 푸터 (메뉴 포함) */}
      <footer className={`fixed-footer ${uiClass}`}>
        <div className="footer-left">
          <div className="scroll-content">
            <span className="scroll-text">SCROLL</span>
            <div className="scroll-line" />
          </div>
        </div>

        <div className="footer-right">
          {/* 하단 메뉴 스크롤러 */}
          <div ref={menuRef} className="menu-scroller">
            {sections.map((item, idx) => (
              <div
                key={item.key}
                className={`menu-item ${idx === activeIndex ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // 활성 상태면 메뉴 열기, 아니면 이동
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