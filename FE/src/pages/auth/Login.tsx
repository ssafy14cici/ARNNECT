// FE/src/pages/auth/Login.tsx
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { apiLogin } from "../../features/auth/api";
import type { LoginResponse, UserRole } from "../../features/auth/types";
import { useAuthStore } from "../../features/auth/store";

import "./login.css";

// ---------- helpers ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function pickStr(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * ✅ 서버 role이 어떤 형태로 오든 FE 표준("general"|"artist")로 정규화
 * - "ARTIST", "artist", "ROLE_ARTIST" => artist
 * - 그 외는 general 처리
 */
function normalizeRole(input: unknown): "general" | "artist" {
  const v = String(input ?? "").toLowerCase();
  if (v.includes("artist")) return "artist";
  if (v.includes("user") || v.includes("general")) return "general";
  return "general";
}

/** ✅ UI 토글은 UserRole을 쓰되 CSS가 USER/ARTIST 클래스에 의존할 수 있어 UI용 라벨로 변환 */
function toUiRole(role: UserRole): "USER" | "ARTIST" {
  return String(role).toLowerCase().includes("artist") ? "ARTIST" : "USER";
}

/** location.state에서 from 경로 안전하게 뽑기 */
function pickReturnUrlFromState(state: unknown): string | null {
  if (!isRecord(state)) return null;
  const from = state.from;
  return typeof from === "string" && from.trim() ? from : null;
}

/** apiLogin 응답에서 token 안전하게 뽑기 */
function pickToken(res: unknown): string | null {
  if (!isRecord(res)) return null;
  const token = pickStr(res, "token");
  return token && token.trim() ? token : null;
}

/**
 * ✅ JWT payload 디코드 (서명 검증은 서버가 함 → FE는 UI/라우팅 용도로만 사용)
 * payload에서 보통:
 * - sub: memberUuid
 * - role: "USER" | "ARTIST" (혹은 프로젝트 enum)
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    // base64url -> base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");

    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr) as unknown;

    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();

  const returnUrl = sp.get("returnUrl") || pickReturnUrlFromState(location.state as unknown) || null;

  const login = useAuthStore((s) => s.login);

  // ✅ UI 토글 (BE 인증에는 영향 없음: 스타일/UX 용)
  const [role, setRole] = useState<UserRole>("general" as UserRole);

  // 편의상 기본 입력값
  const [email, setEmail] = useState("E107@ssafy.com");
  const [password, setPassword] = useState("123456789");

  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uiRole = toUiRole(role);
  const themeColor = uiRole === "USER" ? "#ffffff" : "#C8A97E";
  const subTitle =
    uiRole === "USER" ? "Discover your taste in art." : "Share your inspiration with the world.";

  useEffect(() => setError(null), [role, email, password]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res: LoginResponse = await apiLogin({ email, password, role });

      const token = pickToken(res);
      if (!token) throw new Error("로그인 응답에 accessToken(token)이 없습니다.");

      // ✅ BE가 role을 토큰 claim으로 넣어주므로, 여기서 role 확정
      const payload = parseJwtPayload(token);
      const rawRole = payload?.role;
      const rawSub = payload?.sub;

      if (!rawSub || typeof rawSub !== "string") {
        throw new Error("토큰 payload에 sub(memberUuid)가 없습니다.");
      }
      if (rawRole == null) {
        // 현재 BE JwtTokenProvider에서 claim("role", role.name()) 하므로 일반적으로 여기 안 걸려야 정상
        throw new Error("토큰 payload에 role이 없습니다.");
      }

      const actualRole = normalizeRole(rawRole);
      const memberUuid = rawSub;

      // ✅ UI에서 토글을 잘못 눌러도, 실제 role로 저장(자동 정정)
      login({
        token,
        role: actualRole,
        remember,
        user: {
          memberUuid,
          // name은 토큰에 없으니 우선 email로 대체 (프로필 페이지에서 /member/my로 채우면 됨)
          name: email,
        },
      });
      
      console.log("LOGIN OK -> go /main-hall");
      nav("/main-hall", { replace: true });
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
