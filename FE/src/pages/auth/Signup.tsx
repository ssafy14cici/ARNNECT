// src/pages/auth/Signup.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/auth.css";
import { apiSignupArtist, apiSignupUser } from "../../api/auth";
import type { ArtistStep1, ArtistStep2, ArtistStep3, ArtistStep4 } from "../../types/auth";

type SignupType = "TYPE" | "USER" | "ARTIST";

const ART_MAIN = ["미술", "사진", "공예", "디자인", "음악", "문학"];
const ART_SUB: Record<string, string[]> = {
  미술: ["회화", "조각", "일러스트"],
  사진: ["인물", "풍경", "스트릿"],
  공예: ["도자", "금속", "목공"],
  디자인: ["그래픽", "UI/UX", "브랜딩"],
  음악: ["작곡", "연주", "보컬"],
  문학: ["시", "소설", "에세이"],
};

export default function Signup() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const initial = (sp.get("type")?.toUpperCase() as SignupType) || "TYPE";
  const [mode, setMode] = useState<SignupType>(initial);

  useEffect(() => {
    // url sync
    if (mode === "TYPE") setSp({}, { replace: true });
    else setSp({ type: mode.toLowerCase() }, { replace: true });
  }, [mode, setSp]);

  // -----------------------
  // USER SIGNUP STATE
  // -----------------------
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

  useEffect(() => {
    const all = agreeTerms && agreePrivacy && agreeMarketing;
    // 전체동의는 "필수+선택 모두"로 잡아둠(목업 느낌)
    setAgreeAll(all);
  }, [agreeTerms, agreePrivacy, agreeMarketing]);

  function toggleAll(next: boolean) {
    setAgreeAll(next);
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeMarketing(next);
  }

  // -----------------------
  // ARTIST SIGNUP STATE
  // -----------------------
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

  const subOptions = useMemo(() => (a2.artMain ? ART_SUB[a2.artMain] ?? [] : []), [a2.artMain]);

  useEffect(() => {
    if (a2.artMain && !subOptions.includes(a2.artSub)) {
      setA2((p) => ({ ...p, artSub: "" }));
    }
  }, [a2.artMain, a2.artSub, subOptions]);

  // common
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [mode, step]);

  // -----------------------
  // SUBMIT HANDLERS
  // -----------------------
  async function submitUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiSignupUser({
        email: uEmail,
        password: uPw,
        passwordConfirm: uPw2,
        name: uName,
        phone: uPhone,
        agreements: {
          all: agreeAll,
          terms: agreeTerms,
          privacy: agreePrivacy,
          marketing: agreeMarketing,
        },
      });
      nav("/login");
    } catch (err: any) {
      setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function submitArtistFinal() {
    setLoading(true);
    setError(null);

    try {
      await apiSignupArtist({
        ...a1,
        ...a2,
        ...a3,
        ...a4,
      });
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
  if (mode === "TYPE") {
    return (
      <div className="auth-page auth-type">
        <div className="auth-type-head">
          <div className="auth-type-title">회원가입</div>
          <div className="auth-type-sub">숨겨진 예술가를 발굴하고, 당신의 취향을 완성하세요</div>
        </div>

        <div className="auth-type-grid">
          <div className="auth-type-card">
            <div className="auth-type-card-title">일반 회원가입</div>
            <div className="auth-type-card-desc">숨겨진 예술가를 발굴하고<br/>당신의 취향을 완성하세요</div>
            <button className="auth-type-btn" onClick={() => setMode("USER")}>
              일반 회원으로 시작하기
            </button>
          </div>

          <div className="auth-type-card">
            <div className="auth-type-card-title">예술인 회원가입</div>
            <div className="auth-type-card-desc">나만 아는 예술가가 아닌<br/>누구나 아는 예술가로 나아갑니다.</div>
            <button className="auth-type-btn" onClick={() => { setMode("ARTIST"); setStep(1); }}>
              예술인으로 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------
  // USER FORM (목업 흰 카드)
  // -----------------------
  if (mode === "USER") {
    return (
      <div className="auth-page auth-center">
        <div className="auth-back">
          <button type="button" className="auth-back-btn" onClick={() => setMode("TYPE")}>
            ← 회원가입 유형 선택으로 돌아가기
          </button>
        </div>

        <div className="auth-center-card">
          <div className="auth-center-icon">🧾</div>
          <div className="auth-center-title">회원가입</div>
          <div className="auth-center-sub">회원가입을 위해 정보를 입력해주세요</div>

          <form onSubmit={submitUser} className="auth-center-form">
            <label className="auth-label">이메일 <span className="req">*</span></label>
            <input className="auth-center-input" value={uEmail} onChange={(e) => setUEmail(e.target.value)} placeholder="example@email.com" />

            <label className="auth-label">비밀번호 <span className="req">*</span></label>
            <div className="auth-center-inputwrap">
              <input className="auth-center-input" type={uShowPw ? "text" : "password"} value={uPw} onChange={(e) => setUPw(e.target.value)} placeholder="8자 이상 입력해주세요" />
              <button type="button" className="auth-eye" onClick={() => setUShowPw(v => !v)}>👁️</button>
            </div>

            <label className="auth-label">비밀번호 확인 <span className="req">*</span></label>
            <div className="auth-center-inputwrap">
              <input className="auth-center-input" type={uShowPw2 ? "text" : "password"} value={uPw2} onChange={(e) => setUPw2(e.target.value)} placeholder="비밀번호를 다시 입력해주세요" />
              <button type="button" className="auth-eye" onClick={() => setUShowPw2(v => !v)}>👁️</button>
            </div>

            <label className="auth-label">이름 <span className="req">*</span></label>
            <input className="auth-center-input" value={uName} onChange={(e) => setUName(e.target.value)} placeholder="홍길동" />

            <label className="auth-label">전화번호 <span className="req">*</span></label>
            <input className="auth-center-input" value={uPhone} onChange={(e) => setUPhone(e.target.value)} placeholder="010-1234-5678" />

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

            <button className="auth-center-cta" type="submit" disabled={loading}>
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

  // -----------------------
  // ARTIST WIZARD (목업 좌/우 분할)
  // -----------------------
  return (
    <div className="auth-page auth-artist">
      <div className="auth-artist-left">
        <div className="auth-artist-left-card">
          <div className="auth-artist-avatar">🖼️</div>
          <div className="auth-artist-left-text">나는 ___ 아티스트입니다</div>
        </div>
      </div>

      <div className="auth-artist-right">
        <div className="auth-artist-title">예술인 회원가입</div>
        <div className="auth-artist-step">단계 {step} / 4</div>

        <div className="auth-stepbar">
          {[1,2,3,4].map((n) => (
            <div key={n} className={`auth-stepseg ${n <= step ? "on" : ""}`} />
          ))}
        </div>

        {step === 1 ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">계정 정보</div>

            <label className="auth-label">이메일 <span className="req">*</span></label>
            <input className="auth-dark-input" value={a1.email} onChange={(e) => setA1(p => ({...p, email: e.target.value}))} placeholder="example@email.com" />

            <label className="auth-label">이름 <span className="req">*</span></label>
            <input className="auth-dark-input" value={a1.name} onChange={(e) => setA1(p => ({...p, name: e.target.value}))} placeholder="홍길동" />

            <label className="auth-label">비밀번호 <span className="req">*</span></label>
            <input className="auth-dark-input" type="password" value={a1.password} onChange={(e) => setA1(p => ({...p, password: e.target.value}))} placeholder="비밀번호를 입력하세요" />

            <label className="auth-label">전화번호 <span className="req">*</span></label>
            <input className="auth-dark-input" value={a1.phone} onChange={(e) => setA1(p => ({...p, phone: e.target.value}))} placeholder="010-1234-5678" />

            {error ? <div className="auth-error">{error}</div> : null}

            <button className="auth-artist-next" onClick={() => setStep(2)}>다음 &gt;</button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">예술가 기본 정보</div>

            <label className="auth-label">성명(활동명) <span className="req">*</span></label>
            <input className="auth-dark-input" value={a2.displayName} onChange={(e) => setA2(p => ({...p, displayName: e.target.value}))} placeholder="예술 활동 시 사용하는 이름" />

            <label className="auth-label">소속</label>
            <input className="auth-dark-input" value={a2.affiliation} onChange={(e) => setA2(p => ({...p, affiliation: e.target.value}))} placeholder="소속 단체/기관 (선택사항)" />

            <label className="auth-label">예술활동분야 <span className="req">*</span></label>
            <div className="auth-row2">
              <select className="auth-dark-input" value={a2.artMain} onChange={(e) => setA2(p => ({...p, artMain: e.target.value}))}>
                <option value="">대분류 선택</option>
                {ART_MAIN.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <select className="auth-dark-input" value={a2.artSub} onChange={(e) => setA2(p => ({...p, artSub: e.target.value}))}>
                <option value="">소분류 선택</option>
                {subOptions.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>

            <div className="auth-group">
              <div className="auth-label">예술활동증명 여부 <span className="req">*</span></div>
              <label className="auth-radio">
                <input type="radio" checked={a2.verified === "YES"} onChange={() => setA2(p => ({...p, verified: "YES"}))} />
                해당
              </label>
              <label className="auth-radio">
                <input type="radio" checked={a2.verified === "NO"} onChange={() => setA2(p => ({...p, verified: "NO"}))} />
                해당없음
              </label>
            </div>

            <div className="auth-group">
              <div className="auth-label">성별 <span className="req">*</span></div>
              <label className="auth-radio">
                <input type="radio" checked={a2.gender === "M"} onChange={() => setA2(p => ({...p, gender: "M"}))} />
                남성
              </label>
              <label className="auth-radio">
                <input type="radio" checked={a2.gender === "F"} onChange={() => setA2(p => ({...p, gender: "F"}))} />
                여성
              </label>
            </div>

            <label className="auth-label">출생연도 <span className="req">*</span></label>
            <div className="auth-row2">
              <select className="auth-dark-input" value={a2.birthYear} onChange={(e) => setA2(p => ({...p, birthYear: e.target.value}))}>
                <option value="">출생연도 선택</option>
                {Array.from({ length: 60 }).map((_, idx) => {
                  const year = String(2025 - idx);
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
              <label className={`auth-toggle ${a2.birthYearPublic ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={a2.birthYearPublic}
                  onChange={(e) => setA2(p => ({...p, birthYearPublic: e.target.checked}))}
                />
                공개
              </label>
            </div>

            {error ? <div className="auth-error">{error}</div> : null}

            <div className="auth-nav">
              <button className="auth-artist-prev" onClick={() => setStep(1)}>&lt; 이전</button>
              <button className="auth-artist-next" onClick={() => setStep(3)}>다음 &gt;</button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="auth-artist-panel">
            <div className="auth-artist-section">예술인 증빙 자료</div>

            <label className="auth-label">소통창구</label>
            <input className="auth-dark-input" value={a3.contact} onChange={(e) => setA3(p => ({...p, contact: e.target.value}))} placeholder="이메일, 인스타그램, 웹사이트 등" />
            <div className="auth-help">이메일, SNS 주소, 웹사이트 URL 등을 입력하세요</div>

            <label className="auth-label">예술활동 소개 <span className="req">*</span></label>
            <textarea className="auth-dark-textarea" value={a3.intro} onChange={(e) => setA3(p => ({...p, intro: e.target.value}))} placeholder="본인의 예술 활동과 작품 세계를 자유롭게 소개해주세요" />

            <div className="auth-upload">
              <div className="auth-label">프로필 이미지 업로드 <span className="req">*</span></div>
              <label className="auth-drop">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setA3(p => ({...p, profileImage: e.target.files?.[0] ?? null}))}
                  hidden
                />
                <div>클릭하여 이미지 선택</div>
                {a3.profileImage ? <div className="auth-file">{a3.profileImage.name}</div> : null}
              </label>
            </div>

            <div className="auth-upload">
              <div className="auth-label">포트폴리오 첨부파일 <span className="req">*</span></div>
              <label className="auth-drop">
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,image/*"
                  onChange={(e) => setA3(p => ({...p, portfolioFile: e.target.files?.[0] ?? null}))}
                  hidden
                />
                <div>클릭하여 파일 선택</div>
                <div className="auth-help">PDF, PPT, 이미지 등</div>
                {a3.portfolioFile ? <div className="auth-file">{a3.portfolioFile.name}</div> : null}
              </label>
            </div>

            {error ? <div className="auth-error">{error}</div> : null}

            <div className="auth-nav">
              <button className="auth-artist-prev" onClick={() => setStep(2)}>&lt; 이전</button>
              <button className="auth-artist-next" onClick={() => setStep(4)}>다음 &gt;</button>
            </div>
          </div>
        ) : null}

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
              <button className="auth-artist-prev" onClick={() => setStep(3)}>&lt; 이전</button>
              <button className="auth-artist-next" onClick={submitArtistFinal} disabled={loading}>
                {loading ? "처리 중..." : "회원가입 완료"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="auth-artist-bottom">
          이미 계정이 있으신가요? <Link to="/login" className="accent">로그인</Link>
        </div>
      </div>
    </div>
  );
}
