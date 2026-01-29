// FE\src\pages\auth\artist\ArtistStep3Optional.tsx
import type React from "react";

type ArtistStep3Value = {
  contact: string;
  intro: string;              // ✅ 선택
  profileImage: File | null;  // ✅ 선택
  portfolioFile: File | null; // ✅ 옵션에 따라 필수
};

type Props = {
  value: ArtistStep3Value;

  // ✅ 부모에서 setA3 그대로 넘겨도 타입이 맞도록 Dispatch로 통일
  onChange: React.Dispatch<React.SetStateAction<ArtistStep3Value>>;

  error?: string | null;
  loading?: boolean;

  onPrev: () => void;
  onNext: () => void;

  portfolioRequired?: boolean; // 기본 true
};

export default function ArtistStep3Optional({
  value,
  onChange,
  error,
  loading,
  onPrev,
  onNext,
  portfolioRequired = true,
}: Props) {
  const onPickProfile = (file: File | null) => {
    onChange({ ...value, profileImage: file });
  };

  const onPickPortfolio = (file: File | null) => {
    onChange({ ...value, portfolioFile: file });
  };

  return (
    <div className="auth-artist-panel">
      <div className="auth-artist-section">예술인 증빙 자료</div>

      <label className="auth-label">소통창구</label>
      <input
        className="auth-dark-input"
        value={value.contact}
        onChange={(e) => onChange({ ...value, contact: e.target.value })}
        placeholder="이메일, 인스타그램, 웹사이트 등"
      />
      <div className="auth-help">
        이메일, SNS 주소, 웹사이트 URL 등을 입력하세요 (선택)
      </div>

      <label className="auth-label">예술활동 소개</label>
      <textarea
        className="auth-dark-textarea"
        value={value.intro}
        onChange={(e) => onChange({ ...value, intro: e.target.value })}
        placeholder="본인의 예술 활동과 작품 세계를 자유롭게 소개해주세요 (선택)"
      />

      {/* ✅ 프로필 이미지: 선택 */}
      <div className="auth-upload">
        <div className="auth-label">프로필 이미지 업로드</div>
        <label className="auth-drop">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPickProfile(e.target.files?.[0] ?? null)}
            hidden
          />
          <div>클릭하여 이미지 선택</div>
          {value.profileImage ? (
            <div className="auth-file">{value.profileImage.name}</div>
          ) : null}
        </label>

        {value.profileImage ? (
          <button
            type="button"
            className="auth-link-btn"
            style={{ marginTop: 8 }}
            onClick={() => onPickProfile(null)}
            disabled={loading}
          >
            선택 해제
          </button>
        ) : null}
      </div>

      {/* ✅ 포트폴리오: 옵션에 따라 필수 */}
      <div className="auth-upload">
        <div className="auth-label">
          포트폴리오 첨부파일{" "}
          {portfolioRequired ? <span className="req">*</span> : null}
        </div>
        <label className="auth-drop">
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,image/*"
            onChange={(e) => onPickPortfolio(e.target.files?.[0] ?? null)}
            hidden
          />
          <div>클릭하여 파일 선택</div>
          <div className="auth-help">PDF, PPT, 이미지 등</div>
          {value.portfolioFile ? (
            <div className="auth-file">{value.portfolioFile.name}</div>
          ) : null}
        </label>

        {value.portfolioFile ? (
          <button
            type="button"
            className="auth-link-btn"
            style={{ marginTop: 8 }}
            onClick={() => onPickPortfolio(null)}
            disabled={loading}
          >
            선택 해제
          </button>
        ) : null}
      </div>

      {error ? <div className="auth-error">{error}</div> : null}

      <div className="auth-nav">
        <button
          type="button"
          className="auth-artist-prev"
          onClick={onPrev}
          disabled={loading}
        >
          &lt; 이전
        </button>
        <button
          type="button"
          className="auth-artist-next"
          onClick={onNext}
          disabled={loading}
        >
          다음 &gt;
        </button>
      </div>
    </div>
  );
}
