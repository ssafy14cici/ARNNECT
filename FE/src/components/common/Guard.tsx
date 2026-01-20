import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "../../router/guards";
import { useAuthStore } from "../../stores/authStore";

type GuardProps = {
  requireAuth?: boolean;
  requireRole?: Role; // 예: "artist"
};

export default function Guard({ requireAuth, requireRole }: GuardProps) {
  const { isLoggedIn, role } = useAuthStore();
  const location = useLocation();

  if (requireAuth && !isLoggedIn) {
    // 원래 가려던 전체 경로(path + query)를 만든다.
    const fullPath = location.pathname + location.search;

    // URL 파라미터에 넣기 전에 인코딩해야 안전함(슬래시/물음표/한글 등).
    const returnUrl = encodeURIComponent(fullPath);

    // ✅ 로그인 페이지로 보내되, returnUrl을 쿼리로 전달
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  if (requireRole && role !== requireRole) {
    // 일단은 권한 없으면 홈으로(추후 권한 안내 페이지 가능)
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
