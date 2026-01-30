import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import ProfileHeader from "./components/ProfileHeader";
import { profileApi } from "../../features/profile/api";
import type { ArtistProfile, UserProfile, ProfileRole } from "../../features/profile/types";
import { useAuthStore } from "../../features/auth/store";
import "./profile.css";

type ProfileModel = ArtistProfile | UserProfile;

export type ProfileOutletContext = {
  profile: ProfileModel;
  isOwner: boolean;
};

export default function Profile() {
  const { id } = useParams(); 
  // URL이 /profile/me 면 내 프로필, 아니면 남의 프로필
  const profileId = id ?? "mock-user"; 

  const authRole = useAuthStore((s) => s.role); 
  const isOwner = profileId === "me";

  const [profile, setProfile] = useState<ProfileModel | null>(null);

  useEffect(() => {
    (async () => {
      // 1. 만약 URL이 /profile/me 라면?
      if (profileId === "me") {
        // 내 역할이 아티스트면 아티스트 프로필, 아니면 유저 프로필 호출
        // (API가 하드코딩되어 있어서 무조건 성공함)
        if (authRole === "artist") {
          const p = await profileApi.getArtistProfile("me");
          setProfile(p);
        } else {
          const p = await profileApi.getUserProfile("me");
          setProfile(p);
        }
        return;
      }

      // 2. 남의 프로필(/profile/some-id)이라면?
      // 일단 아티스트로 찔러보고, 아니면 유저로 (화면 구성을 위해)
      // 여기서는 그냥 '아티스트'로 간주하고 띄웁니다. (원하시면 로직 변경 가능)
      // 하드코딩 상황이므로 그냥 랜덤하게 하나 띄워도 됩니다.
      
      // 테스트: ID에 'user'가 포함되면 유저 프로필, 아니면 아티스트 프로필 리턴
      if (profileId.includes("user")) {
         const u = await profileApi.getUserProfile(profileId);
         setProfile(u);
      } else {
         const a = await profileApi.getArtistProfile(profileId);
         setProfile(a);
      }
    })();
  }, [profileId, authRole]);

  const navigate = useNavigate();
  const goWrite = () => navigate("/posts/create");

  if (!profile) return <div className="profile-loading">Loading...</div>;

  const viewedIsArtist = profile.role === "ARTIST";
  const themeClass = viewedIsArtist ? "theme-artist" : "theme-user";

  return (
    <div className={`profile-page ${themeClass}`}>
      <div className="profile-bg-glow" />
      <div className="profile-container">
        <ProfileHeader profile={profile} isOwner={isOwner} onProfileUpdated={setProfile} />

        <div className="profile-tabs-wrapper">
          <nav className="profile-tabs">
            {/* 탭 누르면 /feed, /portfolio 등으로 이동 */}
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