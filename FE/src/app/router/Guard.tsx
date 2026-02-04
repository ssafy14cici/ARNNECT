// FE/src/app/router/Guard.tsx
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
  const { isLoggedIn, role, hydrated } = useAuthStore();
  const location = useLocation();

  // ✅ "원할 때만" DEV 우회 (기본 false 권장)
  const BYPASS_GUARD =
    import.meta.env.DEV && String(import.meta.env.VITE_BYPASS_GUARD) === "true";

  if (BYPASS_GUARD && (requireAuth || requireRole) && !guestOnly) {
    return <Outlet />;
  }

  // ✅ hydrate 끝나기 전엔 판정하지 말고 대기(깜빡임/뚫림 방지)
  if (!hydrated) return null; // 또는 로딩 컴포넌트

  if (guestOnly) {
    return isLoggedIn ? <Navigate to={redirectTo} replace /> : <Outlet />;
  }

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
