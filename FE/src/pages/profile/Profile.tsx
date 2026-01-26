// FE/src/pages/profile/Profile.tsx
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

  // 요청 경합 방지(빠른 라우트 전환/role 변경 시 이전 요청 결과가 덮어쓰지 않게)
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
        // ✅ 내 프로필
        if (profileId === "me") {
          const p =
            viewerProfileRole === "ARTIST"
              ? await profileApi.getArtistProfile("me")
              : await profileApi.getUserProfile("me");

          if (cancelled || reqSeq.current !== mySeq) return;
          setProfile(p);
          return;
        }

        // ✅ 타인 프로필: fallback 전략 (artist → user)
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
   * UI
   * =============================== */
  if (loading) return <div style={{ padding: 16 }}>로딩중...</div>;
  if (error) return <div style={{ padding: 16 }}>{error}</div>;
  if (!profile) return <div style={{ padding: 16 }}>프로필이 없습니다.</div>;

  // ✅ 탭 노출 기준은 "로그인한 내 역할"이 아니라 "지금 보고 있는 프로필의 역할"
  const viewedIsArtist = profile.role === "ARTIST";

  return (
    <div className="profilePage">
      <ProfileHeader profile={profile} isOwner={isOwner} onProfileUpdated={setProfile} />

      <div className="profileTabs">
        <NavLink
          to="feed"
          className={({ isActive }) => (isActive ? "profileTab profileTabActive" : "profileTab")}
        >
          피드
        </NavLink>

        {viewedIsArtist ? (
          <NavLink
            to="portfolio"
            className={({ isActive }) => (isActive ? "profileTab profileTabActive" : "profileTab")}
          >
            포트폴리오
          </NavLink>
        ) : (
          <NavLink
            to="collection"
            className={({ isActive }) => (isActive ? "profileTab profileTabActive" : "profileTab")}
          >
            콜렉션
          </NavLink>
        )}
      </div>

      <div className="profileTabPanel">
        {/* ✅ 하위 탭에서 profile/isOwner를 그대로 쓰게 context 내려주기 */}
        <Outlet context={{ profile, isOwner } satisfies ProfileOutletContext} />
      </div>

      {isOwner && (
        <button type="button" className="profileFab" aria-label="글쓰기" onClick={goWrite}>
          +
        </button>
      )}
    </div>
  );
}
