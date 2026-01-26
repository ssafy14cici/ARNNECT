// FE/src/pages/profile/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import ProfileHeader from "./components/ProfileHeader";
import { profileApi } from "./api";
import type { ArtistProfile, UserProfile, ProfileRole } from "./types";
import { useAuthStore } from "../../stores/authStore";
import "./profile.css";

type ProfileModel = ArtistProfile | UserProfile;

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
  const role = toProfileRole(authRole);

  const isOwner = useMemo(() => profileId === "me", [profileId]);

  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** ===============================
   * 🔍 콘솔 로그: 렌더 시점
   * =============================== */
  console.log("[FE] Profile render", {
    profileId,
    role,
    isOwner,
  });

  /** ===============================
   * 🔌 서버 연동 시도
   * =============================== */
  useEffect(() => {
    let mounted = true;

    console.log("[FE → SERVER] Profile 페이지 진입 (서버 연동 대상)", {
      profileId,
      role,
    });

    queueMicrotask(() => {
      if (!mounted) return;
      setError(null);
      setProfile(null);
    });

    (async () => {
      try {
        // ✅ 내 프로필
        if (profileId === "me") {
          console.log(
            "[FE → SERVER] GET /me/profile 요청 송출",
            role
          );

          const p =
            role === "ARTIST"
              ? await profileApi.getArtistProfile("me")
              : await profileApi.getUserProfile("me");

          if (!mounted) return;

          console.log("[SERVER ✅] /me/profile 응답 수신", p);
          setProfile(p);
          return;
        }

        // ✅ 타인 프로필: fallback 전략
        console.log(
          "[FE → SERVER] GET /profiles/:id 요청 송출",
          profileId
        );

        try {
          const a = await profileApi.getArtistProfile(profileId);
          if (!mounted) return;

          console.log("[SERVER ✅] Artist profile 응답 수신", a);
          setProfile(a);
        } catch {
          const u = await profileApi.getUserProfile(profileId);
          if (!mounted) return;

          console.log("[SERVER ✅] User profile 응답 수신", u);
          setProfile(u);
        }
      } catch (e) {
        if (!mounted) return;

        console.warn(
          "[SERVER ❌] Profile API 연결 실패 (서버 미기동 상태)"
        );

        setError(e instanceof Error ? e.message : "프로필 로딩 실패");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profileId, role]);

  /** ===============================
   * 액션
   * =============================== */
  const navigate = useNavigate();

  const goWrite = () => {
    console.log("[FE] 글쓰기 버튼 클릭");
    navigate("/posts/create");
  };

  /** ===============================
   * UI
   * =============================== */
  if (error) return <div style={{ padding: 16 }}>{error}</div>;
  if (!profile) return <div style={{ padding: 16 }}>로딩중...</div>;

  return (
    <div className="profilePage">
      {/* ✅ 헤더 */}
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        onProfileUpdated={setProfile}
      />

      {/* ✅ 탭 바 */}
      <div className="profileTabs">
        <NavLink
          to="feed"
          className={({ isActive }) =>
            isActive ? "profileTab profileTabActive" : "profileTab"
          }
        >
          피드
        </NavLink>

        {/* 유저만 콜렉션 노출 */}
        {role === "USER" && (
          <NavLink
            to="collection"
            className={({ isActive }) =>
              isActive ? "profileTab profileTabActive" : "profileTab"
            }
          >
            콜렉션
          </NavLink>
        )}
      </div>

      {/* ✅ 탭 컨텐츠 */}
      <div className="profileTabPanel">
        <Outlet context={{ role }} />
      </div>

      {/* ✅ 글쓰기 버튼 (내 프로필만) */}
      {isOwner && (
        <button
          type="button"
          className="profileFab"
          aria-label="글쓰기"
          onClick={goWrite}
        >
          +
        </button>
      )}
    </div>
  );
}
