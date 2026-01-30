import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiLogin } from "../../features/auth/api";
import type { UserRole } from "../../features/auth/types";
import { useAuthStore } from "../../features/auth/store";
import { setMe, type PostRole } from "../../features/feed/mockData";
import "./login.css";

const MY_SEED_PREFIX = "comet_mock_my_posts_seeded_v1";

export default function Login() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const returnUrl = sp.get("returnUrl");

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

      // 1) auth store 저장 (memberUuid 필수)
      login({
        token: res.token,
        role: res.role === "USER" ? "general" : "artist",
        remember,
        user: { memberUuid: res.memberUuid, name: res.name },
      });

      // 2) feed mockData의 "현재 유저(me)"도 같이 세팅 (posts 작성자 매칭용)
      const postRole: PostRole = res.role === "ARTIST" ? "ARTIST" : "USER";
      setMe({ id: res.memberUuid, name: res.name, role: postRole });

      // 3) 내 글 seed (유저별 1회만)
      const seedKey = `${MY_SEED_PREFIX}.${res.memberUuid}`;
      if (localStorage.getItem(seedKey) !== "1") {
        try {
          
        } catch {
          // seedMyPosts 내부에서 me 없으면 throw 가능 -> 위에서 setMe 했으니 보통 안 남
        }
        localStorage.setItem(seedKey, "1");
      }

      nav(returnUrl || "/");
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
            <div className="role-track" style={{ "--active-color": themeColor } as React.CSSProperties}>
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
            Don't have an account?{" "}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
