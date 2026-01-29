// FE/src/pages/profile/components/UserInfo.tsx
import type { UserProfile } from "../../../features/profile/types";

export default function UserInfo({ profile }: { profile: UserProfile }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
      {profile.bio ? (
        <p
          style={{ opacity: 0.7, fontSize: 14, fontStyle: "italic", margin: 0 }}
        >
          "{profile.bio}"
        </p>
      ) : (
        <p style={{ opacity: 0.4, fontSize: 13, margin: 0 }}>
          소개글이 없습니다.
        </p>
      )}
    </div>
  );
}
