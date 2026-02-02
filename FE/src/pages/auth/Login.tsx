// FE/src/pages/auth/Login.tsx
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { apiLogin } from "../../features/auth/api";
import type { LoginResponse, UserRole } from "../../features/auth/types";
import { useAuthStore } from "../../features/auth/store";

import "./login.css";
import { USE_MOCK } from "../../shared/config/env";

// ---------- type guards ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasKey<K extends string>(
  obj: Record<string, unknown>,
  key: K
): obj is Record<K, unknown> {
  return key in obj;
}
function pickStr(obj: Record<string, unknown>, key: string): string | undefined {
  if (!hasKey(obj, key)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

// ✅ 서버에서 role이 어떤 형태로 오든("USER"/"GENERAL"/"general"/"ARTIST"/"artist") FE 표준("general"|"artist")로 정규화
function normalizeRole(input: unknown): "general" | "artist" {
  const v = String(input ?? "").toLowerCase();
  if (v === "artist") return "artist";
  return "general";
}

// ✅ UI 토글은 UserRole을 쓰되, CSS가 기존에 USER/ARTIST 클래스에 의존할 수 있어서 UI용 라벨을 따로 만든다
function toUiRole(role: UserRole): "USER" | "ARTIST" {
  return String(role).toLowerCase() === "artist" ? "ARTIST" : "USER";
}

/** BE envelope/평문 응답 모두 처리 (data/result 있으면 unwrap) */
function unwrapEnvelope<T>(json: unknown): T {
  if (!isRecord(json)) return json as T;

  const obj: Record<string, unknown> = json;

  if (Object.prototype.hasOwnProperty.call(obj, "data")) {
    return obj["data"] as T;
  }
  if (Object.prototype.hasOwnProperty.call(obj, "result")) {
    return obj["result"] as T;
  }
  return json as T;
}

/** location.state에서 from 경로 안전하게 뽑기 */
function pickReturnUrlFromState(state: unknown): string | null {
  if (!isRecord(state)) return null;
  const from = state.from;
  return typeof from === "string" && from.trim() ? from : null;
}

/** /api/v1/member/my 호출 (스키마 미확정이라 관대하게 파싱) */
async function fetchMy(accessToken: string): Promise<{
  memberUuid: string;
  name: string;
  role: "general" | "artist";
}> {
  const API_BASE_RAW = import.meta.env.VITE_API_BASE_URL ?? "";
  const API_BASE = API_BASE_RAW.replace(/\/$/, "");
  const url = `${API_BASE}/api/v1/member/my`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    json = text; // JSON 아니면 text
  }

  if (!res.ok) {
    const msg =
      isRecord(json) && hasKey(json, "message") ? String(json.message ?? "") : String(text ?? "");
    throw new Error(`HTTP ${res.status} - ${msg || `${res.status} ${res.statusText}`}`);
  }

  const unwrapped = unwrapEnvelope<unknown>(json);
  const data = isRecord(unwrapped) ? unwrapped : {};

  // role 후보 키들
  const rawRole =
    pickStr(data, "role") ??
    pickStr(data, "userRole") ??
    pickStr(data, "memberRole") ??
    pickStr(data, "type") ??
    pickStr(data, "accountType") ??
    "";

  // uuid 후보 키들
  const rawUuid =
    pickStr(data, "memberUuid") ??
    pickStr(data, "memberUUID") ??
    pickStr(data, "uuid") ??
    pickStr(data, "memberId") ??
    pickStr(data, "id") ??
    "";

  // name 후보 키들
  const rawName =
    pickStr(data, "name") ??
    pickStr(data, "nickname") ??
    pickStr(data, "displayName") ??
    pickStr(data, "userName") ??
    pickStr(data, "username") ??
    "";

  return {
    memberUuid: String(rawUuid ?? ""),
    name: String(rawName ?? ""),
    role: normalizeRole(rawRole),
  };
}

/** apiLogin 응답에서 token 안전하게 뽑기 */
function pickToken(res: unknown): string | null {
  if (!isRecord(res)) return null;
  const token = pickStr(res, "token");
  return token && token.trim() ? token : null;
}

/** apiLogin 응답에서 memberUuid/name 안전하게 뽑기 (mock일 때만 의미 있음) */
function pickLoginUser(res: unknown): { memberUuid?: string; name?: string; role?: unknown } {
  if (!isRecord(res)) return {};
  return {
    memberUuid: pickStr(res, "memberUuid"),
    name: pickStr(res, "name"),
    role: res["role"],
  };
}

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();

  const returnUrl =
    sp.get("returnUrl") ||
    pickReturnUrlFromState(location.state as unknown) ||
    null;

  const login = useAuthStore((s) => s.login);

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
      // apiLogin은 (mock/real) 모두 LoginResponse 형태를 리턴한다고 가정
      const res: LoginResponse = await apiLogin({ email, password, role });

      const token = pickToken(res);
      if (!token) throw new Error("로그인 응답에 accessToken(token)이 없습니다.");

      // 기본값: UI 선택 role
      let appRole: "general" | "artist" = normalizeRole(role);
      let memberUuid = "";
      let name = "";

      // mock이면 응답에 memberUuid/name/role이 들어있을 수 있음
      const fromRes = pickLoginUser(res);
      if (fromRes.role != null) appRole = normalizeRole(fromRes.role);
      if (fromRes.memberUuid) memberUuid = fromRes.memberUuid;
      if (fromRes.name) name = fromRes.name;

      // real이면 /member/my로 실제 사용자 정보 채우기 권장
      if (!USE_MOCK) {
        try {
          const my = await fetchMy(token);
          appRole = my.role || appRole;
          memberUuid = my.memberUuid || memberUuid;
          name = my.name || name;
        } catch (e2) {
          // /member/my 실패해도 로그인 자체는 유지
          console.warn(e2);
        }
      }

      login({
        token,
        role: appRole,
        remember, // store 내부에서 무시해도 시그니처 때문에 전달
        user: {
          memberUuid: memberUuid || "me",
          name: name || "user",
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
