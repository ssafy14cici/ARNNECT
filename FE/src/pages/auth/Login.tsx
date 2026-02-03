// FE/src/pages/auth/Login.tsx
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { apiLogin } from "../../features/auth/api";
import type { LoginResponse, UserRole } from "../../features/auth/types";
import { useAuthStore } from "../../features/auth/store";

import "./login.css";
import { USE_MOCK } from "../../shared/config/env";

// ✅ REAL 모드에서만 사용: /api/v1/member/my 로 role 확정
// (경로는 유저 프로젝트에 맞게 조정: 현재는 real.ts에 getMyReal을 추가한다고 가정)
import { getMyReal } from "../../features/auth/api/real";

// ---------- helpers ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasKey<K extends string>(obj: Record<string, unknown>, key: K): obj is Record<K, unknown> {
  return key in obj;
}
function pickStr(obj: Record<string, unknown>, key: string): string | undefined {
  if (!hasKey(obj, key)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * ✅ 서버 role이 어떤 형태로 오든 FE 표준("general"|"artist")로 정규화
 * - ARTIST / artist / ROLE_ARTIST / ... => artist
 * - USER / GENERAL / general / ROLE_USER / ... => general
 */
function normalizeRole(input: unknown): "general" | "artist" {
  const v = String(input ?? "").toLowerCase();
  if (v.includes("artist")) return "artist";
  if (v.includes("user") || v.includes("general")) return "general";
  return "general";
}

/** ✅ UI 토글은 UserRole을 쓰되, CSS가 USER/ARTIST 클래스에 의존할 수 있어 UI용 라벨로 변환 */
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

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();

  const returnUrl = sp.get("returnUrl") || pickReturnUrlFromState(location.state as unknown) || null;

  const login = useAuthStore((s) => s.login);

  // ✅ UI 토글 (프로젝트 UserRole이 "general" | "artist" 인 전제)
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
  const subTitle = uiRole === "USER" ? "Discover your taste in art." : "Share your inspiration with the world.";

  useEffect(() => setError(null), [role, email, password]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // apiLogin은 (mock/real) 모두 LoginResponse 형태를 리턴한다고 가정
      const res: LoginResponse = await apiLogin({ email, password, role });

      const token = pickToken(res);
      if (!token) throw new Error("로그인 응답에 accessToken(token)이 없습니다.");

      // ✅ 선택한 탭(role)
      const selectedRole = normalizeRole(role);

      // ✅ REAL: 무조건 /member/my로 실제 role 확정
      // - /member/my가 실패하면 role을 신뢰할 수 없으니 로그인 실패 처리 (원하는 UX 기준)
      if (!USE_MOCK) {
        const my = await getMyReal(token);

        // 서버가 role을 안 주는 경우: 프론트만으로 계정 타입 판별 불가
        if (my.role == null) {
          throw new Error("서버(/member/my) 응답에 role이 없어 계정 유형을 판별할 수 없습니다.");
        }

        const actualRole = normalizeRole(my.role);

        // ✅ 탭(선택 role)과 실제 role이 다르면 로그인 거절
        if (actualRole !== selectedRole) {
          throw new Error(
            actualRole === "artist"
              ? "아티스트 계정입니다. Artist 탭으로 로그인하세요."
              : "유저 계정입니다. Collector 탭으로 로그인하세요.",
          );
        }

        login({
          token,
          role: actualRole,
          remember,
          user: {
            memberUuid: my.memberUuid || "me",
            name: my.name || "user",
          },
        });

        nav(returnUrl || "/", { replace: true });
        return;
      }

      // ✅ MOCK: 실제 role 확정 루트가 없으니 선택 role로 저장
      login({
        token,
        role: selectedRole,
        remember,
        user: {
          memberUuid: "me",
          name: "user",
        },
      });

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
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
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
