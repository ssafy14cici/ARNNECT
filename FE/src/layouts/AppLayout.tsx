import { Outlet, useLocation } from "react-router-dom"; // useLocation 추가
import { useEffect } from "react";
import Navbar from "../layouts/Navbar";
import Footer from "../layouts/Footer"; // Footer 추가
import { useAuthStore } from "../stores/authStore";

export default function AppLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { pathname } = useLocation(); // 현재 경로 추출

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  /**
   * ARNNECT 메인 페이지('/')에서는 푸터를 숨기고, 
   * 그 외 모든 페이지(약관, 프로필 등)에서만 푸터를 노출합니다.
   */
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