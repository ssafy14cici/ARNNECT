import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import ProfileHeader from "./components/ProfileHeader";
import { profileApi } from "../../features/profile/api";
import type { ArtistProfile, UserProfile } from "../../features/profile/types";
import "./profile.css";

type ProfileModel = ArtistProfile | UserProfile;

export type ProfileOutletContext = {
  profile: ProfileModel;
  isOwner: boolean;
};

export default function Profile() {
  const { type } = useParams(); // ✅ "user" | "artist"
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileModel | null>(null);

  const viewedIsArtist = type === "artist";
  const isOwner = true; // ✅ 이제 '내 프로필' 고정 구조

  useEffect(() => {
    (async () => {
      if (viewedIsArtist) {
        const p = await profileApi.getArtistProfile("me"); // mock 기준이면 OK
        setProfile(p);
      } else {
        const p = await profileApi.getUserProfile("me");
        setProfile(p);
      }
    })();
  }, [viewedIsArtist]);

  const goWrite = () => navigate("/posts/create");

  if (!profile) return <div className="profile-loading">Loading...</div>;

  const themeClass = viewedIsArtist ? "theme-artist" : "theme-user";

  return (
    <div className={`profile-page ${themeClass}`}>
      <div className="profile-bg-glow" />
      <div className="profile-container">
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
          <button type="button" className="profile-fab" onClick={goWrite}>+</button>
        )}
      </div>
    </div>
  );
}
