// FE/src/pages/profile/Profile.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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

function toProfileRole(role: "general" | "artist" | null): ProfileRole {
  return role === "artist" ? "ARTIST" : "USER";
}

export default function Profile() {
  const { id } = useParams(); // "me" or 실제 id
  const profileId = id ?? "";

  const authRole = useAuthStore((s) => s.role); // "general" | "artist" | null
  const authUser = useAuthStore((s) => s.user); // { memberUuid, name } | null

  const viewerProfileRole = toProfileRole(authRole);
  const isOwner = useMemo(() => profileId === "me", [profileId]);

  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reqSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const mySeq = ++reqSeq.current;

    setLoading(true);
    setError(null);
    setProfile(null);

    (async () => {
      try {
        // ✅ 내 프로필 조회
        if (profileId === "me") {
          // 로그인이 안 되어 있을 경우를 대비한 방어 로직
          if (!authUser?.memberUuid) {
            // 여기서는 에러로 처리하여 UI에 표시하거나 리다이렉트
            throw new Error("로그인이 필요합니다.");
          }

          const myUuid = authUser.memberUuid;
          // 역할에 따라 다른 API 호출
          const p =
            viewerProfileRole === "ARTIST"
              ? await profileApi.getArtistProfile(myUuid)
              : await profileApi.getUserProfile(myUuid);

          if (cancelled || reqSeq.current !== mySeq) return;
          setProfile(p);
          return;
        }

        // ✅ 타인 프로필 조회 (아티스트 시도 -> 실패시 유저 시도)
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
        if (cancelled || reqSeq.current !== mySeq) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId, viewerProfileRole, authUser?.memberUuid]);

  const navigate = useNavigate();
  const goWrite = () => navigate("/posts/create");
  const goLogin = () => navigate("/login");

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner" />
      </div>
    );
  }

  // 에러 발생 시 (로그인 필요 등)
  if (error) {
    return (
      <div className="profile-error">
        <p>{error}</p>
        <button className="profile-retry-btn" onClick={goLogin}>
          로그인 페이지로 이동
        </button>
      </div>
    );
  }

  if (!profile) return <div className="profile-error">프로필을 찾을 수 없습니다.</div>;

  const viewedIsArtist = profile.role === "ARTIST";
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
          <button type="button" className="profile-fab" aria-label="글쓰기" onClick={goWrite}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}