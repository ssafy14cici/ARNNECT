// FE/src/app/router/guards.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";

export type Role = "general" | "artist";

type GuardProps = {
  requireAuth?: boolean;
  requireRole?: Role;

  guestOnly?: boolean;
  redirectTo?: string;
};

export default function Guard({
  requireAuth,
  requireRole,
  guestOnly,
  redirectTo = "/feed",
}: GuardProps) {
  const { isLoggedIn, role, hydrating } = useAuthStore();
  const location = useLocation();

  // ✅ DEV 우회: 보호 라우트에만 적용 (guestOnly는 제외)
  const shouldBypassInDev =
    import.meta.env.DEV && (requireAuth || requireRole) && !guestOnly;

  if (shouldBypassInDev) return <Outlet />;

  // ✅ hydrate 끝나기 전에는 판정하지 말고 대기(특히 새로고침 직후)
  // requireAuth/requireRole/guestOnly 모두에서 깜빡임 방지
  if (hydrating) {
    return null; // 원하면 로딩 컴포넌트로 교체
  }

  // ✅ guestOnly: 로그인 상태면 차단
  if (guestOnly) {
    return isLoggedIn ? <Navigate to={redirectTo} replace /> : <Outlet />;
  }

  // ✅ requireRole은 auth를 내포
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
