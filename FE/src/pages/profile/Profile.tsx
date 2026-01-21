// FE/src/pages/profile/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import ProfileHeader from "./components/ProfileHeader";
import { profileApi } from "./api";
import type { ArtistProfile, UserProfile, ProfileRole } from "./types";
import { useAuthStore } from "../../stores/authStore";
import "./profile.css"

type ProfileModel = ArtistProfile | UserProfile;

function toProfileRole(role: "general" | "artist"): ProfileRole {
  return role === "artist" ? "ARTIST" : "USER";
}

export default function Profile() {
  const { id } = useParams(); // "me" or 실제 id
  const profileId = id ?? "";

  const { role: authRole } = useAuthStore();
  const role = toProfileRole(authRole);

  const isOwner = useMemo(() => profileId === "me", [profileId]);

  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    queueMicrotask(() => {
      if (!mounted) return;
      setError(null);
      setProfile(null);
    });

    (async () => {
      try {
        // ✅ 내 프로필
        if (profileId === "me") {
          const p =
            role === "ARTIST"
              ? await profileApi.getArtistProfile("me")
              : await profileApi.getUserProfile("me");

          if (!mounted) return;
          setProfile(p);
          return;
        }

        // ✅ 타인 프로필: fallback 전략(artist 실패 → user)
        try {
          const a = await profileApi.getArtistProfile(profileId);
          if (!mounted) return;
          setProfile(a);
        } catch {
          const u = await profileApi.getUserProfile(profileId);
          if (!mounted) return;
          setProfile(u);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "프로필 로딩 실패");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profileId, role]);

  const navigate = useNavigate();

  const goWrite = () => {
    // role은 ProfileRole("ARTIST" | "USER")
    navigate("/posts/create");
  };

  if (error) return <div style={{ padding: 16 }}>{error}</div>;
  if (!profile) return <div style={{ padding: 16 }}>로딩중...</div>;

  return (
      <div className="profilePage">
        {/* ✅ 헤더 먼저 */}
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

        {/* ✅ 탭 화면(FeedTab/CollectionTab) 출력 위치 */}
        <div className="profileTabPanel">
          <Outlet context={{ role }} />
        </div>

        {/* ✅ 글쓰기 버튼: 내 프로필일 때만 */}
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
