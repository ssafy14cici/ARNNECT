// FE/src/layouts/Navbar.tsx

import { useEffect, useMemo, useState, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Canvas } from "@react-three/fiber"; // 3D 구현을 위한 Canvas
import { useAuthStore } from "../stores/authStore";
import HoverModel from "../components/HoverModel"; // 3D 모델 컴포넌트 import
import "../styles/navbar.css"; // 앞서 수정한 CSS 파일

type MenuItem = {
  key: string;
  label: string;
  type?: "link" | "close"; // 일반 링크인지, 닫기 버튼인지 구분
  path?: string;
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null); // 현재 마우스가 올라간 메뉴 키

  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  // ESC 키로 메뉴 닫기 & 스크롤 잠금 처리
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden"; // 메뉴 열리면 스크롤 잠금
    } else {
      document.body.style.overflow = ""; // 닫히면 해제
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  // ✅ 메뉴 아이템 정의 (The-Artery 스타일: 4열 2행 그리드)
  // [Home] [취향] [검색] [닫기(X)]
  // [Feed] [Lounge] [Profile] [Login]
  const items: MenuItem[] = useMemo(
    () => [
      // --- Row 1 ---
      { key: "home", label: "Home", path: "/" },
      { key: "yourtaste", label: "너의 취향은", path: "/yourtaste" },
      { key: "search", label: "Search", path: "/search" },
      { key: "close", label: "", type: "close" }, // 우측 상단은 '닫기' 버튼 전용

      // --- Row 2 ---
      { key: "feed", label: "Feed", path: "/feed" },
      { key: "lounge", label: "Lounge", path: "/lounge" },
      { key: "profile", label: "Profile", path: "/profile/me/feed" },
      { key: "auth", label: "Login/Out", path: "" }, // 로그인 여부에 따라 텍스트 변경
    ],
    []
  );

  const handleItemClick = (item: MenuItem) => {
    // 1. 닫기 버튼 클릭 시
    if (item.type === "close") {
      setOpen(false);
      return;
    }

    // 2. 로그인/로그아웃 버튼 클릭 시
    if (item.key === "auth") {
      if (!isLoggedIn) {
        navigate("/login", { state: { from: location.pathname } });
      } else {
        logout();
        navigate("/", { replace: true });
      }
      setOpen(false);
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
      {/* =======================
          1. 상단 고정 네비바 (Logo & Hamburger)
      ======================== */}
      <header className="nav">
        <div className="navInner">
          {/* 브랜드 로고 */}
          <button
            className="navBrand"
            type="button"
            onClick={() => navigate("/")}
          >
            ARNNECT
          </button>

          {/* 햄버거 버튼 (메뉴가 열리면 CSS로 인해 숨겨짐) */}
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

      {/* =======================
          2. 전체 화면 오버레이 메뉴 (Grid Layout)
      ======================== */}
      <div className={`refMenu ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="refMenuGrid">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className="refCell"
              onClick={() => handleItemClick(it)}
              // 마우스 호버 이벤트: 3D 모델을 띄우기 위해 state 업데이트
              onMouseEnter={() => setHoveredKey(it.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* (A) 닫기 버튼 타입일 경우: X 아이콘 표시 */}
              {it.type === "close" ? (
                <div className="refCellClose" aria-label="Close Menu" />
              ) : (
                /* (B) 일반 메뉴일 경우: 텍스트 + 3D 효과 */
                <>
                  <span className="refLabel">
                    {/* 로그인 상태에 따라 텍스트 변경 */}
                    {it.key === "auth"
                      ? isLoggedIn
                        ? "LOGOUT"
                        : "LOGIN"
                      : it.label}
                  </span>

                  {/* ✨ 3D Canvas 영역 (호버 시에만 렌더링) ✨ */}
                  {hoveredKey === it.key && (
                    <div className="ref3DWrapper">
                      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                        <Suspense fallback={null}>
                          {/* HoverModel에 prop을 전달하여 메뉴마다 다른 색상/모델을 보여줄 수 있습니다.
                            예: color={it.key === 'film' ? 'gold' : 'silver'}
                          */}
                          <HoverModel color="#ffffff" />
                        </Suspense>
                      </Canvas>
                    </div>
                  )}
                  
                  {/* (옵션) 3D가 로딩되기 전이나, 3D 대신 사용할 심플한 점(Dot) 효과 
                      3D를 쓰지 않을 때는 이 부분을 활성화하면 됩니다.
                      <span className="refDot" /> 
                  */}
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}