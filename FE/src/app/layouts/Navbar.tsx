// FE/src/components/layout/Navbar.tsx
import { useEffect, useMemo, useState, Suspense } from "react";
import { useNavigate, useLocation, useMatches } from "react-router-dom";
import { Canvas } from "@react-three/fiber";

import { useAuthStore } from "../../features/auth/store";
import HoverModel from "../../shared/ui/three/HoverModel";
import LogoutModal from "../../shared/ui/modals/LogoutModal";
import "../../styles/navbar.css";

type ShapeType = "knot" | "sphere" | "box" | "octahedron" | "torus";

type MenuItem = {
  key: string;
  label: string;
  type?: "link" | "close";
  path?: string;
  shape?: ShapeType;
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const navigate = useNavigate();
  const location = useLocation();
  const matches = useMatches();

  // ✅ 홈 판별: handle.navVariant가 없을 수도 있으니 pathname도 같이 fallback
  const isHome =
    location.pathname === "/" ||
    matches.some((m) => (m.handle as any)?.navVariant === "home");

  const [isTop, setIsTop] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  // ✅ 홈에서는 open이 true여도 오버레이/바디락이 절대 걸리지 않게
  const effectiveOpen = open && !isHome;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ 라우트 바뀌면(특히 홈으로 갈 때) 열린 메뉴/hover 상태 정리
  useEffect(() => {
    setOpen(false);
    setHoveredKey(null);
  }, [location.pathname]);

  const handleLogoutClick = () => {
    // ✅ 메뉴를 먼저 닫아 body lock/overlay 잔존 방지
    setOpen(false);
    setHoveredKey(null);
    setModalOpen(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setOpen(false);
    setHoveredKey(null);
    setModalOpen(false);
    navigate("/");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    if (effectiveOpen) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
      document.body.classList.add("nav-menu-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("nav-menu-open");
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      document.body.classList.remove("nav-menu-open");
    };
  }, [effectiveOpen]);

  useEffect(() => {
    if (!isHome) {
      setIsTop(false);
      return;
    }
    const onScroll = () => {
      setIsTop(window.scrollY <= 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const items: MenuItem[] = useMemo(
    () => [
      { key: "home", label: "Home", path: "/", shape: "knot" },
      { key: "close", label: "", type: "close" },
      { key: "yourpreference", label: "너의 취향은", path: "/preference", shape: "octahedron" },
      { key: "search", label: "Search", path: "/search", shape: "sphere" },
      { key: "feed", label: "Feed", path: "/feed", shape: "box" },
      { key: "lounge", label: "Lounge", path: "/lounge", shape: "torus" },
      { key: "profile", label: "Profile", path: "/members/me/feed", shape: "sphere" },
      { key: "auth", label: "Login/Out", path: "", shape: "knot" },
    ],
    [],
  );

  const handleItemClick = (item: MenuItem) => {
    if (item.type === "close") {
      setOpen(false);
      return;
    }

    if (item.key === "auth") {
      if (!isLoggedIn) {
        navigate("/login", { state: { from: location.pathname } });
        setOpen(false);
      } else {
        setOpen(false);
        setHoveredKey(null);
        handleLogoutClick();
      }
      return;
    }

    if (item.path) {
      navigate(item.path);
      setOpen(false);
    }
  };

  const headerClassName = [
    "nav",
    isHome ? "nav--home" : "nav--solid",
    isHome && isTop ? "nav--transparent" : "nav--elevated",
  ]
    .filter(Boolean)
    .join(" ");

  // ✅ 핵심: 홈에서는 Navbar 자체를 렌더링하지 않음
  if (isHome) return null;

  return (
    <>
      <header className={headerClassName}>
        <div className="navInner">
          <button className="navBrand" type="button" onClick={() => navigate(isLoggedIn ? "/hall" : "/")}>
            ARNNECT
          </button>

          <button
            id="menu4"
            type="button"
            className={`menu-trigger ${effectiveOpen ? "active" : ""}`}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`refMenu ${effectiveOpen ? "open" : ""}`} aria-hidden={!effectiveOpen}>
        <div className="refMenuGrid">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className="refCell"
              onClick={() => handleItemClick(it)}
              onMouseEnter={() => setHoveredKey(it.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {it.type === "close" ? (
                <div className="refCellClose" aria-label="Close Menu" />
              ) : (
                <>
                  <span className="refLabel">
                    {it.key === "auth" ? (isLoggedIn ? "LOGOUT" : "LOGIN") : it.label}
                  </span>

                  {hoveredKey === it.key && (
                    <div className="ref3DWrapper">
                      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                        <Suspense fallback={null}>
                          <HoverModel color="#ffffff" shape={it.shape} />
                        </Suspense>
                      </Canvas>
                    </div>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <LogoutModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirmLogout} />
    </>
  );
}
