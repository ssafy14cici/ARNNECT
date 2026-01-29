import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import ProfileHeader from "./components/ProfileHeader";
import { profileApi } from "./api";
import type { ArtistProfile, UserProfile, ProfileRole } from "./types";
import { useAuthStore } from "../../stores/authStore";
import "./profile.css";

type ProfileModel = ArtistProfile | UserProfile;

// ✅ 하위 탭(Outlet)에서 사용할 컨텍스트 타입
export type ProfileOutletContext = {
  profile: ProfileModel;
  isOwner: boolean;
};

function toProfileRole(role: "general" | "artist"): ProfileRole {
  return role === "artist" ? "ARTIST" : "USER";
}

export default function Profile() {
  /** ===============================
   * 기본 정보
   * =============================== */
  const { id } = useParams(); // "me" or 실제 id
  const profileId = id ?? "";

  const { role: authRole } = useAuthStore();
  const viewerProfileRole = toProfileRole(authRole); // ✅ "내가 누구냐" (me 조회에만 사용)

  const isOwner = useMemo(() => profileId === "me", [profileId]);

  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 요청 경합 방지
  const reqSeq = useRef(0);

  /** ===============================
   * 서버 연동
   * =============================== */
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
          const p =
            viewerProfileRole === "ARTIST"
              ? await profileApi.getArtistProfile("me")
              : await profileApi.getUserProfile("me");

          if (cancelled || reqSeq.current !== mySeq) return;
          setProfile(p);
          return;
        }

        // ✅ 타인 프로필: fallback 전략
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
  }, [profileId, viewerProfileRole]);

  /** ===============================
   * 액션
   * =============================== */
  const navigate = useNavigate();
  const goWrite = () => {
    navigate("/posts/create");
  };

  /** ===============================
   * UI 렌더링
   * =============================== */
  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="profile-error">{error}</div>;
  }

  if (!profile) {
    return <div className="profile-error">프로필을 찾을 수 없습니다.</div>;
  }

  // ✅ 테마 결정을 위한 변수
  const viewedIsArtist = profile.role === "ARTIST";
  const themeClass = viewedIsArtist ? "theme-artist" : "theme-user";

  return (
    <div className={`profile-page ${themeClass}`}>
      {/* 배경 장식 효과 */}
      <div className="profile-bg-glow" />

      {/* ✅ Flexbox 컨테이너 (CSS 수정 필수) */}
      <div className="profile-container">
        <ProfileHeader 
          profile={profile} 
          isOwner={isOwner} 
          onProfileUpdated={setProfile} 
        />

        <div className="profile-tabs-wrapper">
          <nav className="profile-tabs">
            <NavLink
              to="feed"
              className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}
            >
              피드
            </NavLink>

            {viewedIsArtist ? (
              <NavLink
                to="portfolio"
                className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}
              >
                포트폴리오
              </NavLink>
            ) : (
              <NavLink
                to="collection"
                className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}
              >
                콜렉션
              </NavLink>
            )}
          </nav>
        </div>

        {/* ✅ Flex: 1로 남은 공간 차지 (CSS 수정 필수) */}
        <main className="profile-content">
          <Outlet context={{ profile, isOwner } satisfies ProfileOutletContext} />
        </main>

        {/* ✅ Sticky FAB Button: 컨테이너 내부, 맨 마지막에 위치 */}
        {isOwner && (
          <button 
            type="button" 
            className="profile-fab" 
            aria-label="글쓰기" 
            onClick={goWrite}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}