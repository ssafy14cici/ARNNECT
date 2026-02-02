// FE/src/pages/auth/artist/ArtistStep2Profile.tsx
import type React from "react";
import type { ArtistStep2 } from "./types";

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

type Props = {
  value: ArtistStep2;
  onChange: React.Dispatch<React.SetStateAction<ArtistStep2>>;
  error?: string | null;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function ArtistStep2Profile({
  value,
  onChange,
  error,
  loading,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="auth-artist-panel">
      <div className="auth-artist-section">예술가 기본 정보</div>

      <label className="auth-label">
        닉네임 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        value={value.nickname}
        onChange={(e) => onChange({ ...value, nickname: e.target.value })}
        placeholder="예술가12"
        required
      />

      <label className="auth-label">
        생년월일 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        type="date"
        value={value.birth}
        onChange={(e) => onChange({ ...value, birth: e.target.value })}
        required
      />

      <label className="auth-label">
        소속 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        value={value.affiliation}
        onChange={(e) => onChange({ ...value, affiliation: e.target.value })}
        placeholder="string"
        required
      />

      <label className="auth-label">
        데뷔연도 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        inputMode="numeric"
        value={value.debutYear}
        onChange={(e) => onChange({ ...value, debutYear: e.target.value })}
        placeholder="2020"
        required
      />

      <label className="auth-label">
        장르 <span className="req">*</span>
      </label>
      <select
        className="auth-dark-input"
        value={value.genreId ?? ""}
        onChange={(e) =>
          onChange({
            ...value,
            genreId: e.target.value ? Number(e.target.value) : null,
          })
        }
        required
      >
        <option value="">장르 선택</option>
        {GENRES.map((g) => (
          <option key={g.id} value={g.id}>
            {g.ko}
          </option>
        ))}
      </select>

      <label className="auth-label">
        SNS/개인웹 <span className="req">*</span>
      </label>
      <input
        className="auth-dark-input"
        value={value.sns}
        onChange={(e) => onChange({ ...value, sns: e.target.value })}
        placeholder="string"
        required
      />

      {error ? <div className="auth-error">{error}</div> : null}

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
