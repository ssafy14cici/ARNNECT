// FE/src/pages/profile/components/UserInfo.tsx
import type { UserProfile } from "../../../features/profile/types";
import "./profileInfo.css";

export default function UserInfo({ profile }: { profile: UserProfile }) {
  return (
    <div className="profileInfo profileInfo--user">
      {profile.bio ? (
        <p className="profileInfo-intro quote">"{profile.bio}"</p>
      ) : (
        <p className="profileInfo-intro muted"></p>
      )}
    </div>
  );
}
