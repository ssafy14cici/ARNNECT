// src/pages/auth/ArtistSignup.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/auth.css";
import { apiSignupArtist } from "../../api/auth";
import type { ArtistStep1, ArtistStep2, ArtistStep3, ArtistStep4, SignupArtistRequest } from "../../types/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const isValidEmail = (v: string) => EMAIL_REGEX.test(v.trim());

const ART_MAIN = ["미술", "사진", "공예", "디자인", "음악", "문학"];
const ART_SUB: Record<string, string[]> = {
  미술: ["회화", "조각", "일러스트"],
  사진: ["인물", "풍경", "스트릿"],
  공예: ["도자", "금속", "목공"],
  디자인: ["그래픽", "UI/UX", "브랜딩"],
  음악: ["작곡", "연주", "보컬"],
  문학: ["시", "소설", "에세이"],
};

export default function ArtistSignup({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();

  const [step, setStep] = useState(1);

  const [a1, setA1] = useState<ArtistStep1>({
    email: "",
    name: "",
    password: "",
    phone: "",
  });

  const [a2, setA2] = useState<ArtistStep2>({
    displayName: "",
    affiliation: "",
    artMain: "",
    artSub: "",
    verified: "NO",
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

  const [a4, setA4] = useState<ArtistStep4>({
    privacyConsent: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step/mode change -> error reset
  useEffect(() => setError(null), [step]);

  // sub options
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

  // -----------------------
  // VALIDATION (step gate)
  // -----------------------
  function validateStep1() {
    if (!isValidEmail(a1.email)) return "이메일 형식을 확인해주세요. (예: example@email.com)";
    if (!a1.name.trim()) return "이름을 입력해주세요.";
    if (a1.password.trim().length < 8) return "비밀번호는 8자 이상으로 입력해주세요.";
    if (!a1.phone.trim()) return "전화번호를 입력해주세요.";
    return null;
  }

  function validateStep2() {
    if (!a2.displayName.trim()) return "성명(활동명)을 입력해주세요.";
    if (!a2.artMain) return "예술활동분야(대분류)를 선택해주세요.";
    if (!a2.artSub) return "예술활동분야(소분류)를 선택해주세요.";
    if (!a2.birthYear) return "출생연도를 선택해주세요.";
    // verified/gender는 라디오 기본값이 있어서 별도 체크 필요 없음
    return null;
  }

  function validateStep3() {
    if (!a3.intro.trim()) return "예술활동 소개를 입력해주세요.";
    if (!a3.profileImage) return "프로필 이미지를 업로드해주세요.";
    if (!a3.portfolioFile) return "포트폴리오 파일을 첨부해주세요.";
    return null;
  }

  function validateStep4() {
    if (!a4.privacyConsent) return "개인정보 수집·이용 동의가 필요합니다.";
    return null;
  }

  function goNext() {
    setError(null);
    if (step === 1) {
      const msg = validateStep1();
      if (msg) return setError(msg);
      return setStep(2);
    }
    if (step === 2) {
      const msg = validateStep2();
      if (msg) return setError(msg);
      return setStep(3);
    }
    if (step === 3) {
      const msg = validateStep3();
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
    const msg = validateStep4();
    if (msg) return setError(msg);

    setLoading(true);
    try {
      const payload: SignupArtistRequest = {
        ...a1,
        ...a2,
        ...a3,
        ...a4,
      };
      await apiSignupArtist(payload);
      nav("/login");
    } catch (err: any) {
      setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className="auth-page auth-artist">
      <div className="auth-artist-left">
        <div className="auth-back">
          <button type="button" className="auth-back-btn" onClick={onBack}>
            ← 회원가입 유형 선택으로 돌아가기
          </button>
        </div>

        <div className="auth-artist-left-card">
          <div className="auth-artist-avatar">🖼️</div>
          <div className="auth-artist-left-text">
            나는 <span className="accent">{a2.displayName?.trim() ? a2.displayName : "___"}</span> 아티스트입니다
          </div>
        </div>
      </div>

      <div className="auth-artist-right">
        <div className="auth-artist-title">예술인 회원가입</div>
        <div className="auth-artist-step">단계 {step} / 4</div>

        <div className="auth-stepbar">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`auth-stepseg ${n <= step ? "on" : ""}`} />
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">계정 정보</div>

            <label className="auth-label">
              이메일 <span className="req">*</span>
            </label>
            <input
              className="auth-dark-input"
              type="email"
              required
              value={a1.email}
              onChange={(e) => setA1((p) => ({ ...p, email: e.target.value }))}
              placeholder="example@email.com"
              autoComplete="email"
              inputMode="email"
            />
            {!isValidEmail(a1.email) && a1.email.length > 0 ? (
              <div className="auth-help">이메일 형식이 아니에요. (예: example@email.com)</div>
            ) : null}

            <label className="auth-label">
              이름 <span className="req">*</span>
            </label>
            <input
              className="auth-dark-input"
              value={a1.name}
              onChange={(e) => setA1((p) => ({ ...p, name: e.target.value }))}
              placeholder="홍길동"
              required
            />

            <label className="auth-label">
              비밀번호 <span className="req">*</span>
            </label>
            <input
              className="auth-dark-input"
              type="password"
              value={a1.password}
              onChange={(e) => setA1((p) => ({ ...p, password: e.target.value }))}
              placeholder="8자 이상 입력해주세요"
              autoComplete="new-password"
              required
            />

            <label className="auth-label">
              전화번호 <span className="req">*</span>
            </label>
            <input
              className="auth-dark-input"
              value={a1.phone}
              onChange={(e) => setA1((p) => ({ ...p, phone: e.target.value }))}
              placeholder="010-1234-5678"
              required
            />

            {error ? <div className="auth-error">{error}</div> : null}

            <button className="auth-artist-next" onClick={goNext} disabled={loading}>
              다음 &gt;
            </button>
          </div>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">예술가 기본 정보</div>

            <label className="auth-label">
              성명(활동명) <span className="req">*</span>
            </label>
            <input
              className="auth-dark-input"
              value={a2.displayName}
              onChange={(e) => setA2((p) => ({ ...p, displayName: e.target.value }))}
              placeholder="예술 활동 시 사용하는 이름"
              required
            />

            <label className="auth-label">소속</label>
            <input
              className="auth-dark-input"
              value={a2.affiliation}
              onChange={(e) => setA2((p) => ({ ...p, affiliation: e.target.value }))}
              placeholder="소속 단체/기관 (선택사항)"
            />

            <label className="auth-label">
              예술활동분야 <span className="req">*</span>
            </label>
            <div className="auth-row2">
              <select
                className="auth-dark-input"
                value={a2.artMain}
                onChange={(e) => setA2((p) => ({ ...p, artMain: e.target.value }))}
              >
                <option value="">대분류 선택</option>
                {ART_MAIN.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>

              <select
                className="auth-dark-input"
                value={a2.artSub}
                onChange={(e) => setA2((p) => ({ ...p, artSub: e.target.value }))}
                disabled={!a2.artMain}
              >
                <option value="">소분류 선택</option>
                {subOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-group">
              <div className="auth-label">
                예술활동증명 여부 <span className="req">*</span>
              </div>
              <label className="auth-radio">
                <input
                  type="radio"
                  checked={a2.verified === "YES"}
                  onChange={() => setA2((p) => ({ ...p, verified: "YES" }))}
                />
                해당
              </label>
              <label className="auth-radio">
                <input
                  type="radio"
                  checked={a2.verified === "NO"}
                  onChange={() => setA2((p) => ({ ...p, verified: "NO" }))}
                />
                해당없음
              </label>
            </div>

            <div className="auth-group">
              <div className="auth-label">
                성별 <span className="req">*</span>
              </div>
              <label className="auth-radio">
                <input type="radio" checked={a2.gender === "M"} onChange={() => setA2((p) => ({ ...p, gender: "M" }))} />
                남성
              </label>
              <label className="auth-radio">
                <input type="radio" checked={a2.gender === "F"} onChange={() => setA2((p) => ({ ...p, gender: "F" }))} />
                여성
              </label>
            </div>

            <label className="auth-label">
              출생연도 <span className="req">*</span>
            </label>
            <div className="auth-row2">
              <select
                className="auth-dark-input"
                value={a2.birthYear}
                onChange={(e) => setA2((p) => ({ ...p, birthYear: e.target.value }))}
              >
                <option value="">출생연도 선택</option>
                {birthYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <label className={`auth-toggle ${a2.birthYearPublic ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={a2.birthYearPublic}
                  onChange={(e) => setA2((p) => ({ ...p, birthYearPublic: e.target.checked }))}
                />
                공개
              </label>
            </div>

            {error ? <div className="auth-error">{error}</div> : null}

            <div className="auth-nav">
              <button type="button" className="auth-artist-prev" onClick={goPrev} disabled={loading}>
                &lt; 이전
              </button>
              <button type="button" className="auth-artist-next" onClick={goNext} disabled={loading}>
                다음 &gt;
              </button>
            </div>
          </div>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">예술인 증빙 자료</div>

            <label className="auth-label">소통창구</label>
            <input
              className="auth-dark-input"
              value={a3.contact}
              onChange={(e) => setA3((p) => ({ ...p, contact: e.target.value }))}
              placeholder="이메일, 인스타그램, 웹사이트 등"
            />
            <div className="auth-help">이메일, SNS 주소, 웹사이트 URL 등을 입력하세요</div>

            <label className="auth-label">
              예술활동 소개 <span className="req">*</span>
            </label>
            <textarea
              className="auth-dark-textarea"
              value={a3.intro}
              onChange={(e) => setA3((p) => ({ ...p, intro: e.target.value }))}
              placeholder="본인의 예술 활동과 작품 세계를 자유롭게 소개해주세요"
            />

            <div className="auth-upload">
              <div className="auth-label">
                프로필 이미지 업로드 <span className="req">*</span>
              </div>
              <label className="auth-drop">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setA3((p) => ({ ...p, profileImage: e.target.files?.[0] ?? null }))}
                  hidden
                />
                <div>클릭하여 이미지 선택</div>
                {a3.profileImage ? <div className="auth-file">{a3.profileImage.name}</div> : null}
              </label>
            </div>

            <div className="auth-upload">
              <div className="auth-label">
                포트폴리오 첨부파일 <span className="req">*</span>
              </div>
              <label className="auth-drop">
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,image/*"
                  onChange={(e) => setA3((p) => ({ ...p, portfolioFile: e.target.files?.[0] ?? null }))}
                  hidden
                />
                <div>클릭하여 파일 선택</div>
                <div className="auth-help">PDF, PPT, 이미지 등</div>
                {a3.portfolioFile ? <div className="auth-file">{a3.portfolioFile.name}</div> : null}
              </label>
            </div>

            {error ? <div className="auth-error">{error}</div> : null}

            <div className="auth-nav">
              <button type="button" className="auth-artist-prev" onClick={goPrev} disabled={loading}>
                &lt; 이전
              </button>
              <button type="button" className="auth-artist-next" onClick={goNext} disabled={loading}>
                다음 &gt;
              </button>
            </div>
          </div>
        ) : null}

        {/* STEP 4 */}
        {step === 4 ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">개인정보 수집·이용 동의</div>

            <div className="auth-consent-box">
              <div className="auth-consent-title">개인정보 수집 및 이용 안내</div>
              <div className="auth-consent-text">
                <div className="auth-consent-h">수집 항목(필수)</div>
                <div>성명, 전화번호, 이메일, 예술활동분야, 소속, 성별, 출생연도, 예술활동 소개, 프로필 이미지, 포트폴리오</div>
                <div className="auth-consent-h">수집 목적</div>
                <div>예술인 회원 관리, 장학생 추천 서비스 제공, 본인 확인, 예술활동 지원 프로그램 안내</div>
                <div className="auth-consent-h">보유 및 이용 기간</div>
                <div>정보 삭제 요청 시까지 보유</div>
                <div className="auth-consent-h">동의 거부 권리</div>
                <div>동의를 거부할 권리가 있으나, 거부 시 서비스 이용이 제한될 수 있습니다.</div>
              </div>
            </div>

            <label className="auth-consent-check">
              <input
                type="checkbox"
                checked={a4.privacyConsent}
                onChange={(e) => setA4({ privacyConsent: e.target.checked })}
              />
              위의 내용에 동의합니다
            </label>

            {error ? <div className="auth-error">{error}</div> : null}

            <div className="auth-nav">
              <button type="button" className="auth-artist-prev" onClick={goPrev} disabled={loading}>
                &lt; 이전
              </button>
              <button type="button" className="auth-artist-next" onClick={submitFinal} disabled={loading}>
                {loading ? "처리 중..." : "회원가입 완료"}
              </button>
            </div>
          </div>
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
