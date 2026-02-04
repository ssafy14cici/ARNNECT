// FE/src/app/layouts/AppLayout.tsx

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
        // ✅ 모바일 주소창/툴바 변화 대응
        height: "100dvh",
        minHeight: "100vh",

        // ✅ body 스크롤이 막혀 있어도(혹은 flex 꼬여도) main에서 스크롤되게
        overflow: "hidden",
      }}
    >
      <Navbar />

      <main
        className="page"
        style={{
          flex: 1,
          // ✅ flex 자식이 스크롤 되려면 필수 (안 넣으면 높이 계산이 꼬여서 스크롤 안 됨)
          minHeight: 0,

          // ✅ 실제 스크롤 컨테이너
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
