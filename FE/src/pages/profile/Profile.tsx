// FE/src/pages/profile/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ProfileHeader from "./components/ProfileHeader";
import "./profile.css";

import { profileApi } from "../../features/profile/api";
import type { ProfileModel } from "../../features/profile/types";
import { useAuthStore } from "../../features/auth/store";
import "./profile.css";

export type ProfileOutletContext = {
  profile: ProfileModel;
  isOwner: boolean;
};

export default function Profile() {
  const { memberUuid } = useParams(); // ✅ routes.tsx: ":memberUuid"
  const profileId = memberUuid ?? "";

  const authUser = useAuthStore((s) => s.user); // { memberUuid, name } | null

  const isOwner = useMemo(() => {
    if (profileId === "me") return true;
    if (!profileId) return false;
    return authUser?.memberUuid === profileId;
  }, [profileId, authUser?.memberUuid]);

  const [profile, setProfile] = useState<ProfileModel | null>(null);

  // ✅ 네트워크 X: profileApi가 하드코딩 반환(Promise)
  useEffect(() => {
    (async () => {
      try {
        if (!profileId) throw new Error("프로필 ID가 없습니다.");

        // ✅ 내 프로필
        if (profileId === "me") {
          const p = await profileApi.getMyProfile();
          if (cancelled || reqSeq.current !== mySeq) return;
          setProfile(p);
          return;
        }

        // ✅ 타인 프로필: artist → 실패 시 user fallback
        try {
          const a = await profileApi.getArtistProfile(profileId);
          if (cancelled || reqSeq.current !== mySeq) return;
          setProfile(a);
        } catch {
          const u = await profileApi.getUserProfile(profileId);
          if (cancelled || reqSeq.current !== mySeq) return;
          setProfile(u);
        }
      } catch (e) {
        if (cancelled || reqSeq.current !== mySeq) return;
        setError(e instanceof Error ? e.message : "프로필 로딩 실패");
      } finally {
        // ✅ 핵심: 정상 케이스에서 loading을 반드시 false로
        if (!cancelled && reqSeq.current === mySeq) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const navigate = useNavigate();
  const goWrite = () => navigate("/posts/create");

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner" />
      </div>
    );
  }
  if (error) return <div className="profile-error">{error}</div>;
  if (!profile) return <div className="profile-error">프로필을 찾을 수 없습니다.</div>;

  const viewedIsArtist = profile.role === "ARTIST";
  const themeClass = viewedIsArtist ? "theme-artist" : "theme-user";

  const goWrite = () => navigate("/posts/create");

  if (!profile) return <div className="profile-loading">Loading...</div>;

  return (
    <div className={`profile-page ${themeClass}`}>
      <div className="profile-bg-glow" />
      <div className="profile-container">
        {/* ✅ ProfileHeader 유지 */}
        <ProfileHeader profile={profile} isOwner={isOwner} onProfileUpdated={setProfile} />

        <div className="profile-tabs-wrapper">
          <nav className="profile-tabs">
            <NavLink to="feed" className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}>
              피드
            </NavLink>

            {viewedIsArtist ? (
              <NavLink to="portfolio" className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}>
                포트폴리오
              </NavLink>
            ) : (
              <NavLink to="collection" className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}>
                콜렉션
              </NavLink>
            )}
          </nav>
        </div>

        <main className="profile-content">
          <Outlet context={{ profile, isOwner } as ProfileOutletContext} />
        </main>

        {isOwner && (
          <button type="button" className="profile-fab" onClick={goWrite}>
            +
          </button>
        )}
      </div>
    </div>
  );
}
