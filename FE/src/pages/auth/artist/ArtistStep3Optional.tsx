// FE/src/pages/auth/artist/ArtistStep3Optional.tsx
import type React from "react";
import type { ArtistStep3 } from "./types";

type Props = {
  value: ArtistStep3;
  onChange: React.Dispatch<React.SetStateAction<ArtistStep3>>;
  error?: string | null;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function ArtistStep3Optional({
  value,
  onChange,
  error,
  loading,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="auth-artist-panel">
      <div className="auth-artist-section">예술인 증빙 및 소개</div>

      {/* document */}
      <div className="auth-upload">
        <div className="auth-label">
          증빙서류(document) <span className="req">*</span>
        </div>

        <label className="auth-drop">
          <input
            type="file"
            accept=".pdf,image/*"
            hidden
            onChange={(e) =>
              onChange({ ...value, document: e.target.files?.[0] ?? null })
            }
          />
          <div>클릭하여 파일 선택</div>
          {value.document ? (
            <div className="auth-file">{value.document.name}</div>
          ) : null}
        </label>

        <div className="auth-help">PDF 또는 이미지 파일을 첨부해주세요.</div>
      </div>

      {/* artIntroduction */}
      <label className="auth-label">
        작가 소개(artIntroduction) <span className="req">*</span>
      </label>
      <textarea
        className="auth-dark-textarea"
        value={value.artIntroduction}
        onChange={(e) => onChange({ ...value, artIntroduction: e.target.value })}
        placeholder="string"
        required
      />

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
