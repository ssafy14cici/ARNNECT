// FE/src/pages/profile/Profile.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams, useLocation } from "react-router-dom";

import ProfileHeader from "./components/ProfileHeader";
import "./profile.css";

import { profileApi } from "../../features/profile/api/index";
import type { ProfileModel } from "../../features/profile/types";
import { useAuthStore } from "../../features/auth/store";

export type ProfileOutletContext = {
  profile: ProfileModel;
  isOwner: boolean;
  // ✅ 필요하면 탭/자식에서 강제 재조회용으로 사용 가능 (선택)
  refreshProfile?: () => void;
};

export default function Profile() {
  const { memberUuid } = useParams(); // routes.tsx: ":memberUuid"
  const profileId = memberUuid ?? "";

  const authUser = useAuthStore((s) => s.user); // { memberUuid, ... } | null
  const appRole = useAuthStore((s) => s.role); // "general" | "artist"

  const isOwner = useMemo(() => {
    if (profileId === "me") return true;
    if (!profileId) return false;
    return authUser?.memberUuid === profileId;
  }, [profileId, authUser?.memberUuid]);

  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ 같은 uuid로 재진입했을 때도 재조회 되도록 (location.key 변화 감지)
  const location = useLocation();

  // 빠른 라우팅 이동 시 오래된 응답 무시
  const reqSeq = useRef(0);

  // ✅ 외부(탭/자식)에서 강제로 리프레시할 수 있게 키 제공 (선택)
  const [reloadKey, setReloadKey] = useState(0);
  const refreshProfile = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const mySeq = ++reqSeq.current;

    setLoading(true);
    setError(null);
    setProfile(null);

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

        // ✅ 타인 프로필: "단일 진실" getProfile 우선
        // - ProfileHeader에서도 getProfile을 쓰고 있으니, 여기서도 동일 기준으로 맞춰야
        //   팔로우/카운트/상태가 화면 간 즉시 일치함.
        try {
          const p = await profileApi.getProfile(profileId);
          if (cancelled || reqSeq.current !== mySeq) return;
          setProfile(p as ProfileModel);
          return;
        } catch {
          // ✅ fallback: 기존 로직 유지 (혹시 getProfile이 특정 role에서만 될 때 대비)
          try {
            const a = await profileApi.getArtistProfile(profileId);
            if (cancelled || reqSeq.current !== mySeq) return;
            setProfile(a as ProfileModel);
          } catch {
            const u = await profileApi.getUserProfile(profileId);
            if (cancelled || reqSeq.current !== mySeq) return;
            setProfile(u as ProfileModel);
          }
        }
      } catch (e) {
        if (cancelled || reqSeq.current !== mySeq) return;
        setError(e instanceof Error ? e.message : "프로필 로딩 실패");
      } finally {
        if (!cancelled && reqSeq.current === mySeq) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // ✅ 같은 profileId여도 location.key가 바뀌면 재조회 가능
    // ✅ refreshProfile()로 reloadKey 증가 시에도 재조회 가능
  }, [profileId, location.key, reloadKey]);

  const navigate = useNavigate();

  const goWrite = () => {
    // ✅ 로그인/role은 Guard가 members 라우트를 감싸고 있어서 여기선 role만 분기하면 됨
    if (appRole === "artist") navigate("/artworks/create");
    else navigate("/reviews/create");
  };

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

  return (
    <div className={`profile-page ${themeClass}`}>
      <div className="profile-bg-glow" />
      <div className="profile-container">
        <ProfileHeader
          profile={profile}
          isOwner={isOwner}
          onProfileUpdated={(next) => setProfile(next)}
        />

        <div className="profile-tabs-wrapper">
          <nav className="profile-tabs">
            <NavLink to="feed" className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}>
              피드
            </NavLink>

            {viewedIsArtist ? (
              <>
                <NavLink to="portfolio" className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}>
                  포트폴리오
                </NavLink>
                <NavLink to="fanletters" className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}>
                  팬레터
                </NavLink>
              </>
            ) : (
              <NavLink to="collection" className={({ isActive }) => `profile-tab ${isActive ? "active" : ""}`}>
                콜렉션
              </NavLink>
            )}
          </nav>
        </div>

        <main className="profile-content">
          <Outlet context={{ profile, isOwner, refreshProfile } as ProfileOutletContext} />
        </main>

        {/* ✅ 내 프로필에서만 + 노출, 클릭 시 role에 따라 create 라우팅 */}
        {isOwner && (
          <button type="button" className="profile-fab" onClick={goWrite}>
            +
          </button>
        )}
      </div>
    </div>
  );
}
