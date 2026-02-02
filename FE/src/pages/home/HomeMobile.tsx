import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";

import HoverModel from "../../shared/ui/three/HoverModel";
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

  // 스크롤 동기화 루프 방지
  const syncingRef = useRef(false);
  // 스크롤 이벤트 rAF 스로틀
  const rafRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const sections: Section[] = useMemo(
    () => [
      { key: "intro", index: "00", label: "ANNECT", sub: "HERITAGE", path: null, shape: "knot" },
      { key: "preference", index: "01", label: "Your Taste", sub: "Discover", path: "/preference", shape: "octahedron" },
      { key: "search", index: "02", label: "Search", sub: "Inspiration", path: "/search", shape: "sphere" },
      { key: "feed", index: "03", label: "Feed", sub: "Share World", path: "/feed", shape: "box" },
      { key: "lounge", index: "04", label: "Lounge", sub: "Connect", path: "/lounge", shape: "torus" },
      // ✅ routes.tsx(B안) 기준: /members/me (index가 feed로 리다이렉트)
      { key: "profile", index: "05", label: "Archive", sub: "Profile", path: "/members/me", shape: "sphere" },
    ],
    []
  );

  // 기존 Navbar 햄버거(id="menu4") 트리거
  const handleMenuTrigger = () => {
    const navbarMenuBtn = document.getElementById("menu4");
    if (navbarMenuBtn) navbarMenuBtn.click();
    else console.warn("Navbar menu button (#menu4) not found.");
  };

  const scrollToIndex = (idx: number) => {
    const snap = snapRef.current;
    const menu = menuRef.current;
    if (!snap || !menu) return;

    const clamped = Math.max(0, Math.min(idx, sections.length - 1));

    // 메인 스크롤은 섹션 단위(100dvh) 스냅이므로 clientHeight 기준
    const topSnap = clamped * snap.clientHeight;

    // 메뉴는 하단 25% 영역이므로 clientHeight 기준
    const topMenu = clamped * menu.clientHeight;

    syncingRef.current = true;
    snap.scrollTo({ top: topSnap, behavior: "auto" });
    menu.scrollTo({ top: topMenu, behavior: "auto" });
    syncingRef.current = false;

    setActiveIndex(clamped);
  };

  /**
   * ✅ 핵심 1) 메인(snap) 스크롤 → 메뉴(menu) 스크롤을 "실시간 비율 매핑"으로 동기화
   */
  useEffect(() => {
    const snap = snapRef.current;
    const menu = menuRef.current;
    if (!snap || !menu) return;

    const syncMenuFromSnap = () => {
      if (syncingRef.current) return;

      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;

        const snapMax = snap.scrollHeight - snap.clientHeight;
        const menuMax = menu.scrollHeight - menu.clientHeight;
        if (snapMax <= 0 || menuMax <= 0) return;

        // 비율 매핑
        const ratio = menuMax / snapMax;

        syncingRef.current = true;
        menu.scrollTop = snap.scrollTop * ratio;
        syncingRef.current = false;

        // activeIndex는 snap 위치로 계산(한 박자 늦는 IO 제거)
        const idx = Math.round(snap.scrollTop / Math.max(1, snap.clientHeight));
        setActiveIndex(Math.max(0, Math.min(idx, sections.length - 1)));
      });
    };

    snap.addEventListener("scroll", syncMenuFromSnap, { passive: true });
    // 초기 동기화 1회
    syncMenuFromSnap();

    return () => {
      snap.removeEventListener("scroll", syncMenuFromSnap);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [sections.length]);

  /**
   * ✅ 핵심 2) 메뉴(menu) 스크롤 → 메인(snap)도 같은 비율로 따라가게(선택)
   * - 사용자가 오른쪽 하단 메뉴를 직접 스크롤할 때도 메인이 같이 움직임
   */
  useEffect(() => {
    const snap = snapRef.current;
    const menu = menuRef.current;
    if (!snap || !menu) return;

    const syncSnapFromMenu = () => {
      if (syncingRef.current) return;

      const snapMax = snap.scrollHeight - snap.clientHeight;
      const menuMax = menu.scrollHeight - menu.clientHeight;
      if (snapMax <= 0 || menuMax <= 0) return;

      const ratio = snapMax / menuMax;

      syncingRef.current = true;
      snap.scrollTop = menu.scrollTop * ratio;
      syncingRef.current = false;

      const idx = Math.round(menu.scrollTop / Math.max(1, menu.clientHeight));
      setActiveIndex(Math.max(0, Math.min(idx, sections.length - 1)));
    };

    menu.addEventListener("scroll", syncSnapFromMenu, { passive: true });
    return () => menu.removeEventListener("scroll", syncSnapFromMenu);
  }, [sections.length]);

  /**
   * 리사이즈 시에도 현재 activeIndex 기준으로 정렬(튐 방지)
   */
  useEffect(() => {
    const onResize = () => {
      scrollToIndex(activeIndex);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div className="mobile-wrapper">
      {/* 1) Fixed background lines */}
      <div className="fixed-lines" aria-hidden="true">
        <div className="line-vertical-center" />
        <div className="line-horizontal-top" />
        <div className="line-horizontal-bottom" />
      </div>

      {/* 2) Fixed header (Top 25%) */}
      <header className="fixed-header">
        <div
          className="header-left"
          onClick={() => navigate("/feed")}
          style={{ cursor: "pointer" }}
        >
          <div className="logo-box">
            <span>
              THE
              <br />
              ANNECT
            </span>
          </div>
        </div>

        <div
          className="header-right"
          onClick={handleMenuTrigger}
          style={{ cursor: "pointer" }}
        >
          <div className="hamburger" />
        </div>
      </header>

      {/* 3) Main snap scroll (full screen pages) */}
      <div ref={snapRef} className="snap-container">
        {sections.map((item, i) => (
          <section
            key={item.key}
            className="snap-section"
            // 섹션 클릭 시 이동(00은 null)
            onClick={() => item.path && navigate(item.path)}
          >
            {/* 3D middle area (25% ~ 75%) */}
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
          </section>
        ))}
      </div>

      {/* 4) Fixed footer (Bottom 25%) */}
      <footer className="fixed-footer">
        {/* Left bottom: 고정(스크롤 동참 X) */}
        <div className="footer-left" aria-hidden="true">
          <div className="scroll-content">
            <span className="scroll-text">SCROLL</span>
            <div className="scroll-line" />
          </div>
        </div>

        {/* Right bottom: 자체 스크롤(하지만 메인과 같은 속도로 동기화) */}
        <div className="footer-right">
          <div ref={menuRef} className="menu-scroller">
            {sections.map((item, idx) => (
              <div
                key={item.key}
                className={`menu-item ${idx === activeIndex ? "active" : ""}`}
                onClick={(e) => {
                  // 메뉴 클릭은 스크롤 이동(필요하면 path 이동도 가능)
                  e.stopPropagation();
                  scrollToIndex(idx);
                }}
                role="button"
                tabIndex={0}
              >
                <span className="index-text">{item.index}</span>
                <h2 className="main-title">{item.label}</h2>
                <div className="arrow-down">↓</div>
              </div>
            ))}
          </div>

          {/* 선택: active 섹션을 눌렀을 때 실제 페이지 이동을 원하면 아래 버튼 같은 UX로 */}
          <button
            type="button"
            className="menu-enter"
            onClick={(e) => {
              e.stopPropagation();
              const target = sections[activeIndex]?.path;
              if (target) navigate(target);
            }}
          >
            ENTER
          </button>
        </div>
      </footer>
    </div>
  );
}
