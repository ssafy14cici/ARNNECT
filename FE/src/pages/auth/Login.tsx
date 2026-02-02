// FE/src/pages/auth/Login.tsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { apiLogin } from "../../features/auth/api";
import type { UserRole } from "../../features/auth/types";
import { useAuthStore } from "../../features/auth/store";

import "./login.css";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();

  // 1) 쿼리 returnUrl 우선, 없으면 Guard state.from 사용
  const returnUrl =
    sp.get("returnUrl") ||
    ((location.state as any)?.from as string | undefined) ||
    null;

  const login = useAuthStore((s) => s.login);

  const [role, setRole] = useState<UserRole>("USER");
  const [email, setEmail] = useState("user@test.com");
  const [password, setPassword] = useState("123456789");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themeColor = role === "USER" ? "#ffffff" : "#C8A97E";
  const subTitle =
    role === "USER" ? "Discover your taste in art." : "Share your inspiration with the world.";

  useEffect(() => setError(null), [role, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiLogin({ email, password, role, remember });

      // ✅ auth store 저장 (항상)
      login({
        token: res.token,
        role: res.role === "USER" ? "general" : "artist",
        remember,
        user: { memberUuid: res.memberUuid, name: res.name },
      });

      // ✅ 목업 전용 사이드이펙트는 여기서만(필요한 것만 남겨)
      if (USE_MOCK) {
        // 예: 유저별 1회 seed 같은 걸 하고 싶으면 이 블록 안에서만
        // (지금은 중앙 seedMockDB(main.tsx)로 충분하면 비워둬도 됨)
      }

      nav(returnUrl || "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "이메일 또는 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`auth-page ${role === "ARTIST" ? "mode-artist" : "mode-user"}`}>
      <div className="auth-visual">
        <div className="visual-overlay" />
        <img
          src="https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=2670&auto=format&fit=crop"
          alt="Art Visual"
          className="visual-img"
        />
        <div className="visual-text">
          <h2 className="visual-title">The Essence of Art</h2>
          <p className="visual-desc">Connect, Explore, and Create.</p>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-inner">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-sub">{subTitle}</p>
          </div>

          <div className="role-switch-container">
            <div
              className="role-track"
              style={{ "--active-color": themeColor } as React.CSSProperties}
            >
              <button
                type="button"
                className={`role-btn ${role === "USER" ? "active" : ""}`}
                onClick={() => setRole("USER")}
              >
                Collector
              </button>
              <button
                type="button"
                className={`role-btn ${role === "ARTIST" ? "active" : ""}`}
                onClick={() => setRole("ARTIST")}
              >
                Artist
              </button>
              <div className={`role-slider ${role}`} />
            </div>
          </div>

          <form onSubmit={onSubmit} className="auth-form">
            <div className="input-group">
              <input
                className="minimal-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
              />
              <label className="floating-label">Email Address</label>
            </div>

            <div className="input-group">
              <input
                className="minimal-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
              />
              <label className="floating-label">Password</label>
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <div className="form-options">
              <label className="custom-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="check-text">Keep me logged in</span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Processing..." : role === "USER" ? "LOG IN" : "ARTIST LOG IN"}
              <span className="arrow">→</span>
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
