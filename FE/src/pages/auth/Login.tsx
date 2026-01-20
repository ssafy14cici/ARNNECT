// src/pages/auth/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiLogin } from "../../api/auth";
import type { UserRole } from "../../types/auth";
import { useAuthStore } from "../../stores/authStore";
import "../../styles/auth.css";

const toStoreRole = (r: UserRole) => (r === "USER" ? "general" : "artist");


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

  const ctaText = useMemo(() => (role === "USER" ? "로그인" : "예술인 로그인"), [role]);

  useEffect(() => setError(null), [role, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiLogin({ email, password, role, remember });
      login({ token: res.token, role: toStoreRole(res.role), remember });

      if (returnUrl) nav(returnUrl);
      else nav("/");
    } catch (err: any) {
      setError(err?.message ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page auth-login">
      <div className="auth-login-card">
        <div className="auth-login-head">
          <div className="auth-login-title">로그인</div>
          <div className="auth-login-sub">계정에 로그인하여 당신의 취향을 찾아보세요</div>
        </div>

        <div className="auth-pill">
          <button
            type="button"
            className={`auth-pill-btn ${role === "USER" ? "on" : ""}`}
            onClick={() => setRole("USER")}
          >
            일반 사용자
          </button>
          <button
            type="button"
            className={`auth-pill-btn ${role === "ARTIST" ? "on" : ""}`}
            onClick={() => setRole("ARTIST")}
          >
            관리자
          </button>
        </div>

        <form onSubmit={onSubmit} className="auth-login-form">
          <label className="auth-label">이메일</label>
          <div className="auth-input-wrap">
            <span className="auth-icon">✉️</span>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "USER" ? "example@ssaty.com" : "artist@ssaty.com"}
              autoComplete="email"
            />
          </div>

          <label className="auth-label">비밀번호</label>
          <div className="auth-input-wrap">
            <span className="auth-icon">🔒</span>
            <input
              className="auth-input"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label="비밀번호 보기"
            >
              👁️
            </button>
          </div>

          {role === "ARTIST" ? (
            <div className="auth-info">
              예술인 계정으로 로그인하시면 예술 전시 및 홍보 위주의 관리를 할 수 있습니다.
            </div>
          ) : null}

          <div className="auth-row">
            <label className="auth-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              로그인 상태 유지
            </label>

            <button type="button" className="auth-link-btn" onClick={() => alert("비밀번호 찾기(추후)")} >
              비밀번호 찾기
            </button>
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-cta" type="submit" disabled={loading}>
            {loading ? "로그인 중..." : ctaText}
          </button>

          {role === "ARTIST" ? (
            <div className="auth-artist-contact">예술인 계정 문의: <span className="accent">artist@ssaty.com</span></div>
          ) : null}

          <div className="auth-divider">
            <span />
            <div>또는</div>
            <span />
          </div>

          <div className="auth-bottom">
            계정이 없으신가요? <Link className="accent" to="/signup">회원가입</Link>
          </div>

          <div className="auth-support">
            <div>고객지원: support@ssaty.com</div>
            <div>평일 09:00 - 18:00</div>
          </div>
        </form>
      </div>
    </div>
  );
}
