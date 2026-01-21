// src/components/main/Navbar.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import "../../styles/navbar.css";

/**
 * MenuItem
 * - type: "logo" / "empty" (그리드 레이아웃 용도)
 * - requiresAuth: 로그인 필요 메뉴인지(로그아웃 상태에서 클릭 시 로그인으로 보냄)
 */
type MenuItem = {
  key: string;
  label: string;
  type?: "logo" | "empty";
  image?: string;
  path?: string;
  requiresAuth?: boolean;
};

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 로그인 여부/로그아웃 액션은 store를 그대로 사용 (팀장 로그인 플로우를 건드리지 않기 위함)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  /**
   * 오버레이 메뉴 UX
   * 1) ESC 키로 닫기
   * 2) 메뉴 열려 있을 때 body 스크롤 잠금 (배경 스크롤 방지)
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  /**
   * 메뉴 항목 정의
   * - requiresAuth: true 인 항목은 "로그인 없으면 이동 자체를 막고" 로그인 화면으로 보냄
   * - 이렇게 하면 Guard/토큰/hydrate 타이밍이 아직 불완전해도 UI 레벨에서 안전하게 차단 가능
   */
  const items: MenuItem[] = useMemo(
    () => [
      {
        key: "logo",
        label: "LOGO",
        type: "logo",
        image: "/arnnect_logo_ver1.png",
        path: "/",
      },
      { key: "artist", label: "예술인\nGo", path: "/artist-go" },
      { key: "search", label: "Search", path: "/search" },

      // ✅ 그리드 2x4 레이아웃 맞추기 위한 빈 칸
      { key: "empty1", label: "", type: "empty" },

      // 🔒 로그인 필요 메뉴들 (로그아웃 상태에서 클릭하면 로그인으로)
      { key: "feed", label: "Feed", path: "/feed", requiresAuth: true },
      { key: "lounge", label: "Lounge", path: "/lounge", requiresAuth: true },
      { key: "profile", label: "Profile", path: "/profile/1/feed", requiresAuth: true },

      // 사용하지 않는 칸은 empty로 둬도 되고, 텍스트만 두고 path를 안 주면 "비활성"처럼 동작
      { key: "guidelines", label: "Guidelines", type: "empty" },
    ],
    []
  );

  /**
   * 로그인 이동 헬퍼
   * - returnUrl을 query로 통일: /login?returnUrl=...
   * - Guard의 state(from) 방식과 섞이지 않도록 "여기서는 query만" 사용
   * - replace: true 로 두면 뒤로가기 시 로그인 전 페이지로 튀는 UX를 줄일 수 있음
   */
  const goLoginWithReturnUrl = (targetPath: string) => {
    const returnUrl = encodeURIComponent(targetPath);
    navigate(`/login?returnUrl=${returnUrl}`, { replace: true });
  };

  /**
   * 메뉴 셀 클릭 처리
   * - empty면 무시
   * - logo면 홈
   * - requiresAuth && !isLoggedIn 이면 "이동 차단" + 로그인으로
   * - 그 외에는 해당 path로 이동
   */
  const handleItemClick = (item: MenuItem) => {
    // (1) 빈칸은 클릭 무시
    if (item.type === "empty") return;

    // (2) 로고는 홈으로
    if (item.type === "logo") {
      navigate("/");
      setOpen(false);
      return;
    }

    // (3) path 없으면 아무것도 안 함 (가짜 메뉴/텍스트용)
    if (!item.path) return;

    // (4) 🔒 보호 메뉴: 로그아웃이면 이동을 막고 로그인으로 보냄
    //     (Guard가 아직 완벽하지 않아도, UI 레벨에서 최소 방어선을 만든다)
    if (item.requiresAuth && !isLoggedIn) {
      setOpen(false);
      goLoginWithReturnUrl(item.path);
      return;
    }

    // (5) 일반 이동
    navigate(item.path);
    setOpen(false);
  };

  /**
   * 상단 LOGIN/LOGOUT 버튼
   * - 로그아웃 상태: 현재 위치를 returnUrl로 보냄 → 로그인 후 다시 돌아오기
   * - 로그인 상태: logout() 후 홈으로
   */
  const onLoginButtonClick = () => {
    if (!isLoggedIn) {
      goLoginWithReturnUrl(location.pathname);
      return;
    }

    logout();
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* ✅ 상단 네비바 */}
      <header className="nav">
        <div className="navInner">
          <button className="navBrand" type="button" onClick={() => navigate("/")}>
            ARNNECT
          </button>

          <div className="navRight">
            <button className="navLogin" type="button" onClick={onLoginButtonClick}>
              {isLoggedIn ? "LOGOUT" : "LOGIN"}
            </button>

            {!isLoggedIn && (
              <button className="navLogin" type="button" onClick={() => navigate("/signup")}>
                SignUp
              </button>
            )}

            {/* ✅ 햄버거 버튼 (열리면 active로 X 애니메이션) */}
            <button
              id="menu4"
              type="button"
              className={`menu-trigger ${open ? "active" : ""}`}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* ✅ 오버레이 메뉴 */}
      <div className={`refMenu ${open ? "open" : ""}`} aria-hidden={!open}>
        {/* 배경 클릭으로 닫기 */}
        <button
          type="button"
          className="refMenuBackdrop"
          aria-label="Close menu backdrop"
          onClick={() => setOpen(false)}
        />

        <div className="refMenuPanel" role="dialog" aria-modal="true">
          {/* ✅ X 버튼: 햄버거와 같은 좌표에 두기 위해 fixed + css로 top/right를 동일하게 */}
          <button
            type="button"
            className="refMenuCloseBtn"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <span />
            <span />
            <span />
          </button>

          {/* ✅ 2x4 그리드 메뉴 */}
          <div className="refMenuGrid">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                className={`refCell ${it.type === "logo" ? "refCellLogo" : ""}`}
                onClick={() => handleItemClick(it)}
              >
                {it.type === "logo" ? (
                  <img
                    className="refLogoImg"
                    src={it.image ?? "/arnnect_logo_ver1.png"}
                    alt="Arnnect"
                  />
                ) : (
                  <span className="refLabel">{it.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
