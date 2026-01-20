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

  /**
   * 🔍 개발 환경 전용 우회 로직
   * - npm run dev 에서만 동작
   * - routes.tsx 구조 유지
   * - 점검 종료 후 제거 가능
   */
  if (import.meta.env.DEV) {
    return <Outlet />;
  }

  /**
   * 🔐 로그인 필요
   */
  if (requireAuth && !isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /**
   * 🔐 권한 필요 (예: artist)
   */
  if (requireRole && role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
