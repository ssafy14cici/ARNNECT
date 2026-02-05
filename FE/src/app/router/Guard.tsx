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
  const { isLoggedIn, role, hydrated, token } = useAuthStore();
  const location = useLocation();

  const BYPASS_GUARD =
    import.meta.env.DEV && String(import.meta.env.VITE_BYPASS_GUARD) === "true";

  if (BYPASS_GUARD && (requireAuth || requireRole) && !guestOnly) {
    return <Outlet />;
  }

  if (!hydrated) return null;

  // ✅ token만 있어도 “로그인 상태”로 취급
  const authed = isLoggedIn || !!token;

  if (guestOnly) {
    return authed ? <Navigate to={redirectTo} replace /> : <Outlet />;
  }

  if ((requireAuth || requireRole) && !authed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (requireRole && role && role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
