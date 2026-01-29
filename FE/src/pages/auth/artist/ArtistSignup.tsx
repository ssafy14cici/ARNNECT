import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./artistsignup.css"; // CSS 파일명은 소문자 유지 (또는 파일명 변경 시 수정)

import Step1Account from "./ArtistStep1Account";
import SignupPreviewCard from "./ArtistSignupPreviewCard";
import StepConsent from "./ArtistStep4Consent";
import ArtistStep2Profile from "./ArtistStep2Profile";
import ArtistStep3Optional from "./ArtistStep3Optional";

import {
  validateAccountStep,
  validateArtistStep2,
  validateArtistStep3,
  validateConsent,
  maskPw,
  type AccountStepValue,
} from "../utils/validation";
import { checkEmailDupMock } from "../utils/emailDupCheck";


const ART_MAIN = ["미술", "사진", "공예", "디자인"];
const ART_SUB: Record<string, string[]> = {
  미술: ["회화", "조각", "일러스트"],
  사진: ["인물", "풍경", "스트릿"],
  공예: ["도자", "금속", "목공"],
  디자인: ["그래픽", "UI/UX", "브랜딩"],
};

type ArtistStep2Value = {
  displayName: string;
  affiliation: string;
  artMain: string;
  artSub: string;
  verified: "YES" | "NO";
  verifiedFile: File | null;
  gender: "M" | "F";
  birthYear: string;
  birthYearPublic: boolean;
};

type ArtistStep3Value = {
  contact: string;
  intro: string;
  profileImage: File | null;
  portfolioFile: File | null;
};

export default function ArtistSignup({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState(1);

  // ... (State 정의 기존 코드 유지) ...
  const [a1, setA1] = useState<AccountStepValue>({
    email: "", name: "", password: "", phone: "",
  });
  const [pw2, setPw2] = useState("");
  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState<string | null>(null);

  const [a2, setA2] = useState<ArtistStep2Value>({
    displayName: "", affiliation: "", artMain: "", artSub: "",
    verified: "NO", verifiedFile: null, gender: "M", birthYear: "", birthYearPublic: true,
  });

  const [a3, setA3] = useState<ArtistStep3Value>({
    contact: "", intro: "", profileImage: null, portfolioFile: null,
  });

  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ... (Effect 및 검증 로직 기존 코드 유지) ...
  useEffect(() => setError(null), [step]);
  useEffect(() => {
    setEmailChecked(false);
    setEmailCheckMsg(null);
  }, [a1.email]);

  const subOptions = useMemo(() => (a2.artMain ? ART_SUB[a2.artMain] ?? [] : []), [a2.artMain]);
  useEffect(() => {
    if (a2.artMain && a2.artSub && !subOptions.includes(a2.artSub)) {
      setA2((p) => ({ ...p, artSub: "" }));
    }
  }, [a2.artMain, a2.artSub, subOptions]);

  const currentYear = new Date().getFullYear();
  const birthYears = useMemo(
    () => Array.from({ length: 70 }).map((_, idx) => String(currentYear - idx)),
    [currentYear]
  );

  async function onCheckEmail() {
    setError(null);
    if (!a1.email.trim()) {
      setEmailChecked(false);
      setEmailCheckMsg("이메일을 입력해주세요.");
      return;
    }
    setCheckingEmail(true);
    try {
      const r = await checkEmailDupMock(a1.email);
      setEmailChecked(r.ok);
      setEmailCheckMsg(r.message);
    } finally {
      setCheckingEmail(false);
    }
  }

  function goNext() {
    setError(null);
    if (step === 1) {
      const msg = validateAccountStep({ v: a1, password2: pw2, emailChecked });
      if (msg) return setError(msg);
      return setStep(2);
    }
    if (step === 2) {
      const msg = validateArtistStep2(a2);
      if (msg) return setError(msg);
      return setStep(3);
    }
    if (step === 3) {
      const msg = validateArtistStep3(a3, { portfolioRequired: true });
      if (msg) return setError(msg);
      return setStep(4);
    }
  }

  function goPrev() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function submitFinal() {
    setError(null);
    const msg = validateConsent(privacyConsent);
    if (msg) return setError(msg);

    setLoading(true);
    try {
      // await apiSignupArtist(payload);
      nav("/login");
    } catch (err: any) {
      setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ====== Preview Data ======
  const previewName = a2.displayName || a1.name || "YOUR NAME";
  const previewEmail = a1.email || "email@example.com";
  const previewPw = a1.password ? "••••••••" : "—";
  const previewField = a2.artMain
    ? `${a2.artMain}${a2.artSub ? ` / ${a2.artSub}` : ""}`
    : "Art Field";

  // 프리뷰에 표시할 항목 구성 (디자인에 맞게 라벨 영문 병기 추천)
  const previewRows = [
    { k: "Account", v: previewEmail },
    { k: "Phone", v: a1.phone || "—" },
    ...(step >= 2 ? [
        { k: "Artist Name", v: a2.displayName || "—" },
        { k: "Affiliation", v: a2.affiliation || "—" },
        { k: "Field", v: previewField },
      ] : []),
    ...(step >= 3 ? [
        { k: "Contact", v: a3.contact || "—" },
        { k: "Portfolio", v: a3.portfolioFile ? "Attached" : "Pending" },
      ] : []),
  ];

  return (
    <div className="artist-signup-page">
      {/* 1. Left Preview Section (Sticky) */}
      <div className="artist-preview-section">
        <div className="preview-header">
          <button type="button" className="back-link" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Back to Type</span>
          </button>
        </div>

        <div className="preview-card-wrapper">
          <SignupPreviewCard
            badge="ARTIST"
            mainTitle="MEMBERSHIP CARD"
            stepLabel={`STEP 0${step}`}
            mainName={previewName}
            subLine={previewField}
            rows={previewRows}
          />
        </div>
        
        <div className="preview-footer">
          <p>Join the community of creators.</p>
        </div>
      </div>

      {/* 2. Right Form Section */}
      <div className="artist-form-section">
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">Artist Registration</h1>
            <p className="form-desc">Complete your profile to showcase your work.</p>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
            <div className="progress-labels">
              <span className={step >= 1 ? "active" : ""}>Account</span>
              <span className={step >= 2 ? "active" : ""}>Profile</span>
              <span className={step >= 3 ? "active" : ""}>Portfolio</span>
              <span className={step >= 4 ? "active" : ""}>Review</span>
            </div>
          </div>

          {/* Steps */}
          <div className="step-content">
            {step === 1 && (
              <Step1Account
                value={a1} onChange={setA1}
                password2={pw2} onChangePassword2={setPw2}
                emailChecked={emailChecked} emailCheckMsg={emailCheckMsg}
                checkingEmail={checkingEmail} onCheckEmail={onCheckEmail}
                error={error}
              />
            )}

            {step === 2 && (
              <ArtistStep2Profile
                value={a2} onChange={setA2}
                error={error} loading={loading}
                onPrev={goPrev} onNext={goNext}
                mainOptions={ART_MAIN} subOptions={subOptions} birthYears={birthYears}
              />
            )}

            {step === 3 && (
              <ArtistStep3Optional
                value={a3} onChange={setA3}
                error={error} onPrev={goPrev} onNext={goNext}
                loading={loading} portfolioRequired={true}
              />
            )}

            {step === 4 && (
              <StepConsent
                checked={privacyConsent} onChange={setPrivacyConsent}
                error={error} loading={loading}
                onPrev={goPrev} onNext={submitFinal}
                submitLabel="Complete Registration"
              />
            )}

            {/* Step 1 전용 Next 버튼 (Step 1 컴포넌트 내부에 버튼이 없는 경우) */}
            {step === 1 && (
              <div className="form-actions right">
                <button className="next-btn" onClick={goNext}>
                  Next Step <span className="arrow">→</span>
                </button>
              </div>
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