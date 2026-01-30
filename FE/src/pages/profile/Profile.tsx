// FE/src/pages/profile/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ProfileHeader from "./components/ProfileHeader";
import "./profile.css";

import { profileApi } from "../../features/profile/api";
import type { ArtistProfile, UserProfile, ProfileRole } from "../../features/profile/types";

type ProfileModel = ArtistProfile | UserProfile;

export type ProfileOutletContext = {
  profile: ProfileModel;
  isOwner: boolean;
};

type ProfileProps = {
  role: ProfileRole; // "USER" | "ARTIST"  (routes.tsx에서 주입)
};

export default function Profile({ role }: ProfileProps) {
  const navigate = useNavigate();

  // ✅ 단순 로직: 이 페이지는 "내 프로필" 전용
  const isOwner = true;

  const [profile, setProfile] = useState<ProfileModel | null>(null);

  // ✅ 네트워크 X: profileApi가 하드코딩 반환(Promise)
  useEffect(() => {
    (async () => {
      if (role === "ARTIST") {
        const p = await profileApi.getArtistProfile("artist");
        setProfile(p);
      } else {
        const p = await profileApi.getUserProfile("user");
        setProfile(p);
      }
    })();
  }, [role]);

  const viewedIsArtist = useMemo(() => role === "ARTIST", [role]);
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
          <Outlet context={{ profile, isOwner } satisfies ProfileOutletContext} />
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
