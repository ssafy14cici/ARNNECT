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

  // 풀스크린 3D 페이지 (풋터 숨김 + 스크롤 막기)
  const isFullscreen3D = pathname === "/" || pathname === "/hall" || pathname.startsWith("/exhibit");
  const showFooter = !isFullscreen3D;

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

      {/* ✅ 스크롤 컨테이너 (3D 풀스크린 페이지는 스크롤 막음) */}
      <main
        className="page"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: isFullscreen3D ? "hidden" : "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* ✅ 콘텐츠 영역: 최소 100% 높이로 Footer를 스크롤 아래로 밀어냄 */}
        <div style={{ minHeight: "100%" }}>
          <Outlet />
        </div>

        {/* ✅ Footer: 스크롤 끝에서만 나타남 */}
        {showFooter && <Footer />}
      </main>
    </div>
  );
}
