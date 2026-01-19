import { useEffect, useState } from "react";
import "../../styles/navbar.css";

type MenuItem = {
  key: string;
  label: string;
  type?: "logo" | "close" | "empty";
  image?: string;
};

export default function Navbar() {
  const [open, setOpen] = useState(false);

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
    { key: "logo", label: "LOGO", type: "logo", image: "/arnnect_logo_ver1.png" },
    { key: "artist", label: "예술인\nGo" },
    { key: "search", label: "search" },
    { key: "close", label: "X", type: "close" },
    { key: "empty", label: "", type: "empty" },
    { key: "feed", label: "My feed" },
    { key: "mypage", label: "mypage" },
    { key: "setting", label: "option" },
    { key: "dark", label: "다크모드\nguidelines" },
  ];

  const onCellClick = (it: MenuItem) => {
    if (it.type === "close") setOpen(false);
    else {
      setOpen(false);
      // TODO: 라우팅 붙이면 여기서 navigate 처리
      console.log("hamburger clicked");
    }
  };

  return (
    <>
      <header className="nav">
        <div className="navInner">
          <button className="navBrand" type="button">
            ARNNECT
          </button>

          <div className="navRight">
            <button className="navLogin" type="button">
              LOGIN
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
                onClick={() => onCellClick(it)}
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
