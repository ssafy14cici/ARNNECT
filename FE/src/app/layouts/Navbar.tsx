// FE/src/layouts/Navbar.tsx
import { useEffect, useMemo, useState, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { useAuthStore } from "../../features/auth/store";
import HoverModel from "../../components/HoverModel";
import LogoutModal from "../../components/common/LogoutModal";
import "../../styles/navbar.css";

// ✅ 3D 도형 타입 정의
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

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 모달 상태 관리
  const [isModalOpen, setModalOpen] = useState(false);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  // 1. 로그아웃 버튼 클릭 -> 모달 열기
  const handleLogoutClick = () => {
    setModalOpen(true);
    // setOpen(false); // 메뉴를 닫고 싶으면 주석 해제
  };

  // 2. 모달에서 '확인' -> 실제 로그아웃
  const handleConfirmLogout = () => {
    logout();
    setModalOpen(false);
    navigate("/");
  };

  // ESC 키로 메뉴 닫기 & 스크롤 잠금 처리
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

  const appRole = useAuthStore((s) => s.role);

  // ✅ 메뉴 아이템 정의 (Shape 포함)
  const items: MenuItem[] = useMemo(
    () => [
      { key: "home", label: "Home", path: "/", shape: "knot" },
      { key: "yourpreference", label: "너의 취향은", path: "/preference", shape: "octahedron" },
      { key: "search", label: "Search", path: "/search", shape: "sphere" },
      { key: "close", label: "", type: "close" }, // 닫기 버튼은 3D 없음

      { key: "feed", label: "Feed", path: "/feed", shape: "box" },
      { key: "lounge", label: "Lounge", path: "/lounge", shape: "torus" },
      {
      key: "profile",
      label: "Profile",
      path: appRole === "artist" ? "/profile/artist/feed" : "/profile/user/feed",
      shape: "sphere",
    },

      { key: "auth", label: "Login/Out", path: "", shape: "knot" },
    ],
    []
  );

  const handleItemClick = (item: MenuItem) => {
    // 1. 닫기 버튼
    if (item.type === "close") {
      setOpen(false);
      return;
    }

    // 2. 로그인/로그아웃 버튼
    if (item.key === "auth") {
      if (!isLoggedIn) {
        navigate("/login", { state: { from: location.pathname } });
        setOpen(false);
      } else {
        // ✅ 바로 로그아웃 하지 않고 모달 열기
        handleLogoutClick();
      }
      return;
    }

    // 3. 일반 페이지 이동
    if (item.path) {
      navigate(item.path);
      setOpen(false);
    }
  };

  return (
    <>
      {/* 1. 상단 고정 네비바 */}
      <header className="nav">
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

      {/* 2. 전체 화면 오버레이 메뉴 */}
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
                    {it.key === "auth"
                      ? isLoggedIn
                        ? "LOGOUT"
                        : "LOGIN"
                      : it.label}
                  </span>

                  {/* ✨ 3D 영역: Shape 프롭 전달 ✨ */}
                  {hoveredKey === it.key && (
                    <div className="ref3DWrapper">
                      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                        <Suspense fallback={null}>
                          <HoverModel 
                            color="#ffffff" 
                            shape={it.shape} 
                          />
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

      {/* ✅ [추가] 로그아웃 모달 */}
      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}