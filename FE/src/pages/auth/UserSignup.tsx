// src/pages/auth/UserSignup.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/auth.css";

import Step1Account from "./components/Step1Account";
import SignupPreviewCard from "./components/SignupPreviewCard";
import StepConsent from "./components/StepConsent";

import { apiSignupUser } from "../../api/auth";
import { validateAccountStep, validateConsent, maskPw, type AccountStepValue } from "./utils/validation";
import { checkEmailDupMock } from "./utils/emailDupCheck";

export default function UserSignup({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [u1, setU1] = useState<AccountStepValue>({
    email: "",
    name: "",
    password: "",
    phone: "",
  });
  const [pw2, setPw2] = useState("");

  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState<string | null>(null);

  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step change -> error reset
  useEffect(() => setError(null), [step]);

  // 이메일 바뀌면 중복확인 상태 초기화
  useEffect(() => {
    setEmailChecked(false);
    setEmailCheckMsg(null);
  }, [u1.email]);

  async function onCheckEmail() {
    setError(null);

    const email = u1.email.trim();

    // ✅ 이메일 형식 아니면 중복확인 자체를 막기 (요구사항)
    if (!email) {
      setEmailChecked(false);
      setEmailCheckMsg("이메일을 입력해주세요.");
      return;
    }

    setCheckingEmail(true);
    try {
      const r = await checkEmailDupMock(email);
      setEmailChecked(r.ok);
      setEmailCheckMsg(r.message);
    } catch (e: any) {
      setEmailChecked(false);
      setEmailCheckMsg(e?.message ?? "이메일 중복 확인에 실패했습니다.");
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
        passwordConfirm: pw2,
        name: u1.name.trim(),
        phone: u1.phone.trim(),
        agreements: {
          all: false, // 프론트에 '전체동의' UI 없으면 false로 둬도 됨
          terms: true,
          privacy: true,
          marketing: false,
        },
      });

      nav("/login");
    } catch (err: any) {
      setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const previewRows = useMemo(() => {
    return [
      { k: "이메일", v: u1.email || "—" },
      { k: "비밀번호", v: maskPw(u1.password), mono: true },
      { k: "전화번호", v: u1.phone || "—" },
      ...(step >= 2 ? [{ k: "동의", v: privacyConsent ? "동의 완료" : "미동의" }] : []),
    ];
  }, [u1.email, u1.password, u1.phone, step, privacyConsent]);

  return (
    <div className="auth-page auth-artist">
      {/* LEFT: preview */}
      <div className="auth-artist-left">
        <div className="auth-back">
          <button type="button" className="auth-back-btn" onClick={onBack}>
            ← 회원가입 유형 선택으로 돌아가기
          </button>
        </div>

        <SignupPreviewCard
          badge="USER"
          mainTitle="가입 정보 미리보기"
          stepLabel={`STEP ${step}/2`}
          mainName={u1.name || "—"}
          rows={previewRows}
        />
      </div>

      {/* RIGHT: form */}
      <div className="auth-artist-right">
        <div className="auth-artist-title">일반 회원가입</div>
        <div className="auth-artist-step">단계 {step} / 2</div>

        <div className="auth-stepbar">
          {[1, 2].map((n) => (
            <div key={n} className={`auth-stepseg ${n <= step ? "on" : ""}`} />
          ))}
        </div>

        {step === 1 ? (
          <>
            <Step1Account
              value={u1}
              onChange={setU1}
              password2={pw2}
              onChangePassword2={setPw2}
              emailChecked={emailChecked}
              emailCheckMsg={emailCheckMsg}
              checkingEmail={checkingEmail}
              onCheckEmail={onCheckEmail}
              error={error}
            />

            {/* ✅ '다음' 버튼이 Step1 컴포넌트 밖에 있어도 OK (레이아웃 통일) */}
            <button className="auth-artist-next" onClick={goNext} disabled={checkingEmail}>
              다음 &gt;
            </button>
          </>
        ) : null}

        {step === 2 ? (
          <StepConsent
            checked={privacyConsent}
            onChange={setPrivacyConsent}
            error={error}
            loading={loading}
            onPrev={goPrev}
            onNext={submitFinal}
            submitLabel={loading ? "처리 중..." : "회원가입 완료"}
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
