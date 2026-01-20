import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import "../../styles/navbar.css";

type MenuItem = {
  key: string;
  label: string;
  type?: "logo" | "empty";
  image?: string;
  path?: string;
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  // ESC로 닫기 + 오버레이 열리면 스크롤 잠금
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

  // ✅ 메뉴 항목(그리드용) - close 버튼은 "별도"로 만들기 때문에 여기서 제거
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

      // ✅ 그리드 2x4 맞추려면 빈칸 1개 정도는 필요할 수 있음
      { key: "empty1", label: "", type: "empty" },

      { key: "feed", label: "Feed", path: "/feed" },
      { key: "lounge", label: "Lounge", path: "/lounge" },
      { key: "profile", label: "Profile", path: "/profile/1" },

      // ✅ 사용 안 하는 칸은 empty로 두기
      { key: "empty2", label: "", type: "empty" },
    ],
    []
  );

  const handleItemClick = (item: MenuItem) => {
    // 빈칸은 무시
    if (item.type === "empty") return;

    // 로고 클릭: 홈
    if (item.type === "logo") {
      navigate("/");
      setOpen(false);
      return;
    }

    // 경로가 있으면 이동
    if (item.path) {
      navigate(item.path);
      setOpen(false);
    }
  };

  const onLoginButtonClick = () => {
    if (!isLoggedIn) {
      // 현재 위치를 returnUrl로 넘기고 싶으면 여기서도 가능
      // (지금 Guard 쪽에서 returnUrl 처리 이미 하고 있으면 생략 가능)
      navigate("/login", { state: { from: location.pathname } });
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

            {/* ✅ 햄버거 버튼 */}
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
        {/* 배경 클릭 닫기 */}
        <button
          type="button"
          className="refMenuBackdrop"
          aria-label="Close menu backdrop"
          onClick={() => setOpen(false)}
        />

        <div className="refMenuPanel" role="dialog" aria-modal="true">
          {/* ✅ X 버튼: 햄버거 버튼과 "같은 위치"에 fixed로 올림
              CSS에서 .refMenuCloseBtn의 top/right를 nav padding과 동일하게 맞추면
              픽셀 단위로 동일 좌표가 됩니다. */}
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

          <div className="refMenuGrid">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                className={`refCell ${it.type === "logo" ? "refCellLogo" : ""}`}
                onClick={() => handleItemClick(it)}
              >
                {it.type === "logo" ? (
                  <img className="refLogoImg" src={it.image ?? "/arnnect_logo_ver1.png"} alt="Arnnect" />
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
