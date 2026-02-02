// FE/src/pages/profile/components/ArtistInfo.tsx
import type { ArtistProfile } from "../../../features/profile/types";
import "./profileInfo.css";

export default function ArtistInfo({ profile }: { profile: ArtistProfile }) {
  const intro = profile.artIntroduction ?? profile.bio ?? "";
  const link = profile.sns ?? profile.contactUrl ?? "";

  return (
    <div className="profileInfo">
      <div className="profileInfo-badges">
        {profile.isVerified !== undefined && (
          <span className={`profileInfo-chip ${profile.isVerified ? "ok" : "muted"}`}>
            {profile.isVerified ? "인증 완료" : "미인증"}
          </span>
        )}

        {profile.field && <span className="profileInfo-chip">{profile.field}</span>}
        {profile.genre && <span className="profileInfo-chip">{profile.genre}</span>}
        {typeof profile.debutYear === "number" && (
          <span className="profileInfo-chip">{profile.debutYear} 데뷔</span>
        )}
        {profile.affiliation && <span className="profileInfo-chip">{profile.affiliation}</span>}
      </div>

      {intro ? (
        <p className="profileInfo-intro">{intro}</p>
      ) : (
        <p className="profileInfo-intro muted">소개글이 없습니다.</p>
      )}

      {link && (
        <a className="profileInfo-linkBtn" href={link} target="_blank" rel="noreferrer">
          SNS / 개인웹 열기
        </a>
      )}
    </div>
  );
}
