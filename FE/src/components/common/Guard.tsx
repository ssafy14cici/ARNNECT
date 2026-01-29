// src/components/common/Guard.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "../../app/router/guards";
import { useAuthStore } from "../../features/auth/store";

type GuardProps = {
  requireAuth?: boolean;
  requireRole?: Role;

  // ✅ 추가
  guestOnly?: boolean; // 비로그인만 접근 가능(로그인/회원가입)
  redirectTo?: string; // 로그인 상태일 때 보내줄 곳
};

export default function Guard({
  requireAuth,
  requireRole,
  guestOnly,
  redirectTo = "/feed",
}: GuardProps) {
  const { isLoggedIn, role } = useAuthStore();
  const location = useLocation();

  /**
   * ✅ 핵심: DEV 우회는 "requireAuth/requireRole" 같은 보호 라우트에만 적용
   * guestOnly는 개발 중에도 동작해야 의미가 있으니 우회에서 제외
   */
  const shouldBypassInDev =
    import.meta.env.DEV && (requireAuth || requireRole) && !guestOnly;

  if (shouldBypassInDev) {
    return <Outlet />;
  }

  // ✅ 게스트 전용: 로그인 상태면 접근 차단
  if (guestOnly && isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requireAuth && !isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (requireRole && role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
