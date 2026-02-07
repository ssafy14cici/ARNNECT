// FE\src\pages\auth\artist\ArtistStep1Account.tsx
import type { AccountStepValue } from "../utils/validation";

type Props = {
  value: AccountStepValue;
  onChange: (next: AccountStepValue) => void;

  password2: string;
  onChangePassword2: (v: string) => void;

  emailChecked: boolean;
  emailCheckMsg: string | null;
  checkingEmail: boolean;
  onCheckEmail: () => void;

  error?: string | null;
};

export default function Step1Account({
  value,
  onChange,
  password2,
  onChangePassword2,
  emailChecked,
  emailCheckMsg,
  checkingEmail,
  onCheckEmail,
  error,
}: Props) {
  return (
    <div className="auth-artist-panel">
      <div className="auth-artist-section">계정 정보</div>

      <label className="auth-label">
        이메일 <span className="req">*</span>
      </label>

      <div className="auth-row2">
        <input
          className="auth-dark-input"
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="example@email.com"
        />
        <button
          type="button"
          className="auth-artist-next"
          style={{ flex: "0 0 160px" }}
          onClick={onCheckEmail}
          disabled={checkingEmail}
        >
          {checkingEmail ? "확인 중..." : "중복 확인"}
        </button>
      </div>

      {emailCheckMsg ? (
        <div
          style={{
            marginTop: 6,
            fontWeight: 800,
            color: emailChecked ? "inherit" : "#b91c1c",
          }}
        >
          {emailCheckMsg}
        </div>
      ) : null}

      <label className="auth-label">
        이름 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="이름을 입력"
      />

      <label className="auth-label">
        비밀번호 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        type="password"
        value={value.password}
        onChange={(e) => onChange({ ...value, password: e.target.value })}
        placeholder="8자 이상 입력"
        autoComplete="new-password"
      />

      <label className="auth-label">
        비밀번호 확인 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        type="password"
        value={password2}
        onChange={(e) => onChangePassword2(e.target.value)}
        placeholder="비밀번호를 한 번 더 입력"
        autoComplete="new-password"
      />

      <label className="auth-label">
        전화번호 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        value={value.phone}
        onChange={(e) => {
          const onlyDigits = e.target.value.replace(/[^0-9]/g, "");
          if (onlyDigits.length <= 11) {
            onChange({ ...value, phone: onlyDigits });
          }
        }}
        placeholder="01012345678"
        inputMode="numeric"
        maxLength={11}
      />

      {error ? <div className="auth-error">{error}</div> : null}
    </div>
  );
}
