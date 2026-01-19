import { Outlet } from "react-router-dom";
import MenuButton from "../components/menu/MenuButton";
import FullScreenMenu from "../components/menu/FullScreenMenu";
import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";


export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => hydrate(), [hydrate]);

  return (
    <div className="app-shell">
      {/* 네비바 대신 메뉴 버튼만 + 전체화면 메뉴 오버레이 :contentReference[oaicite:5]{index=5} */}
      <header className="topbar">
        <div className="brand">FE</div>
        <MenuButton />
      </header>

      <main className="page">
        <Outlet />
      </main>

      <FullScreenMenu />
    </div>
  );
}
