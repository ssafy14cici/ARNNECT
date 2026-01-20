import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "../../router/guards";
import { useAuthStore } from "../../stores/authStore";

type GuardProps = {
  requireAuth?: boolean;
  requireRole?: Role;
};

export default function Guard({ requireAuth, requireRole }: GuardProps) {
  const { isLoggedIn, role } = useAuthStore();
  const location = useLocation();

  // 개발 중 점검용: 인증 우회
  if (import.meta.env.DEV) {
    return <Outlet />;
  }

  if (requireAuth && !isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireRole && role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
