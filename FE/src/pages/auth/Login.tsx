// FE/src/pages/auth/Login.tsx
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { apiLogin } from "../../features/auth/api";
import type { UserRole } from "../../features/auth/types";
import { useAuthStore } from "../../features/auth/store";

import "./login.css";
import { USE_MOCK } from "../../shared/config/env";

// ✅ 서버에서 role이 어떤 형태로 오든("USER"/"GENERAL"/"general"/"ARTIST"/"artist") FE 표준("general"|"artist")로 정규화
function normalizeRole(input: unknown): "general" | "artist" {
  const v = String(input ?? "").toLowerCase();
  if (v === "artist") return "artist";
  // "user", "general", "", undefined 등은 전부 general로 처리
  return "general";
}

// ✅ UI 토글은 UserRole을 쓰되, CSS가 기존에 USER/ARTIST 클래스에 의존할 수 있어서 UI용 라벨을 따로 만든다
function toUiRole(role: UserRole): "USER" | "ARTIST" {
  return String(role).toLowerCase() === "artist" ? "ARTIST" : "USER";
}

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();

  const returnUrl =
    sp.get("returnUrl") || ((location.state as any)?.from as string | undefined) || null;

  const login = useAuthStore((s) => s.login);

  // ✅ UserRole이 "general" | "artist" 라는 전제(지금 FE Guard 타입도 이쪽)
  const [role, setRole] = useState<UserRole>("general" as UserRole);

  // 편의상 기본 입력값
  const [email, setEmail] = useState("user@test.com");
  const [password, setPassword] = useState("123456789");

  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uiRole = toUiRole(role);

  const themeColor = uiRole === "USER" ? "#ffffff" : "#C8A97E";
  const subTitle =
    uiRole === "USER"
      ? "Discover your taste in art."
      : "Share your inspiration with the world.";

  useEffect(() => setError(null), [role, email, password]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ LoginRequest에 remember가 없으니 제거
      // (role이 LoginRequest에 없으면 여기서도 타입 에러가 떠야 하는데, 지금은 remember만 에러였음)
      const res = await apiLogin({ email, password, role });

      // ✅ 응답 role 정규화
      const appRole = normalizeRole((res as any).role);

      // ✅ auth store 저장
      login({
        token: (res as any).token,
        role: appRole, // "general" | "artist"
        remember,
        user: {
          memberUuid: (res as any).memberUuid,
          name: (res as any).name,
        },
      });

      // ✅ 목업 전용 사이드이펙트는 여기서만
      if (USE_MOCK) {
        // 필요 시 seed/1회성 처리
      }

      nav(returnUrl || "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "이메일 또는 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`auth-page ${uiRole === "ARTIST" ? "mode-artist" : "mode-user"}`}>
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
            <div className="role-track" style={{ "--active-color": themeColor } as CSSProperties}>
              <button
                type="button"
                className={`role-btn ${uiRole === "USER" ? "active" : ""}`}
                onClick={() => setRole("general" as UserRole)}
              >
                Collector
              </button>
              <button
                type="button"
                className={`role-btn ${uiRole === "ARTIST" ? "active" : ""}`}
                onClick={() => setRole("artist" as UserRole)}
              >
                Artist
              </button>

              {/* CSS가 USER/ARTIST 기준이면 유지 */}
              <div className={`role-slider ${uiRole}`} />
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
              {loading ? "Processing..." : uiRole === "USER" ? "LOG IN" : "ARTIST LOG IN"}
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
