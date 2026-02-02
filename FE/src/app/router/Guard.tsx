// FE/src/app/router/guards.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";

export type Role = "general" | "artist";

type GuardProps = {
  requireAuth?: boolean;
  requireRole?: Role;

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

  // ✅ DEV 우회: 보호 라우트(requireAuth/requireRole)에만 적용
  // guestOnly는 dev에서도 정상 동작해야 하므로 우회 제외
  const shouldBypassInDev =
    import.meta.env.DEV && (requireAuth || requireRole) && !guestOnly;

  if (shouldBypassInDev) return <Outlet />;

  // ✅ guestOnly는 최우선: 로그인 상태면 차단, 아니면 통과
  if (guestOnly) {
    return isLoggedIn ? <Navigate to={redirectTo} replace /> : <Outlet />;
  }

  // ✅ requireRole은 "로그인 필요"를 내포한다고 보는 게 안전
  if ((requireAuth || requireRole) && !isLoggedIn) {
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
