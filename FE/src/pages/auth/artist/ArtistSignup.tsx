// FE/src/pages/auth/artist/ArtistSignup.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./artistsignup.css";

import Step1Account from "./ArtistStep1Account";
import Step2Profile from "./ArtistStep2Profile";
import Step3Optional from "./ArtistStep3Optional";
import Step4Consent from "./ArtistStep4Consent";

import type { AccountStepValue } from "../utils/validation";
import type { ArtistStep2, ArtistStep3 } from "./types";

import {
  checkEmailDupReal,
  signupArtistReal,
} from "../../../features/auth/api/real";

import type { SignupArtistRequest } from "../../../features/auth/types";

type StepKey = "ACCOUNT" | "PROFILE" | "PORTFOLIO" | "REVIEW";
const STEPS: StepKey[] = ["ACCOUNT", "PROFILE", "PORTFOLIO", "REVIEW"];

// ✅ DB에 fieldId가 1개 뿐 => 고정
const FIXED_FIELD_ID = 1;

const GENRES = [
  { id: 1, ko: "자유", en: "none" },
  { id: 2, ko: "추상화", en: "abstract" },
  { id: 3, ko: "드로잉 / 스케치", en: "drawings" },
  { id: 4, ko: "인물화", en: "figurative" },
  { id: 5, ko: "일러스트레이션", en: "illustration" },
  { id: 6, ko: "풍경화", en: "landscape" },
  { id: 7, ko: "신화화", en: "mythology" },
  { id: 8, ko: "꽃·새·동물화", en: "plants-animals" },
  { id: 9, ko: "포스터", en: "posters" },
  { id: 10, ko: "종교화", en: "religion" },
  { id: 11, ko: "정물화", en: "still-life" },
] as const;

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizePhone(v: string) {
  return v.replace(/\D/g, "");
}

export default function ArtistSignup() {
  const nav = useNavigate();
  const [step, setStep] = useState<number>(0);

  // Step1: account
  const [a1, setA1] = useState<AccountStepValue>({
    email: "",
    name: "",
    password: "",
    phone: "",
  } as AccountStepValue);

  const [password2, setPassword2] = useState("");
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Step2
  const [a2, setA2] = useState<ArtistStep2>({
    nickname: "",
    birth: "",
    affiliation: "",
    debutYear: "",
    genreId: null,
    sns: "",
  });

  // Step3
  const [a3, setA3] = useState<ArtistStep3>({
    document: null,
    artIntroduction: "",
  });

  // Step4
  const [agree, setAgree] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentKey = STEPS[step];

  const genreLabel = useMemo(() => {
    if (!a2.genreId) return "";
    return GENRES.find((g) => g.id === a2.genreId)?.ko ?? "";
  }, [a2.genreId]);

  const setStepSafe = (n: number) => {
    setError(null);
    setStep(Math.min(Math.max(n, 0), STEPS.length - 1));
  };

  const handleA1Change = (next: AccountStepValue) => {
    // ✅ 이메일 변경 시 중복확인 결과 초기화
    if (next.email !== a1.email) {
      setEmailChecked(false);
      setEmailCheckMsg(null);
    }
    setA1(next);
  };

  const onCheckEmail = async () => {
    const email = (a1.email ?? "").trim();

    if (!email) {
      setEmailChecked(false);
      setEmailCheckMsg("이메일을 입력해줘");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailChecked(false);
      setEmailCheckMsg("이메일 형식을 확인해줘");
      return;
    }

    setCheckingEmail(true);
    setEmailCheckMsg(null);

    try {
      const res = await checkEmailDupReal(email);
      setEmailChecked(res.ok);
      setEmailCheckMsg(res.message);
    } catch (e: any) {
      setEmailChecked(false);
      setEmailCheckMsg(e?.message ?? "중복 확인 실패");
    } finally {
      setCheckingEmail(false);
    }
  };

  const validateStep1 = (): string | null => {
    const email = (a1.email ?? "").trim();
    if (!email) return "이메일을 입력해줘";
    if (!isValidEmail(email)) return "이메일 형식을 확인해줘";
    if (!emailChecked) return "이메일 중복 확인을 완료해줘";

    const name = (a1.name ?? "").trim();
    if (!name) return "이름을 입력해줘";

    const pw = a1.password ?? "";
    if (pw.length < 8) return "비밀번호는 8자 이상이어야 해";
    if (pw !== password2) return "비밀번호 확인이 일치하지 않아";

    const phone = normalizePhone(a1.phone ?? "");
    if (!phone) return "전화번호를 입력해줘";
    if (phone.length < 9) return "전화번호 형식을 확인해줘";

    return null;
  };

  const validateStep2 = (): string | null => {
    if (!a2.nickname.trim()) return "닉네임을 입력해줘";
    if (!a2.birth) return "생년월일을 선택해줘";
    if (!a2.affiliation.trim()) return "소속을 입력해줘";

    if (!a2.debutYear.trim()) return "데뷔연도를 입력해줘";
    const debut = Number(a2.debutYear);
    if (!Number.isFinite(debut) || debut < 1900 || debut > 2100) {
      return "데뷔연도 형식을 확인해줘";
    }

    if (!a2.genreId) return "장르를 선택해줘";
    if (!a2.sns.trim()) return "SNS/개인웹 주소를 입력해줘";

    return null;
  };

  const validateStep3 = (): string | null => {
    if (!(a3.document instanceof File)) return "증빙서류(document)를 첨부해줘";
    if (!a3.artIntroduction.trim()) return "작가 소개(artIntroduction)를 입력해줘";
    return null;
  };

  const validateStep4 = (): string | null => {
    if (!agree) return "약관 동의가 필요해";
    return null;
  };

  const onPrev = () => setStepSafe(step - 1);

  const onNext = () => {
    setError(null);

    if (currentKey === "ACCOUNT") {
      const msg = validateStep1();
      if (msg) return setError(msg);
      return setStepSafe(step + 1);
    }

    if (currentKey === "PROFILE") {
      const msg = validateStep2();
      if (msg) return setError(msg);
      return setStepSafe(step + 1);
    }

    if (currentKey === "PORTFOLIO") {
      const msg = validateStep3();
      if (msg) return setError(msg);
      return setStepSafe(step + 1);
    }
  };

  const onSubmit = async () => {
    setError(null);

    const msg4 = validateStep4();
    if (msg4) return setError(msg4);

    const msg1 = validateStep1();
    if (msg1) return setError(msg1);

    const msg2 = validateStep2();
    if (msg2) return setError(msg2);

    const msg3 = validateStep3();
    if (msg3) return setError(msg3);

    const payload: SignupArtistRequest = {
      email: a1.email.trim(),
      password: a1.password,
      name: a1.name.trim(),
      nickname: a2.nickname.trim(),
      phone: normalizePhone(a1.phone),
      birth: a2.birth,
      role: "artist",
      isAgree: agree,

      document: a3.document as File,

      fieldId: FIXED_FIELD_ID,
      debutYear: Number(a2.debutYear),
      genreId: a2.genreId as number,

      sns: a2.sns.trim(),
      affiliation: a2.affiliation.trim(),
      artIntroduction: a3.artIntroduction.trim(),
    };

    setLoading(true);
    try {
      await signupArtistReal(payload);
      nav("/login", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-artist-page">
      <header className="auth-artist-hero">
        <h1 className="auth-artist-title">Artist Registration</h1>
        <p className="auth-artist-sub">Complete your profile to showcase your work.</p>
      </header>

      <nav className="auth-artist-stepbar">
        {STEPS.map((k, idx) => (
          <button
            key={k}
            type="button"
            className={`auth-artist-step ${idx === step ? "active" : ""}`}
            onClick={() => setStepSafe(idx)}
            disabled={loading}
          >
            {k}
          </button>
        ))}
      </nav>

      <section className="auth-artist-body">
        {currentKey === "ACCOUNT" ? (
          <Step1Account
            value={a1}
            onChange={handleA1Change}
            password2={password2}
            onChangePassword2={setPassword2}
            emailChecked={emailChecked}
            emailCheckMsg={emailCheckMsg}
            checkingEmail={checkingEmail}
            onCheckEmail={onCheckEmail}
            error={error}
          />
        ) : null}

        {currentKey === "PROFILE" ? (
          <Step2Profile
            value={a2}
            onChange={setA2}
            error={error}
            loading={loading}
            onPrev={onPrev}
            onNext={onNext}
          />
        ) : null}

        {currentKey === "PORTFOLIO" ? (
          <Step3Optional
            value={a3}
            onChange={setA3}
            error={error}
            loading={loading}
            onPrev={onPrev}
            onNext={onNext}
          />
        ) : null}

        {currentKey === "REVIEW" ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">최종 확인</div>

            <div className="auth-review">
              <div className="auth-review-row">
                <span>이메일</span>
                <b>{a1.email}</b>
              </div>
              <div className="auth-review-row">
                <span>이름</span>
                <b>{a1.name}</b>
              </div>
              <div className="auth-review-row">
                <span>닉네임</span>
                <b>{a2.nickname}</b>
              </div>
              <div className="auth-review-row">
                <span>생년월일</span>
                <b>{a2.birth}</b>
              </div>
              <div className="auth-review-row">
                <span>소속</span>
                <b>{a2.affiliation}</b>
              </div>
              <div className="auth-review-row">
                <span>데뷔연도</span>
                <b>{a2.debutYear}</b>
              </div>
              <div className="auth-review-row">
                <span>장르</span>
                <b>
                  {genreLabel} (genreId={a2.genreId ?? "-"})
                </b>
              </div>
              <div className="auth-review-row">
                <span>fieldId</span>
                <b>{FIXED_FIELD_ID} (고정)</b>
              </div>
              <div className="auth-review-row">
                <span>SNS</span>
                <b>{a2.sns}</b>
              </div>
              <div className="auth-review-row">
                <span>증빙서류</span>
                <b>{a3.document?.name ?? "-"}</b>
              </div>
            </div>

            <Step4Consent
              checked={agree}
              onChange={setAgree}
              error={error}
              loading={loading}
              onPrev={onPrev}
              onNext={onSubmit}
              submitLabel="회원가입 완료"
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
