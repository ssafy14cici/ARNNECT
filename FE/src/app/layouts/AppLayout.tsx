import { Outlet, useLocation } from "react-router-dom"; 
import { useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer"; 
import { useAuthStore } from "../../features/auth/store";

export default function AppLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { pathname } = useLocation(); // 현재 경로 추출

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const showFooter = pathname !== "/";

  return (
    <div 
      className="app-shell" 
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <Navbar />
      <main className="page" style={{ flex: 1 }}>
        <Outlet />
      </main>
      {/* 메인이 아닐 때만 하단에 푸터 렌더링 */}
      {showFooter && <Footer />}
    </div>
  );
}