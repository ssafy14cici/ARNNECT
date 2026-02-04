import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../profile.css";

import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import { useAuthStore } from "../../../features/auth/store";
import { profileApi } from "../../../features/profile/api";
import { useBadgeStore } from "../../../features/badge/store";

import basicProfile from "../../../assets/basicprofile.png";
import type { ArtistProfile, UserProfile, Badge } from "../../../features/profile/types";

import ProfileEditModal from "./ProfileEditModal";

// ✅ QnA 패널 제거, 팬레터 모달로 교체
import FanLetterSendModal from "../../../features/fanLetter/ui/FanLetterSendModal";

type ProfileModel = ArtistProfile | UserProfile;

type Props = {
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

export default function ProfileHeader({ profile, isOwner, onProfileUpdated }: Props) {
  const navigate = useNavigate();

  const { logout, role: viewerRole } = useAuthStore();
  const { setFeatured } = useBadgeStore();

  const [busy, setBusy] = useState(false);

  // ✅ FanLetter modal open
  const [fanLetterOpen, setFanLetterOpen] = useState(false);

  // Edit modal open
  const [editOpen, setEditOpen] = useState(false);

  // Manage menu
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
    return ids.map((id) => map.get(id)).filter(Boolean) as Badge[];
  }, [profile]);

  const genre = useMemo(
    () => (isArtist ? (profile as ArtistProfile).genre : undefined),
    [isArtist, profile],
  );

  const contactEnabled = useMemo(() => {
    if (!isArtist) return false;
    return (profile as ArtistProfile).contactEnabled !== false;
  }, [isArtist, profile]);

  // ✅ “QnA” → “팬레터”
  const canSendFanLetter = !isOwner && isArtist && contactEnabled && viewerRole === "general";

  const avatarSrc = useMemo(() => {
    const u = String(profile.imageUrl ?? "").trim();
    if (!u || u === "null" || u === "undefined") return basicProfile;
    return u;
  }, [profile.imageUrl]);

  // Manage menu focus
  useEffect(() => {
    if (manageOpen) firstMenuItemRef.current?.focus?.();
    else manageBtnRef.current?.focus?.();
  }, [manageOpen]);

  // click outside / esc
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

  const toggleFollow = async () => {
    if (isOwner) return;
    if (!profile.id) return;

    const prev = profile;

    const optimistic: ProfileModel = prev.isFollowing
      ? { ...prev, isFollowing: false, followersCount: Math.max(0, prev.followersCount - 1) }
      : { ...prev, isFollowing: true, followersCount: prev.followersCount + 1 };

    setBusy(true);
    onProfileUpdated(optimistic);

    try {
      if (prev.isFollowing) await profileApi.unfollow(prev.id);
      else await profileApi.follow(prev.id);
    } catch (e) {
      onProfileUpdated(prev);
      alert(e instanceof Error ? e.message : "팔로우 변경 실패");
    } finally {
      setBusy(false);
    }
  };

  // ✅ 기존 QnA 전송 로직을 “팬레터 전송”으로 이름/메시지만 교체
  const submitFanLetter = async (message: string) => {
    if (!canSendFanLetter) return;
    if (!profile.id) return;

    setBusy(true);
    try {
      await profileApi.sendFanLetter(profile.id, message);
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

    setBusy(true);
    try {
      const updated = await profileApi.updateMyProfile(profile.role, payload);
      onProfileUpdated(updated as ProfileModel);

      await profileApi.updateFeaturedBadges(profile.role, updated.id, nextFeaturedIds);
      return true;
    } catch (e) {
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
                <span key={b.id} className="profileBadge">
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

          <div className="profileBio">
            {profile.bio ? (
              <span>{profile.bio}</span>
            ) : isOwner ? (
              <span className="profileBioPlaceholder">소개글을 추가해보세요.</span>
            ) : (
              <span className="profileBioPlaceholder">소개글이 없습니다.</span>
            )}
          </div>

          <div className="profileActionRow">
            {isOwner ? (
              <>
                <button className="profileBtn" onClick={openEdit} type="button">
                  편집
                </button>

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

      {/* ✅ ProfileQnaPanel 삭제 → FanLetterSendModal 사용 */}
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
