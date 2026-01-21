// FE/src/pages/profile/components/ArtistInfo.tsx
import type { ArtistProfile } from "../types";

export default function ArtistInfo({ profile }: { profile: ArtistProfile }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {profile.genre && (
        <span
          style={{
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: 20,
            background: "rgba(120, 165, 255, 0.15)",
            border: "1px solid rgba(120, 165, 255, 0.3)",
            color: "#78a5ff",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.5px",
          }}
        >
          {profile.genre}
        </span>
      )}

      {profile.bio && (
        <p
          style={{
            maxWidth: 460,
            textAlign: "center",
            opacity: 0.85,
            fontSize: 15,
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {profile.bio}
        </p>
      )}

      {profile.contactUrl && (
        <a
          href={profile.contactUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            textDecoration: "none",
            padding: "10px 24px",
            borderRadius: 12,
            background: "#fff",
            color: "#1a1a1a",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span>💌</span>
          <span>작가에게 문의하기</span>
        </a>
      )}
    </div>
  );
}
