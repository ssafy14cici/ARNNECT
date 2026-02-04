import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Navbar from "./Navbar";
import Footer from "./Footer";
import { useAuthStore } from "../../features/auth/store";

export default function AppLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { pathname } = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const showFooter = pathname !== "/";

  return (
    <div
      className="app-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        minHeight: "100vh",
        overflow: "hidden", // ✅ 스크롤은 main에서만
      }}
    >
      <Navbar />

      {/* ✅ 스크롤 컨테이너 */}
      <main
        className="page"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />

        {/* ✅ Footer를 main 안으로 넣어야 스크롤 끝에서 등장 */}
        {showFooter && <Footer />}
      </main>
    </div>
  );
}
