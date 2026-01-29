// FE\src\pages\auth\artist\ArtistStep2Profile.tsx
import type React from "react";
import type { ArtistStep2 } from "../../../types/auth";

type Props = {
  value: ArtistStep2;
  onChange: React.Dispatch<React.SetStateAction<ArtistStep2>>;
  birthYears: string[];
  mainOptions: string[];
  subOptions: string[];
  error?: string | null;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function ArtistStep2Profile({
  value,
  onChange,
  birthYears,
  mainOptions,
  subOptions,
  error,
  loading,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="auth-artist-panel">
      <div className="auth-artist-section">예술가 기본 정보</div>

      <label className="auth-label">
        성명(활동명) <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        value={value.displayName}
        onChange={(e) => onChange({ ...value, displayName: e.target.value })}
        placeholder="예술 활동 시 사용하는 이름"
        required
      />

      <label className="auth-label">소속</label>
      <input
        className="auth-dark-input"
        value={value.affiliation}
        onChange={(e) => onChange({ ...value, affiliation: e.target.value })}
        placeholder="소속 단체/기관 (선택)"
      />

      <label className="auth-label">
        예술활동분야 <span className="req">*</span>
      </label>
      <div className="auth-row2">
        <select
          className="auth-dark-input"
          value={value.artMain}
          onChange={(e) => onChange({ ...value, artMain: e.target.value, artSub: "" })}
          required
        >
          <option value="">대분류 선택</option>
          {mainOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>

        <select
          className="auth-dark-input"
          value={value.artSub}
          onChange={(e) => onChange({ ...value, artSub: e.target.value })}
          disabled={!value.artMain}
          required
        >
          <option value="">소분류 선택</option>
          {subOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      {/* 예술활동증명 */}
      <div className="auth-group">
        <div className="auth-label">
          예술활동증명 여부 <span className="req">*</span>
        </div>

        <label className="auth-radio">
          <input
            type="radio"
            name="verified"
            checked={value.verified === "YES"}
            onChange={() => onChange({ ...value, verified: "YES" })}
          />
          해당
        </label>

        <label className="auth-radio">
          <input
            type="radio"
            name="verified"
            checked={value.verified === "NO"}
            onChange={() => onChange({ ...value, verified: "NO", verifiedFile: null })}
          />
          해당없음
        </label>

        {value.verified === "YES" ? (
          <div className="auth-upload">
            <div className="auth-label">
              예술활동증명 파일 <span className="req">*</span>
            </div>

            <label className="auth-drop">
              <input
                type="file"
                accept=".pdf,image/*"
                hidden
                onChange={(e) =>
                  onChange({ ...value, verifiedFile: e.target.files?.[0] ?? null })
                }
              />
              <div>클릭하여 파일 선택</div>
              {value.verifiedFile ? <div className="auth-file">{value.verifiedFile.name}</div> : null}
            </label>

            <div className="auth-help">PDF 또는 이미지 파일을 첨부해주세요.</div>
          </div>
        ) : null}
      </div>

      {/* 성별 */}
      <div className="auth-group">
        <div className="auth-label">
          성별 <span className="req">*</span>
        </div>

        <label className="auth-radio">
          <input
            type="radio"
            name="gender"
            checked={value.gender === "M"}
            onChange={() => onChange({ ...value, gender: "M" })}
          />
          남성
        </label>

        <label className="auth-radio">
          <input
            type="radio"
            name="gender"
            checked={value.gender === "F"}
            onChange={() => onChange({ ...value, gender: "F" })}
          />
          여성
        </label>
      </div>

      {/* 출생연도 + 공개/비공개 */}
      <label className="auth-label">
        출생연도 <span className="req">*</span>
      </label>
      <div className="auth-row2">
        <select
          className="auth-dark-input"
          value={value.birthYear}
          onChange={(e) => onChange({ ...value, birthYear: e.target.value })}
          required
        >
          <option value="">출생연도 선택</option>
          {birthYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <label className={`auth-toggle ${value.birthYearPublic ? "on" : ""}`}>
          <input
            type="checkbox"
            checked={value.birthYearPublic}
            onChange={(e) => onChange({ ...value, birthYearPublic: e.target.checked })}
          />
          {value.birthYearPublic ? "공개" : "비공개"}
        </label>
      </div>

      {/* 에러 표시(선택) */}
      {error ? <div className="auth-error">{error}</div> : null}

      {/* 하단 네비게이션 */}
      <div className="auth-artist-actions">
        <button type="button" onClick={onPrev} disabled={!!loading}>
          이전
        </button>
        <button type="button" onClick={onNext} disabled={!!loading}>
          다음 &gt;
        </button>
      </div>
    </div>
  );
}
