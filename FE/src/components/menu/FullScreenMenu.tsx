import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";

type Item = { label: string; to: string; authOnly?: boolean };

const ITEMS: Item[] = [
  { label: "Home", to: "/" },
  { label: "Artist GO", to: "/artist-go" },
  { label: "Search", to: "/search" },
  { label: "Feed", to: "/feed" },
  { label: "Lounge", to: "/lounge", authOnly: true },
];

export default function FullScreenMenu() {
  const nav = useNavigate();
  const { isMenuOpen, closeMenu } = useUIStore();
  const { isLoggedIn, loginAsGeneral, loginAsArtist, logout, role } = useAuthStore();

  if (!isMenuOpen) return null;

  const go = (to: string, authOnly?: boolean) => {
    closeMenu();
    if (authOnly && !isLoggedIn) {
      // 로그인 필요 동작 :contentReference[oaicite:6]{index=6}
      nav("/login");
      return;
    }
    nav(to);
  };

  return (
    <div className="menu-overlay" role="dialog" aria-modal="true">
      <button className="menu-close" onClick={closeMenu} aria-label="Close menu">
        ✕
      </button>

      <div className="menu-panel">
        <div className="menu-title">MENU</div>

        <div className="menu-items">
          {ITEMS.map((it) => (
            <button
              key={it.to}
              className="menu-item"
              onClick={() => go(it.to, it.authOnly)}
            >
              {it.label}
              {it.authOnly ? " 🔒" : ""}
            </button>
          ))}
        </div>

        {/* 데모용 로그인 토글(나중에 삭제) */}
        <div className="menu-divider" />
        <div className="menu-auth">
          <div className="menu-auth-row">
            <span>로그인 상태: {isLoggedIn ? "ON" : "OFF"}</span>
            <span>Role: {role}</span>
          </div>

          {!isLoggedIn ? (
            <div className="menu-auth-actions">
              <button className="menu-small" onClick={loginAsGeneral}>
                일반 로그인(데모)
              </button>
              <button className="menu-small" onClick={loginAsArtist}>
                예술가 로그인(데모)
              </button>
            </div>
          ) : (
            <button className="menu-small" onClick={logout}>
              로그아웃(데모)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
