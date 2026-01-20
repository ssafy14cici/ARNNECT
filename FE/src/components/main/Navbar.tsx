import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import "../../styles/navbar.css";

type MenuItem = {
  key: string;
  label: string;
  type?: "logo" | "close" | "empty";
  image?: string;
  path?: string; //경로
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

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
  
  const items: MenuItem[] = [
    { key: "logo", label: "LOGO", type: "logo", image: "/arnnect_logo_ver1.png", path: "/" },
    { key: "artist", label: "예술인\nGo", path: "/artist-go" },
    { key: "search", label: "search", path : "/search" },
    { key: "close", label: "X", type: "close" },
    { key: "empty", label: "", type: "empty" },
    { key: "feed", label: "Feed", path: "/feed" },
    // { key: "lounge", label: "Lounge", path: "/lounge" },
    { key: "mypage", label: "mypage", path: "/profile/1" },
    { key: "setting", label: "option", type: "empty" },
    { key: "dark", label: "다크모드\nguidelines", type: "empty" },
  ];

  const handleItemClick = (item: MenuItem) => {
    if (item.type === "close") {
      setOpen(false);
      return;
    }

    if (item.type === "empty") return;

    // ✅ 로고 클릭 시 홈으로(원하면 변경)
    if (item.type === "logo") {
      navigate("/");
      setOpen(false);
      return;
    }

    // ✅ path가 있으면 이동
    if (item.path) {
      navigate(item.path);
      setOpen(false);
    }
  };


  return (
    <>
      <header className="nav">
        <div className="navInner">
          <button className="navBrand" type="button" onClick={() => navigate("/")}>
            ARNNECT
          </button>

          <div className="navRight">
            {/* <button className="navLogin" type="button" onClick={() => navigate("/login")}>
              LOGIN
            </button> */}
            <button
              className="navLogin"
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  // 로그인 안 됨 → 로그인 페이지로 이동
                  navigate("/login");
                  return;
                }

                // 로그인 됨 → 로그아웃 처리 후 홈으로
                logout();
                setOpen(false);
                navigate("/", { replace: true });
              }}
            >
              {isLoggedIn ? "LOGOUT" : "LOGIN"}
            </button>


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

      <div className={`refMenu ${open ? "open" : ""}`} aria-hidden={!open}>
        <button
          type="button"
          className="refMenuBackdrop"
          aria-label="Close menu backdrop"
          onClick={() => setOpen(false)}
        />

        <div className="refMenuPanel" role="dialog" aria-modal="true">
          <div className="refMenuGrid">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                className={`refCell ${it.type === "close" ? "refCellClose" : ""} ${
                  it.type === "logo" ? "refCellLogo" : ""
                }`}
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
