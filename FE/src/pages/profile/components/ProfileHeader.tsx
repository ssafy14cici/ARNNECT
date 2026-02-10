// FE/src/pages/profile/components/ProfileHeader.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../profile.css";

import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import { profileApi } from "../../../features/profile/api";
import { useAuthStore } from "../../../features/auth/store";
import { useBadgeStore } from "../../../features/badge/store";

import basicProfile from "../../../assets/basicprofile.png";
import type { ArtistProfile, UserProfile, Badge } from "../../../features/profile/types";

import ProfileEditModal from "./ProfileEditModal";
import FanLetterSendModal from "../../../features/fanLetter/ui/FanLetterSendModal";

// ✅ 프로필 전용 미디어 URL 리졸버
import { resolveProfileMediaUrl } from "../../../features/profile/resolveProfileMedia";

type ProfileModel = ArtistProfile | UserProfile;

type ProfileHeaderProps = {
  profile: ProfileModel;
  isOwner: boolean;
  onProfileUpdated: (next: ProfileModel) => void;
};

function isArtistProfile(p: ProfileModel): p is ArtistProfile {
  return p.role === "ARTIST";
}

function clampFeaturedIds(profile: ProfileModel, max = 3) {
  const all = profile.badges ?? [];
  const ids =
    profile.featuredBadgeIds && profile.featuredBadgeIds.length > 0
      ? profile.featuredBadgeIds
      : all.map((b) => b.id);
  return Array.from(new Set(ids)).slice(0, max);
}

const ID_TO_NO: Record<string, number> = {
  review_lv1: 1,
  review_lv2: 2,
  review_lv3: 3,
  ticket_lv1: 4,
  ticket_lv2: 5,
  ticket_lv3: 6,
  social_lv1: 7,
  social_lv2: 8,
  social_lv3: 9,
};

const ID_TO_LABEL: Record<string, string> = {
  review_lv1: "첫 리뷰",
  review_lv2: "리뷰러",
  review_lv3: "리뷰 마스터",
  ticket_lv1: "첫 티켓",
  ticket_lv2: "컬렉터",
  ticket_lv3: "슈퍼 컬렉터",
  social_lv1: "첫 팔로워",
  social_lv2: "인기 유저",
  social_lv3: "인플루언서",
};

function badgeImageSrc(id: string) {
  const no = ID_TO_NO[id] ?? 1;
  return `${import.meta.env.BASE_URL}badges/badges${no}.png`;
}

export default function ProfileHeader({ profile, isOwner, onProfileUpdated }: ProfileHeaderProps) {
  const navigate = useNavigate();

  const { logout, role: viewerRole } = useAuthStore();
  const { setFeatured } = useBadgeStore();

  const [busy, setBusy] = useState(false);
  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const manageBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  const isArtist = isArtistProfile(profile);

  const earnedBadges = useMemo<Badge[]>(() => profile.badges ?? [], [profile.badges]);
  const initialFeaturedIds = useMemo(() => clampFeaturedIds(profile, 3), [profile]);

  const featuredBadges = useMemo(() => {
    const ids = clampFeaturedIds(profile, 3);
    const map = new Map((profile.badges ?? []).map((b) => [b.id, b]));

    return ids
      .map((id) => {
        const fromServer = map.get(id);
        if (fromServer) return fromServer;
        return { id, label: ID_TO_LABEL[id] ?? id } as Badge;
      })
      .filter(Boolean) as Badge[];
  }, [profile]);

  const genre = useMemo(() => (isArtist ? (profile as ArtistProfile).genre : undefined), [isArtist, profile]);

  const contactEnabled = useMemo(() => {
    if (!isArtist) return false;
    return (profile as ArtistProfile).contactEnabled !== false;
  }, [isArtist, profile]);

  const canSendFanLetter = !isOwner && isArtist && contactEnabled && viewerRole === "general";

  // ✅ 프로필 이미지: resolveProfileMediaUrl 적용
  const avatarSrc = useMemo(() => {
    const u = resolveProfileMediaUrl(profile.imageUrl ?? "");
    return u ? u : basicProfile;
  }, [profile.imageUrl]);

  useEffect(() => {
    if (manageOpen) firstMenuItemRef.current?.focus?.();
    else manageBtnRef.current?.focus?.();
  }, [manageOpen]);

  useEffect(() => {
    if (!manageOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (manageBtnRef.current?.contains(target)) return;
      setManageOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setManageOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [manageOpen]);

  // ✅ targetId 보정 (id가 uuid가 아닐 수도 있는 케이스 방어)
  const targetId = useMemo(() => {
    return String((profile as any).id ?? (profile as any).memberUuid ?? "").trim();
  }, [profile]);

  const toggleFollow = async () => {
    if (busy) return;
    if (isOwner) return;
    if (!targetId) return;

    const prev = profile;

    const nextIsFollowing = !prev.isFollowing;
    const nextFollowersCount = nextIsFollowing ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1);

    const optimistic: ProfileModel = {
      ...prev,
      isFollowing: nextIsFollowing,
      followersCount: nextFollowersCount,
    };

    setBusy(true);
    onProfileUpdated(optimistic);

    try {
      if (prev.isFollowing) await profileApi.unfollow(targetId);
      else await profileApi.follow(targetId);

      try {
        const latest = await profileApi.getProfile(targetId);
        onProfileUpdated(latest as ProfileModel);
      } catch {
        // 재조회 실패 → 낙관 업데이트 유지
      }
    } catch (e) {
      onProfileUpdated(prev);
      alert(e instanceof Error ? e.message : "팔로우 변경 실패");
    } finally {
      setBusy(false);
    }
  };

  const submitFanLetter = async (message: string) => {
    if (busy) return;
    if (!canSendFanLetter) return;
    if (!targetId) return;

    setBusy(true);
    try {
      await profileApi.sendFanLetter(targetId, message);
      alert("팬레터 전송 완료");
      setFanLetterOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "팬레터 전송 실패");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    setEditOpen(true);
    setManageOpen(false);
    setFeatured(initialFeaturedIds);
  };

  const saveProfileFromModal = async (payload: UpdateMyProfilePatch, nextFeaturedIds: string[]) => {
    if (!isOwner) return false;
    if (busy) return false;

    const prev = profile;
    setBusy(true);

    try {
      const optimisticProfile: ProfileModel = { ...prev } as ProfileModel;

      if (payload.nickname) {
        optimisticProfile.name = payload.nickname;
        if (optimisticProfile.role === "USER") {
          (optimisticProfile as UserProfile).nickname = payload.nickname;
        }
      }

      // ✅ 모달에서 선택한 File은 미리보기용 objectUrl 사용
      if (payload.image && payload.image instanceof File) {
        const imageUrl = URL.createObjectURL(payload.image);
        optimisticProfile.imageUrl = imageUrl;
      }

      optimisticProfile.featuredBadgeIds = nextFeaturedIds;

      onProfileUpdated(optimisticProfile);

      await profileApi.updateMyProfile(profile.role, payload);
      const target = targetId;
      await profileApi.updateFeaturedBadges(profile.role, target, nextFeaturedIds);

      try {
        const latest = await profileApi.getMyProfile();
        onProfileUpdated({ ...(latest as ProfileModel), featuredBadgeIds: nextFeaturedIds } as ProfileModel);
      } catch {}

      return true;
    } catch (e) {
      onProfileUpdated(prev);
      alert(e instanceof Error ? e.message : "프로필 저장 실패");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const doLogout = () => {
    logout();
    setManageOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <section className="profileHeader">
      <div className="profileHeaderRow">
        <img
          className="profileAvatar"
          src={avatarSrc}
          alt={`${profile.name} 프로필`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = basicProfile;
          }}
        />

        <div className="profileHeaderMain">
          <div className="profileTitleRow">
            <h2 className="profileName">{profile.name}</h2>

            <div className="profileBadges">
              {featuredBadges.map((b) => (
                <span
                  key={b.id}
                  className="profileBadge"
                  style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
                >
                  <img src={badgeImageSrc(b.id)} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {isArtist && genre && <div className="profileGenre">{genre}</div>}

          <div className="profileFollowRow">
            <span>팔로워 {profile.followersCount}</span>
            <span>팔로잉 {profile.followingsCount}</span>
          </div>

          <div className="profileActionRow">
            {isOwner ? (
              <>
                <button
                  ref={manageBtnRef}
                  className="profileBtn"
                  onClick={() => setManageOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={manageOpen}
                  aria-controls="profile-manage-menu"
                  type="button"
                >
                  관리
                </button>

                {manageOpen && (
                  <div id="profile-manage-menu" ref={menuRef} className="profileMenu" role="menu">
                    <button
                      ref={firstMenuItemRef}
                      className="profileMenuItem"
                      onClick={openEdit}
                      role="menuitem"
                      type="button"
                    >
                      프로필 편집
                    </button>

                    <button className="profileMenuItem" onClick={doLogout} role="menuitem" type="button">
                      로그아웃
                    </button>

                    <button
                      className="profileMenuItem"
                      onClick={() => setManageOpen(false)}
                      role="menuitem"
                      type="button"
                    >
                      닫기
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button className="profileBtn" disabled={busy} onClick={toggleFollow} type="button">
                  {profile.isFollowing ? "언팔로우" : "팔로우"}
                </button>

                {canSendFanLetter && (
                  <button className="profileBtn" onClick={() => setFanLetterOpen(true)} type="button">
                    팬레터
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <FanLetterSendModal
        open={fanLetterOpen}
        sending={busy}
        artistName={profile.name}
        onClose={() => setFanLetterOpen(false)}
        onSend={submitFanLetter}
      />

      <ProfileEditModal
        open={editOpen}
        busy={busy}
        profile={profile}
        isArtist={isArtist}
        earnedBadges={earnedBadges}
        initialFeaturedIds={initialFeaturedIds}
        onRequestClose={() => setEditOpen(false)}
        onSave={saveProfileFromModal}
      />
    </section>
  );
}
