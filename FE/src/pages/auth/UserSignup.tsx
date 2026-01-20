import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/auth.css";
import { apiSignupUser } from "../../api/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const isValidEmail = (v: string) => EMAIL_REGEX.test(v.trim());

export default function UserSignup({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();

  const [uEmail, setUEmail] = useState("");
  const [uPw, setUPw] = useState("");
  const [uPw2, setUPw2] = useState("");
  const [uName, setUName] = useState("");
  const [uPhone, setUPhone] = useState("");
  const [uShowPw, setUShowPw] = useState(false);
  const [uShowPw2, setUShowPw2] = useState(false);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const all = agreeTerms && agreePrivacy && agreeMarketing;
    setAgreeAll(all);
  }, [agreeTerms, agreePrivacy, agreeMarketing]);

  function toggleAll(next: boolean) {
    setAgreeAll(next);
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeMarketing(next);
  }

  const emailOk = useMemo(() => isValidEmail(uEmail), [uEmail]);
  const pwOk = useMemo(() => uPw.trim().length >= 8, [uPw]);
  const pwMatch = useMemo(() => uPw.length > 0 && uPw === uPw2, [uPw, uPw2]);
  const requiredOk = useMemo(() => uName.trim() && uPhone.trim(), [uName, uPhone]);

  const canSubmit =
    emailOk && pwOk && pwMatch && !!requiredOk && agreeTerms && agreePrivacy && !loading;

  async function submitUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!emailOk) return setError("이메일 형식을 확인해주세요. (예: example@email.com)");
    if (!pwOk) return setError("비밀번호는 8자 이상으로 입력해주세요.");
    if (!pwMatch) return setError("비밀번호 확인이 일치하지 않습니다.");
    if (!agreeTerms || !agreePrivacy) return setError("필수 약관 동의가 필요합니다.");

    setLoading(true);
    try {
      await apiSignupUser({
        email: uEmail.trim(),
        password: uPw,
        passwordConfirm: uPw2,
        name: uName.trim(),
        phone: uPhone.trim(),
        agreements: { all: agreeAll, terms: agreeTerms, privacy: agreePrivacy, marketing: agreeMarketing },
      });
      nav("/login");
    } catch (err: any) {
      setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page auth-center">
      <div className="auth-back">
        <button type="button" className="auth-back-btn" onClick={onBack}>
          ← 회원가입 유형 선택으로 돌아가기
        </button>
      </div>

      <div className="auth-center-card">
        <div className="auth-center-icon">🧾</div>
        <div className="auth-center-title">회원가입</div>
        <div className="auth-center-sub">회원가입을 위해 정보를 입력해주세요</div>

        <form onSubmit={submitUser} className="auth-center-form">
          <label className="auth-label">이메일 <span className="req">*</span></label>
          <input
            className="auth-center-input"
            type="email"
            required
            value={uEmail}
            onChange={(e) => setUEmail(e.target.value)}
            placeholder="example@email.com"
            autoComplete="email"
            inputMode="email"
          />
          {!emailOk && uEmail.length > 0 ? (
            <div className="auth-help">이메일 형식이 아니에요. (예: example@email.com)</div>
          ) : null}

          <label className="auth-label">비밀번호 <span className="req">*</span></label>
          <div className="auth-center-inputwrap">
            <input
              className="auth-center-input"
              type={uShowPw ? "text" : "password"}
              required
              value={uPw}
              onChange={(e) => setUPw(e.target.value)}
              placeholder="8자 이상 입력해주세요"
              autoComplete="new-password"
            />
            <button type="button" className="auth-eye" onClick={() => setUShowPw(v => !v)}>👁️</button>
          </div>

          <label className="auth-label">비밀번호 확인 <span className="req">*</span></label>
          <div className="auth-center-inputwrap">
            <input
              className="auth-center-input"
              type={uShowPw2 ? "text" : "password"}
              required
              value={uPw2}
              onChange={(e) => setUPw2(e.target.value)}
              placeholder="비밀번호를 다시 입력해주세요"
              autoComplete="new-password"
            />
            <button type="button" className="auth-eye" onClick={() => setUShowPw2(v => !v)}>👁️</button>
          </div>

          <label className="auth-label">이름 <span className="req">*</span></label>
          <input className="auth-center-input" required value={uName} onChange={(e) => setUName(e.target.value)} placeholder="홍길동" />

          <label className="auth-label">전화번호 <span className="req">*</span></label>
          <input className="auth-center-input" required value={uPhone} onChange={(e) => setUPhone(e.target.value)} placeholder="010-1234-5678" />

          <div className="auth-agree">
            <label className="auth-checkline">
              <input type="checkbox" checked={agreeAll} onChange={(e) => toggleAll(e.target.checked)} />
              전체 동의
            </label>
            <label className="auth-checkline">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
              <span className="req">*</span> 이용약관 동의
            </label>
            <label className="auth-checkline">
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
              <span className="req">*</span> 개인정보 처리방침 동의
            </label>
            <label className="auth-checkline">
              <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} />
              마케팅 정보 수신 동의 (선택)
            </label>
          </div>

          {error ? <div className="auth-error dark">{error}</div> : null}

          <button className="auth-center-cta" type="submit" disabled={!canSubmit}>
            {loading ? "처리 중..." : "회원가입"}
          </button>

          <div className="auth-center-bottom">
            이미 계정이 있으신가요? <Link to="/login" className="accent">로그인</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
