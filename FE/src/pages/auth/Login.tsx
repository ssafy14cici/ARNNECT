import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiLogin } from "../../api/auth";
import type { UserRole } from "../../types/auth";
import { useAuthStore } from "../../stores/authStore";
import "./login.css";

// ✅ 랜덤 아트워크 이미지 (왼쪽 비주얼 영역용)
// 실제 프로젝트에서는 public 폴더의 고화질 이미지를 사용하세요.
const ART_VISUAL = "/art/a1.jpg"; // (이미지가 없다면 Unsplash URL 등으로 대체 가능)

export default function Login() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const returnUrl = sp.get("returnUrl");
  const login = useAuthStore((s) => s.login);

  const [role, setRole] = useState<UserRole>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 텍스트 및 테마 컬러 동적 변경
  const themeColor = role === "USER" ? "#ffffff" : "#C8A97E"; // White vs Gold
  const subTitle = role === "USER" 
    ? "Discover your taste in art." 
    : "Share your inspiration with the world.";

  const makeUserId = (email: string) => `u_${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  const makeUserName = (email: string) => email.split("@")[0] || "나";

  useEffect(() => setError(null), [role, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiLogin({ email, password, role, remember });
      login({
        token: res.token,
        role: res.role === "USER" ? "general" : "artist",
        remember,
        user: {
          memberUuid: (res as any).memberUuid ?? makeUserId(email),
          name: (res as any).name ?? makeUserName(email),
        },
      });

      if (returnUrl) nav(returnUrl);
      else nav("/");
    } catch (err: any) {
      setError(err?.message ?? "이메일 또는 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`auth-page ${role === "ARTIST" ? "mode-artist" : "mode-user"}`}>
      
      {/* 1. Left Visual Section */}
      <div className="auth-visual">
        <div className="visual-overlay" />
        {/* 이미지가 없다면 CSS 배경색으로 대체됩니다 */}
        <img src="https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=2670&auto=format&fit=crop" alt="Art Visual" className="visual-img" />
        
        <div className="visual-text">
          <h2 className="visual-title">The Essence of Art</h2>
          <p className="visual-desc">Connect, Explore, and Create.</p>
        </div>
      </div>

      {/* 2. Right Form Section */}
      <div className="auth-content">
        <div className="auth-inner">
          
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-sub">{subTitle}</p>
          </div>

          {/* Role Switcher */}
          <div className="role-switch-container">
            <div className="role-track" style={{ '--active-color': themeColor } as any}>
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
              {/* Sliding Background */}
              <div className={`role-slider ${role}`} />
            </div>
          </div>

          <form onSubmit={onSubmit} className="auth-form">
            <div className="input-group">
              <input
                className="minimal-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" " // placeholder hack for CSS label animation
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
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(!showPw)}
              >
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
              {loading ? "Processing..." : (role === "USER" ? "LOG IN" : "ARTIST LOG IN")}
              <span className="arrow">→</span>
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}