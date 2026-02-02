// FE/src/pages/auth/artist/ArtistSignup.tsx

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./artistsignup.css";

import Step1Account from "./ArtistStep1Account";
import SignupPreviewCard from "./ArtistSignupPreviewCard";
import StepConsent from "./ArtistStep4Consent";

import ArtistStep2Profile from "./ArtistStep2Profile";
import ArtistStep3Optional from "./ArtistStep3Optional";

import type { ArtistStep2, ArtistStep3 } from "./types";

import {
  validateAccountStep,
  validateArtistStep2,
  validateArtistStep3,
  validateConsent,
  type AccountStepValue,
} from "../utils/validation";

import { apiCheckEmailDup, apiSignupArtist } from "../../../features/auth/api";

const ART_MAIN = ["미술", "사진", "공예", "디자인"] as const;
const ART_SUB: Record<string, string[]> = {
  미술: ["회화", "조각", "일러스트"],
  사진: ["인물", "풍경", "스트릿"],
  공예: ["도자", "금속", "목공"],
  디자인: ["그래픽", "UI/UX", "브랜딩"],
};

export default function ArtistSignup({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [a1, setA1] = useState<AccountStepValue>({
    email: "",
    name: "",
    password: "",
    phone: "",
  });
  const [pw2, setPw2] = useState("");

  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState<string | null>(null);

  const [a2, setA2] = useState<ArtistStep2>({
    displayName: "",
    affiliation: "",
    artMain: "",
    artSub: "",
    verified: "NO",
    verifiedFile: null,
    gender: "M",
    birthYear: "",
    birthYearPublic: true,
  });

  const [a3, setA3] = useState<ArtistStep3>({
    contact: "",
    intro: "",
    profileImage: null,
    portfolioFile: null,
  });

  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // error reset
  useEffect(() => setError(null), [step]);

  // email check reset when email changes
  useEffect(() => {
    setEmailChecked(false);
    setEmailCheckMsg(null);
  }, [a1.email]);

  const subOptions = useMemo(
    () => (a2.artMain ? ART_SUB[a2.artMain] ?? [] : []),
    [a2.artMain],
  );

  // artSub validity guard
  useEffect(() => {
    if (a2.artMain && a2.artSub && !subOptions.includes(a2.artSub)) {
      setA2((p) => ({ ...p, artSub: "" }));
    }
  }, [a2.artMain, a2.artSub, subOptions]);

  const currentYear = new Date().getFullYear();
  const birthYears = useMemo(
    () => Array.from({ length: 70 }).map((_, idx) => String(currentYear - idx)),
    [currentYear],
  );

  async function onCheckEmail() {
    setError(null);

    const email = a1.email.trim();
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
      const msg = validateAccountStep({ v: a1, password2: pw2, emailChecked });
      if (msg) return setError(msg);
      setStep(2);
      return;
    }

    if (step === 2) {
      const msg = validateArtistStep2(a2);
      if (msg) return setError(msg);
      setStep(3);
      return;
    }

    if (step === 3) {
      const msg = validateArtistStep3(a3, { portfolioRequired: true });
      if (msg) return setError(msg);
      setStep(4);
      return;
    }
  }

  function goPrev() {
    setError(null);
    setStep((s) => {
      switch (s) {
        case 4:
          return 3;
        case 3:
          return 2;
        case 2:
          return 1;
        default:
          return 1;
      }
    });
  }

  async function submitFinal() {
    setError(null);

    const msg = validateConsent(privacyConsent);
    if (msg) return setError(msg);

    setLoading(true);
    try {
      const birth = a2.birthYear ? `${a2.birthYear}-01-01` : "2000-01-01";

      await apiSignupArtist({
        email: a1.email.trim(),
        password: a1.password,
        name: a1.name.trim(),
        nickname: (a2.displayName || a1.name).trim(),
        phone: a1.phone.trim(),
        birth,

        // ⚠️ 여기 role은 "백엔드 타입"에 맞춰야 함.
        // Postman 예시는 general이었고, FE는 artist를 쓰고 싶어함.
        // 일단 타입 에러 나면 "general"로 바꿔서 통신부터 확인해.
        role: "artist" as any,

        isAgree: privacyConsent,

        document: a2.verifiedFile ?? "file",

        // 통신 확인용 임시값 (추후 field/genre 매핑 필요)
        fieldId: 1,
        debutYear: new Date().getFullYear(),
        genreId: 1,

        sns: a3.contact || "string",
        affiliation: a2.affiliation || "string",
        artIntroduction: a3.intro || "string",
      });

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
  const previewField = a2.artMain
    ? `${a2.artMain}${a2.artSub ? ` / ${a2.artSub}` : ""}`
    : "Art Field";

  const previewRows = [
    { k: "Account", v: previewEmail },
    { k: "Phone", v: a1.phone || "—" },
    ...(step >= 2
      ? [
          { k: "Artist Name", v: a2.displayName || "—" },
          { k: "Affiliation", v: a2.affiliation || "—" },
          { k: "Field", v: previewField },
        ]
      : []),
    ...(step >= 3
      ? [
          { k: "Contact", v: a3.contact || "—" },
          { k: "Portfolio", v: a3.portfolioFile ? "Attached" : "Pending" },
        ]
      : []),
  ];

  return (
    <div className="artist-signup-page">
      {/* 1. Left Preview Section (Sticky) */}
      <div className="artist-preview-section">
        <div className="preview-header">
          <button type="button" className="back-link" onClick={onBack}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
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
            <p className="form-desc">
              Complete your profile to showcase your work.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${(step / 4) * 100}%` }}
              />
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
              <>
                <Step1Account
                  value={a1}
                  onChange={setA1}
                  password2={pw2}
                  onChangePassword2={setPw2}
                  emailChecked={emailChecked}
                  emailCheckMsg={emailCheckMsg}
                  checkingEmail={checkingEmail}
                  onCheckEmail={onCheckEmail}
                  error={error}
                />

                <div className="form-actions right">
                  <button className="next-btn" onClick={goNext}>
                    Next Step <span className="arrow">→</span>
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <ArtistStep2Profile
                value={a2}
                onChange={setA2}
                error={error}
                loading={loading}
                onPrev={goPrev}
                onNext={goNext}
                mainOptions={[...ART_MAIN]}
                subOptions={subOptions}
                birthYears={birthYears}
              />
            )}

            {step === 3 && (
              <ArtistStep3Optional
                value={a3}
                onChange={setA3}
                error={error}
                onPrev={goPrev}
                onNext={goNext}
                loading={loading}
                portfolioRequired={true}
              />
            )}

            {step === 4 && (
              <StepConsent
                checked={privacyConsent}
                onChange={setPrivacyConsent}
                error={error}
                loading={loading}
                onPrev={goPrev}
                onNext={submitFinal}
                submitLabel="Complete Registration"
              />
            )}
          </div>

          <div className="form-footer">
            Already have an account?{" "}
            <Link to="/login" className="login-link">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
