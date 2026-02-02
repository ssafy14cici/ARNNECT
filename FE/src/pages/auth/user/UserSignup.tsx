//FE/src/pages/auth/user/UserSignup.tsx

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./usersignup.css"; // CSS 파일명 확인

import Step1Account from "./UserStep1Account";
import SignupPreviewCard from "./UserSignupPreviewCard";
import StepConsent from "./UserStep2Consent";
import { apiSignupUser } from "../../../features/auth/api";
import { validateAccountStep, validateConsent, type AccountStepValue } from "../utils/validation";
import { apiCheckEmailDup } from "../../../features/auth/api";

export default function UserSignup({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [u1, setU1] = useState<AccountStepValue>({
    email: "", name: "", password: "", phone: "",
  });
  const [pw2, setPw2] = useState("");

  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState<string | null>(null);

  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Error Reset
  useEffect(() => setError(null), [step]);

  // Email check reset
  useEffect(() => {
    setEmailChecked(false);
    setEmailCheckMsg(null);
  }, [u1.email]);

  async function onCheckEmail() {
    setError(null);
    const email = u1.email.trim();
    if (!email) {
      setEmailChecked(false);
      setEmailCheckMsg("이메일을 입력해주세요.");
      return;
    }
    setCheckingEmail(true);
    try {
      const r = await apiCheckEmailDup(email);
      setEmailChecked(r.ok);
      setEmailCheckMsg(r.message);
    } catch (e: any) {
      setEmailChecked(false);
      setEmailCheckMsg(e?.message ?? "확인 실패");
    } finally {
      setCheckingEmail(false);
    }
  }

  function goNext() {
    setError(null);
    if (step === 1) {
      const msg = validateAccountStep({ v: u1, password2: pw2, emailChecked });
      if (msg) return setError(msg);
      setStep(2);
    }
  }

  function goPrev() {
    setError(null);
    setStep(1);
  }

  async function submitFinal() {
    setError(null);
    const msg = validateConsent(privacyConsent);
    if (msg) return setError(msg);

    setLoading(true);
    try {
      await apiSignupUser({
       email: u1.email.trim(),
       password: u1.password,
       name: u1.name.trim(),
       nickname: u1.name.trim(),      // ✅ 일단 name으로 대체 (닉네임 입력 UI 만들면 교체)
       phone: u1.phone.trim(),
       birth: "2000-01-01",           // ✅ TODO: UI에서 받도록 추가 권장
       role: "general",
       isAgree: privacyConsent,       // ✅ Step2 동의 여부 → isAgree 매핑
     });
      nav("/login");
    } catch (err: any) {
      setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ====== Preview Data ======
  const previewName = u1.name || "YOUR NAME";
  const previewEmail = u1.email || "email@example.com";
  
  const previewRows = useMemo(() => {
    return [
      { k: "Account", v: previewEmail },
      { k: "Phone", v: u1.phone || "—" },
      // Step 2에서 동의 여부 표시
      ...(step >= 2 ? [{ k: "Agreements", v: privacyConsent ? "Signed" : "Pending" }] : []),
    ];
  }, [previewEmail, u1.phone, step, privacyConsent]);

  return (
    <div className="user-signup-page">
      
      {/* 1. Left Preview Section (Sticky) */}
      <div className="user-preview-section">
        <div className="preview-header">
          <button type="button" className="back-link" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Back to Type</span>
          </button>
        </div>

        <div className="preview-card-wrapper">
          <SignupPreviewCard
            badge="COLLECTOR" // USER -> COLLECTOR 명칭 변경 (디자인용)
            mainTitle="MEMBERSHIP CARD"
            stepLabel={`STEP 0${step}`}
            mainName={previewName}
            // User는 별도 서브라인(분야)이 없으므로 심플하게 처리
            subLine="General Member" 
            rows={previewRows}
          />
        </div>

        <div className="preview-footer">
          <p>Discover your taste in art.</p>
        </div>
      </div>

      {/* 2. Right Form Section */}
      <div className="user-form-section">
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">Collector Registration</h1>
            <p className="form-desc">Create an account to start your collection journey.</p>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-track">
              {/* 2단계이므로 50% / 100% */}
              <div className="progress-fill" style={{ width: step === 1 ? '50%' : '100%' }} />
            </div>
            <div className="progress-labels">
              <span className={step >= 1 ? "active" : ""}>Account Info</span>
              <span className={step >= 2 ? "active" : ""}>Review & Join</span>
            </div>
          </div>

          {/* Steps Content */}
          <div className="step-content">
            {step === 1 && (
              <>
                <Step1Account
                  value={u1} onChange={setU1}
                  password2={pw2} onChangePassword2={setPw2}
                  emailChecked={emailChecked} emailCheckMsg={emailCheckMsg}
                  checkingEmail={checkingEmail} onCheckEmail={onCheckEmail}
                  error={error}
                />
                
                {/* Next Button */}
                <div className="form-actions right">
                  <button className="next-btn" onClick={goNext}>
                    Next Step <span className="arrow">→</span>
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <StepConsent
                checked={privacyConsent} onChange={setPrivacyConsent}
                error={error} loading={loading}
                onPrev={goPrev} onNext={submitFinal}
                submitLabel="Complete Registration"
              />
            )}
          </div>

          <div className="form-footer">
            Already have an account? <Link to="/login" className="login-link">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}