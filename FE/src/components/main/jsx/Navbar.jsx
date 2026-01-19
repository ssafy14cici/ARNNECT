import React, { useEffect, useState } from "react";
import "../../styles/navbar.css"; // 경로 맞춰서 수정

export default function Navbar() {
  const handleLogin = () => {
    window.location.href = '/temporary-login'; // Redirect to temporary login page
  };

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const items = [
    { key: "logo", label: "LOGO", type: "logo", image: "/arnnect_logo_ver1.png" }, // 여기 나중에 이미지로 교체
    { key: "artist", label: "예술인\nGo" },
    { key: "search", label: "search" },
    { key: "close", label: "X", type: "close" },
    { key: "empty", label: "", type: "empty" },
    { key: "feed", label: "My feed" },
    { key: "mypage", label: "mypage" },
    { key: "setting", label: "option" },
    { key: "dark", label: "다크모드\nguidelines" },
  ];

  const onCellClick = (it) => {
    if (it.type === "close") setOpen(false);
    else {
      setOpen(false);
      // TODO: 라우팅 붙이면 여기서 navigate 처리
    }
  };

  const toggleStyles = {
    borderRadius: "0", // Remove rounded borders
    // Add any other styles to unify design
  };

  const loginButtonStyles = {
    border: "none", // Remove border from login button
    // Add any other styles as needed
  };

  const hamburgerStyles = {
    border: "none", // Remove border from hamburger button
    // Add any other styles to unify design
  };

  return (
    <>
      <header className="nav">
        <div className="navInner">
          <button className="navBrand" type="button">
            ARNNECT
          </button>

          <div className="navRight">
            <button className="navLogin" type="button" style={loginButtonStyles}>
              LOGIN
            </button>

            {/* 햄버거(=) ↔ X 동기화 */}
            <button
              id="menu4"
              type="button"
              className={`menu-trigger ${open ? "active" : ""}`}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              style={{ ...toggleStyles, ...hamburgerStyles }} // Apply toggleStyles and hamburgerStyles to the hamburger menu
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* 오버레이 메뉴 */}
      <div className={`refMenu ${open ? "open" : ""}`} aria-hidden={!open}>
        {/* 배경 클릭 닫기 */}
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
                  <img className="refLogoImg" src="/arnnect_logo_ver1.png" alt="Arnnect" />
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
