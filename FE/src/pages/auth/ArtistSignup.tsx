// src/pages/auth/ArtistSignup.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";

import Step1Account from "./components/Step1Account";
import SignupPreviewCard from "./components/SignupPreviewCard";
import StepConsent from "./components/StepConsent";
import ArtistStep2Profile from "./components/ArtistStep2Profile";
import ArtistStep3Optional from "./components/ArtistStep3Optional";

import {
  validateAccountStep,
  validateArtistStep2,
  validateArtistStep3,
  validateConsent,
  maskPw,
  type AccountStepValue,
} from "./utils/validation";
import { checkEmailDupMock } from "./utils/emailDupCheck";


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
  intro: string;               // ✅ 선택
  profileImage: File | null;   // ✅ 선택
  portfolioFile: File | null;  // (현재: 필수)
};

export default function ArtistSignup({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState(1);

  // step1(공통)
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

  // step2(artist)
  const [a2, setA2] = useState<ArtistStep2Value>({
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

  // step3(artist) - intro/profileImage 선택
  const [a3, setA3] = useState<ArtistStep3Value>({
    contact: "",
    intro: "",
    profileImage: null,
    portfolioFile: null,
  });

  // step4(공통 동의)
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [step]);

  // ✅ 이메일 변경되면 중복확인 초기화
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
      // ✅ intro/profileImage는 선택, 포트폴리오는 현재 필수
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
      // TODO: 실제 API 연동 시 payload 맞춰서 전송
      // await apiSignupArtist(payload);
      nav("/login");
    } catch (err: any) {
      setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ====== Preview ======
  const previewName = a2.displayName || a1.name || "—";
  const previewEmail = a1.email || "—";
  const previewPw = maskPw(a1.password);
  const previewField = a2.artMain
    ? `${a2.artMain}${a2.artSub ? ` / ${a2.artSub}` : ""}`
    : "—";

  const previewRows = [
    { k: "이메일", v: previewEmail },
    { k: "비밀번호", v: previewPw, mono: true },
    { k: "전화번호", v: a1.phone || "—" },
    ...(step >= 2
      ? [
          { k: "활동명", v: a2.displayName || "—" },
          { k: "소속", v: a2.affiliation || "—" },
          { k: "분야", v: previewField },
        ]
      : []),
    ...(step >= 3
      ? [
          { k: "소통창구", v: a3.contact || "—" },
          { k: "소개", v: a3.intro ? `${a3.intro.length}자 입력` : "—" }, // ✅ 선택
          { k: "프로필", v: a3.profileImage?.name || "—" },              // ✅ 선택
          { k: "포트폴리오", v: a3.portfolioFile?.name || "—" },         // (현재 필수)
        ]
      : []),
    ...(step >= 4 ? [{ k: "동의", v: privacyConsent ? "동의 완료" : "미동의" }] : []),
  ];

  return (
    <div className="auth-page auth-artist">
      <div className="auth-artist-left">
        <div className="auth-back">
          <button type="button" className="auth-back-btn" onClick={onBack}>
            ← 회원가입 유형 선택으로 돌아가기
          </button>
        </div>

        <SignupPreviewCard
          badge="ARTIST"
          mainTitle="가입 정보 미리보기"
          stepLabel={`STEP ${step}/4`}
          mainName={previewName}
          subLine={previewField}
          rows={previewRows}
        />
      </div>

      <div className="auth-artist-right">
        <div className="auth-artist-title">예술인 회원가입</div>
        <div className="auth-artist-step">단계 {step} / 4</div>

        <div className="auth-stepbar">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`auth-stepseg ${n <= step ? "on" : ""}`} />
          ))}
        </div>

        {step === 1 ? (
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
            <button className="auth-artist-next" onClick={goNext}>
              다음 &gt;
            </button>
          </>
        ) : null}

        {step === 2 ? (
          <ArtistStep2Profile
            value={a2}
            onChange={setA2}
            error={error}
            loading={loading}
            onPrev={goPrev}
            onNext={goNext}
            mainOptions={ART_MAIN}
            subOptions={subOptions}
            birthYears={birthYears}
          />
        ) : null}


        {step === 3 ? (
          <ArtistStep3Optional
            value={a3}
            onChange={setA3}
            error={error}
            onPrev={goPrev}
            onNext={goNext}
            loading={loading}
            portfolioRequired={true}
          />
        ) : null}

        {step === 4 ? (
          <StepConsent
            checked={privacyConsent}
            onChange={setPrivacyConsent}
            error={error}
            loading={loading}
            onPrev={goPrev}
            onNext={submitFinal}
            submitLabel="회원가입 완료"
          />
        ) : null}

        <div className="auth-artist-bottom">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="accent">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
