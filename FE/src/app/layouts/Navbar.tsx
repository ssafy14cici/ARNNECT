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
  
  // [추가] 모바일 감지 state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const navigate = useNavigate();
  const location = useLocation();
  const matches = useMatches();
  const isHome = matches.some((m) => (m.handle as any)?.navVariant === "home");
  const [isTop, setIsTop] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  // [추가] 리사이즈 이벤트 리스너
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogoutClick = () => setModalOpen(true);

  const handleConfirmLogout = () => {
    logout();
    setModalOpen(false);
    navigate("/");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

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

  // [수정] items를 모바일/PC에 따라 다른 순서로 반환
  const items: MenuItem[] = useMemo(() => {
    // 1. 공통 메뉴 아이템 정의
    const menu = {
      home: { key: "home", label: "Home", path: "/", shape: "knot" },
      pref: { key: "yourpreference", label: "너의 취향은", path: "/preference", shape: "octahedron" },
      search: { key: "search", label: "Search", path: "/search", shape: "sphere" },
      close: { key: "close", label: "", type: "close" },
      feed: { key: "feed", label: "Feed", path: "/feed", shape: "box" },
      lounge: { key: "lounge", label: "Lounge", path: "/lounge", shape: "torus" },
      profile: { key: "profile", label: "Profile", path: "/members/me/feed", shape: "sphere" },
      auth: { key: "auth", label: "Login/Out", path: "", shape: "knot" },
    };

    if (isMobile) {
      // [CASE 1] 모바일 순서 (2열 그리드 기준: Home 옆에 X 버튼)
      // Home | Close
      // Pref | Search
      // ...
      return [
        menu.home,
        menu.close, // 2번째로 이동
        menu.pref,
        menu.search,
        menu.feed,
        menu.lounge,
        menu.profile,
        menu.auth,
      ] as MenuItem[];
    }

    // [CASE 2] PC 순서 (4열 그리드 기준: 우측 상단에 X 버튼)
    // Home | Pref | Search | Close
    // Feed | Lounge | Profile | Auth
    return [
      menu.home,
      menu.pref,
      menu.search,
      menu.close, // 4번째
      menu.feed,
      menu.lounge,
      menu.profile,
      menu.auth,
    ] as MenuItem[];
  }, [isMobile]); // isMobile이 바뀔 때마다 재계산

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

  // 홈 화면이면서 모바일일 때는 헤더 숨김 (HomeMobile 자체 헤더 사용)
  const shouldHideHeader = isHome && isMobile;

  return (
    <>
      <header 
        className={headerClassName}
        style={shouldHideHeader ? { display: "none" } : undefined}
      >
        <div className="navInner">
          <button className="navBrand" type="button" onClick={() => navigate("/")}>
            ARNNECT
          </button>

          <button
            id="menu4"
            type="button"
            className={`menu-trigger ${open ? "active" : ""}`}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`refMenu ${open ? "open" : ""}`} aria-hidden={!open}>
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

      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}