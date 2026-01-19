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
    // 상세 페이지는 로그인 필요 :contentReference[oaicite:4]{index=4}
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireRole && role !== requireRole) {
    // 일단은 권한 없으면 홈으로(추후 권한 안내 페이지 가능)
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
