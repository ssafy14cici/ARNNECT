// FE\src\pages\auth\artist\ArtistStep4Consent.tsx
type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string | null;
  loading?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  submitLabel?: string; // "회원가입 완료" 등
};

export default function StepConsent({
  checked,
  onChange,
  error,
  loading,
  onPrev,
  onNext,
  submitLabel = "회원가입 완료",
}: Props) {
  return (
    <div className="auth-artist-panel">
      <div className="auth-artist-section">개인정보 수집·이용 동의</div>

      <div className="auth-consent-box">
        <div className="auth-consent-title">개인정보 수집 및 이용 안내</div>
        <div className="auth-consent-text">
          <div className="auth-consent-h">수집 항목(필수)</div>
          <div>이메일, 이름, 전화번호 등 회원가입 처리에 필요한 정보</div>
          <div className="auth-consent-h">수집 목적</div>
          <div>회원 관리, 본인 확인, 서비스 제공</div>
          <div className="auth-consent-h">보유 및 이용 기간</div>
          <div>정보 삭제 요청 시까지 보유</div>
          <div className="auth-consent-h">동의 거부 권리</div>
          <div>동의를 거부할 수 있으나, 거부 시 서비스 이용이 제한될 수 있습니다.</div>
        </div>
      </div>

      <label className="auth-consent-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        위의 내용에 동의합니다
      </label>

      {error ? <div className="auth-error">{error}</div> : null}

      <div className="auth-nav">
        {onPrev ? (
          <button type="button" className="auth-artist-prev" onClick={onPrev} disabled={loading}>
            &lt; 이전
          </button>
        ) : <span />}

        <button type="button" className="auth-artist-next" onClick={onNext} disabled={loading}>
          {loading ? "처리 중..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
