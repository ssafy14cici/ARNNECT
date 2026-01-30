// FE/src/pages/profile/components/ProfileHeader.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../features/auth/store";
import { useBadgeStore } from "../../../features/badge/store"; // ✅ 스토어 임포트 추가
import basicProfile from "../../../assets/basicprofile.png";
import type {
  ArtistProfile,
  UserProfile,
  Badge,
} from "../../../features/profile/types";
import BadgePicker from "../../../components/badge/BadgePicker"; // ✅ BadgePicker 사용

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

export default function ProfileHeader({
  profile,
  isOwner,
  onProfileUpdated,
}: Props) {
  const navigate = useNavigate();
  const { logout, role: viewerRole } = useAuthStore();
  const { featured, setFeatured } = useBadgeStore(); // ✅ 뱃지 스토어 사용

  const [busy, setBusy] = useState(false);

  // ✅ QnA 상태
  const [qnaOpen, setQnaOpen] = useState(false);
  const [qnaMessage, setQnaMessage] = useState("");

  // ✅ 편집 모달 상태
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftImageUrl, setDraftImageUrl] = useState(profile.imageUrl ?? "");
  const [draftBio, setDraftBio] = useState(profile.bio ?? "");
  const [draftGenre, setDraftGenre] = useState("");
  
  // ✅ 뱃지 선택 모달(BadgePicker) 상태
  const [pickerOpen, setPickerOpen] = useState(false); 
  const [draftFeaturedBadgeIds, setDraftFeaturedBadgeIds] = useState<string[]>(
    () => clampFeaturedIds(profile, 3),
  );

  // ✅ 관리 메뉴 상태
  const [manageOpen, setManageOpen] = useState(false);
  const manageBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  const isArtist = isArtistProfile(profile);

  const earnedBadges = useMemo<Badge[]>(
    () => profile.badges ?? [],
    [profile.badges],
  );

  // ✅ BadgePicker가 스토어를 업데이트하면, 로컬 draft 상태도 동기화
  useEffect(() => {
    if (editOpen) {
      setDraftFeaturedBadgeIds(featured);
    }
  }, [featured, editOpen]);

  // ✅ 헤더용: 실제 프로필의 대표 뱃지 객체 매핑
  const featuredBadges = useMemo(() => {
    const ids = clampFeaturedIds(profile, 3);
    const map = new Map((profile.badges ?? []).map((b) => [b.id, b]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Badge[];
  }, [profile]);

  // ✅ 편집용: 선택된 뱃지 ID를 객체로 매핑 (미리보기용)
  const draftBadgeObjects = useMemo(() => {
    const map = new Map(earnedBadges.map((b) => [b.id, b]));
    return draftFeaturedBadgeIds.map((id) => map.get(id)).filter(Boolean) as Badge[];
  }, [draftFeaturedBadgeIds, earnedBadges]);

  const genre = useMemo(
    () => (isArtist ? (profile as ArtistProfile).genre : undefined),
    [isArtist, profile],
  );

  const contactEnabled = useMemo(() => {
    if (!isArtist) return false;
    return (profile as ArtistProfile).contactEnabled !== false;
  }, [isArtist, profile]);

  const canAskQnA =
    !isOwner && isArtist && contactEnabled && viewerRole === "general";

  const avatarSrc = useMemo(() => {
    const url = (profile.imageUrl ?? "").trim();
    if (!url || url === "null" || url === "undefined") return basicProfile;
    return url;
  }, [profile.imageUrl]);

  // 메뉴 관리 로직 (Focus, Click Outside)
  useEffect(() => {
    if (manageOpen) {
      firstMenuItemRef.current?.focus?.();
    } else {
      manageBtnRef.current?.focus?.();
    }
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

  const toggleFollow = async () => {
    if (isOwner) return;
    setBusy(true);
    try {
      if (profile.isFollowing) {
        onProfileUpdated({
          ...profile,
          isFollowing: false,
          followersCount: Math.max(0, profile.followersCount - 1),
        });
      } else {
        onProfileUpdated({
          ...profile,
          isFollowing: true,
          followersCount: profile.followersCount + 1,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const submitQnA = async () => {
    if (!canAskQnA) return;
    const trimmed = qnaMessage.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      setQnaMessage("");
      setQnaOpen(false);
      alert("QnA 전송 완료(목업)");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    setDraftName(profile.name);
    setDraftImageUrl(profile.imageUrl ?? "");
    setDraftBio(profile.bio ?? "");
    setDraftGenre(isArtist ? ((profile as ArtistProfile).genre ?? "") : "");

    // ✅ 편집 시작 시, 스토어 데이터를 현재 프로필 상태로 초기화
    const currentFeatured = clampFeaturedIds(profile, 3);
    setDraftFeaturedBadgeIds(currentFeatured);
    setFeatured(currentFeatured); 

    setEditOpen(true);
    setManageOpen(false);
  };

  const saveEdit = () => {
    // ✅ 저장 시점의 스토어(또는 draft) 상태를 프로필에 반영
    const nextFeatured = Array.from(new Set(draftFeaturedBadgeIds)).slice(0, 3);

    const next: ProfileModel = isArtist
      ? ({
          ...(profile as ArtistProfile),
          name: draftName.trim() || profile.name,
          imageUrl: draftImageUrl.trim() || null,
          bio: draftBio,
          genre: draftGenre,
          featuredBadgeIds: nextFeatured,
        } satisfies ArtistProfile)
      : ({
          ...(profile as UserProfile),
          name: draftName.trim() || profile.name,
          imageUrl: draftImageUrl.trim() || null,
          bio: draftBio,
          featuredBadgeIds: nextFeatured,
        } satisfies UserProfile);

    onProfileUpdated(next);
    setEditOpen(false);
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
              <span className="profileBioPlaceholder">
                소개글을 추가해보세요.
              </span>
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
                    <button ref={firstMenuItemRef} className="profileMenuItem" onClick={openEdit} role="menuitem" type="button">
                      프로필 편집
                    </button>
                    <button className="profileMenuItem" onClick={doLogout} role="menuitem" type="button">
                      로그아웃
                    </button>
                    <button className="profileMenuItem" onClick={() => setManageOpen(false)} role="menuitem" type="button">
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
                {canAskQnA && (
                  <button className="profileBtn" onClick={() => setQnaOpen(true)} type="button">
                    QnA
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* QnA Panel */}
      {qnaOpen && canAskQnA && (
        <div className="profileQnaPanel">
          <div className="profileQnaHeader">
            <strong>QnA 남기기</strong>
            <button className="profileTextBtn" onClick={() => setQnaOpen(false)} type="button">
              닫기
            </button>
          </div>
          <textarea
            className="profileTextarea"
            value={qnaMessage}
            onChange={(e) => setQnaMessage(e.target.value)}
            rows={4}
            placeholder="예: 작품 제작 과정이 궁금해요."
          />
          <div className="profileQnaActions">
            <button className="profileBtn" onClick={() => setQnaOpen(false)} type="button">
              취소
            </button>
            <button className="profileBtn" disabled={busy || !qnaMessage.trim()} onClick={submitQnA} type="button">
              보내기
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="profileModalOverlay" role="dialog" aria-modal="true">
          <div className="profileModal">
            <div className="profileModalHeader">
              <strong>프로필 편집</strong>
              <button className="profileTextBtn" onClick={() => setEditOpen(false)} type="button">
                닫기
              </button>
            </div>

            <div className="profileForm">
              <label className="profileLabel">
                이름(활동명/닉네임)
                <input className="profileInput" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              </label>

              <label className="profileLabel">
                프로필 이미지 URL(목업)
                <input className="profileInput" value={draftImageUrl} onChange={(e) => setDraftImageUrl(e.target.value)} />
              </label>

              {isArtist && (
                <label className="profileLabel">
                  장르
                  <input className="profileInput" value={draftGenre} onChange={(e) => setDraftGenre(e.target.value)} />
                </label>
              )}

              <label className="profileLabel">
                소개글
                <textarea className="profileTextarea" value={draftBio} onChange={(e) => setDraftBio(e.target.value)} rows={4} />
              </label>

              {/* ✅ 뱃지 선택 UI 리뉴얼 */}
              <div className="profileLabel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span>대표 뱃지 (최대 3개)</span>
                  <button 
                    type="button" 
                    className="profileTextBtn" 
                    onClick={() => setPickerOpen(true)}
                    style={{ fontSize: '0.85rem', color: '#C8A97E' }}
                  >
                    선택하기 &gt;
                  </button>
                </div>
                
                {/* 선택된 뱃지 미리보기 */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {draftBadgeObjects.length > 0 ? (
                    draftBadgeObjects.map((b) => (
                      <span 
                        key={b.id} 
                        style={{ 
                          padding: '4px 10px', 
                          background: 'rgba(255,255,255,0.1)', 
                          borderRadius: '12px', 
                          fontSize: '0.8rem',
                          color: '#eee'
                        }}
                      >
                        {b.label}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>선택된 뱃지가 없습니다.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="profileModalActions">
              <button className="profileBtn" onClick={() => setEditOpen(false)} type="button">
                취소
              </button>
              <button className="profileBtn" onClick={saveEdit} type="button">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Badge Picker Modal (Portal) */}
      <BadgePicker 
        open={pickerOpen} 
        onClose={() => setPickerOpen(false)} 
        earnedIds={earnedBadges.map(b => b.id)} 
      />
    </section>
  );
}