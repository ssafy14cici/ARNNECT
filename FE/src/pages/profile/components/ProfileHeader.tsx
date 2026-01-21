import { useEffect, useMemo, useRef, useState } from "react";
import {  useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";
import { profileApi } from "../api";
import type { ArtistProfile, UserProfile } from "../types";

type ProfileModel = ArtistProfile | UserProfile;

type Props = {
  profile: ProfileModel;
  isOwner: boolean;
  onProfileUpdated: (next: ProfileModel) => void;
};

function isArtistProfile(p: ProfileModel): p is ArtistProfile {
  return p.role === "ARTIST";
}

export default function ProfileHeader({ profile, isOwner, onProfileUpdated }: Props) {
  const navigate = useNavigate();
  const { logout, role: viewerRole } = useAuthStore(); // viewerRole: "general" | "artist"

  const [busy, setBusy] = useState(false);

  // ✅ QnA(일반유저가 예술가에게 질문)
  const [qnaOpen, setQnaOpen] = useState(false);
  const [qnaMessage, setQnaMessage] = useState("");

  // ✅ 편집 모달(로컬 반영)
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftImageUrl, setDraftImageUrl] = useState(profile.imageUrl ?? "");
  const [draftBio, setDraftBio] = useState(profile.bio ?? "");
  const [draftGenre, setDraftGenre] = useState("");

  // ✅ 관리 메뉴
  const [manageOpen, setManageOpen] = useState(false);
  const manageBtnRef = useRef<HTMLButtonElement | null>(null);

  const isArtist = isArtistProfile(profile);

  const badges = useMemo(() => profile.badges ?? [], [profile]);
  const genre = useMemo(() => (isArtist ? (profile as ArtistProfile).genre : undefined), [isArtist, profile]);

  const contactEnabled = useMemo(() => {
    if (!isArtist) return false;
    return (profile as ArtistProfile).contactEnabled !== false;
  }, [isArtist, profile]);

  // ✅ “일반유저가 질문 남기기” 명세 반영: viewer가 general일 때만 QnA 노출
  const canAskQnA = !isOwner && isArtist && contactEnabled && viewerRole === "general";

  // 관리 메뉴 닫힐 때 포커스 복구(접근성 경고 예방)
  useEffect(() => {
    if (!manageOpen) manageBtnRef.current?.focus?.();
  }, [manageOpen]);

  // -------------------------
  // 팔로우/언팔로우
  // -------------------------
  const toggleFollow = async () => {
    if (isOwner) return;
    setBusy(true);
    try {
      if (profile.isFollowing) {
        await profileApi.unfollow(profile.id);
        onProfileUpdated({
          ...profile,
          isFollowing: false,
          followersCount: Math.max(0, profile.followersCount - 1),
        });
      } else {
        await profileApi.follow(profile.id);
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

  // -------------------------
  // QnA 제출
  // -------------------------
  const submitQnA = async () => {
    if (!canAskQnA) return;
    const trimmed = qnaMessage.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      await profileApi.submitQuestionToArtist(profile.id, { message: trimmed });
      setQnaMessage("");
      setQnaOpen(false);
      alert("QnA 전송 완료(목업)");
    } finally {
      setBusy(false);
    }
  };

  // -------------------------
  // 편집(로컬 반영)
  // -------------------------
  const openEdit = () => {
    setDraftName(profile.name);
    setDraftImageUrl(profile.imageUrl ?? "");
    setDraftBio(profile.bio ?? "");
    setDraftGenre(isArtist ? (profile as ArtistProfile).genre ?? "" : "");
    setEditOpen(true);
    setManageOpen(false);
  };

  const saveEdit = () => {
    const next: ProfileModel = isArtist
      ? ({
          ...(profile as ArtistProfile),
          name: draftName.trim() || profile.name,
          imageUrl: draftImageUrl.trim() || null,
          bio: draftBio,
          genre: draftGenre,
        } as ArtistProfile)
      : ({
          ...(profile as UserProfile),
          name: draftName.trim() || profile.name,
          imageUrl: draftImageUrl.trim() || null,
          bio: draftBio,
        } as UserProfile);

    onProfileUpdated(next);
    setEditOpen(false);
  };

  // -------------------------
  // 관리: 로그아웃
  // -------------------------
  const doLogout = () => {
    logout();
    setManageOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <section className="profileHeader">
      <div className="profileHeaderRow">
        <img className="profileAvatar" src={profile.imageUrl ?? "/placeholder.png"} alt="" />

        <div className="profileHeaderMain">
          <div className="profileTitleRow">
            <h2 className="profileName">{profile.name}</h2>

            {/* ✅ 뱃지(공통) */}
            <div className="profileBadges">
              {badges.map((b) => (
                <span key={b.id} className="profileBadge">
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* ✅ 장르(예술가만) */}
          {isArtist && genre && <div className="profileGenre">{genre}</div>}

          {/* ✅ 팔로우/팔로잉(공통) */}
          <div className="profileFollowRow">
            <span>팔로워 {profile.followersCount}</span>
            <span>팔로잉 {profile.followingsCount}</span>
          </div>

          {/* ✅ 소개글(공통) */}
          <div className="profileBio">
            {profile.bio ? (
              <span>{profile.bio}</span>
            ) : isOwner ? (
              <span className="profileBioPlaceholder">소개글을 추가해보세요.</span>
            ) : (
              <span className="profileBioPlaceholder">소개글이 없습니다.</span>
            )}
          </div>

          {/* ✅ 액션(본인: 편집/관리, 타인: 팔로우 + QnA(예술가/일반유저)) */}
          <div className="profileActionRow">
            {isOwner ? (
              <>
                <button className="profileBtn" onClick={openEdit}>
                  편집
                </button>

                <button ref={manageBtnRef} className="profileBtn" onClick={() => setManageOpen((v) => !v)}>
                  관리
                </button>

                {manageOpen && (
                  <div className="profileMenu" role="menu">
                    <button className="profileMenuItem" onClick={openEdit} role="menuitem">
                      프로필 편집
                    </button>
                    <button className="profileMenuItem" onClick={doLogout} role="menuitem">
                      로그아웃
                    </button>
                    <button className="profileMenuItem" onClick={() => setManageOpen(false)} role="menuitem">
                      닫기
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button className="profileBtn" disabled={busy} onClick={toggleFollow}>
                  {profile.isFollowing ? "언팔로우" : "팔로우"}
                </button>

                {/* ✅ QnA(예술가 + 일반유저만) */}
                {canAskQnA && (
                  <button className="profileBtn" onClick={() => setQnaOpen(true)}>
                    QnA
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* ✅ QnA 패널 */}
      {qnaOpen && canAskQnA && (
        <div className="profileQnaPanel">
          <div className="profileQnaHeader">
            <strong>QnA 남기기</strong>
            <button className="profileTextBtn" onClick={() => setQnaOpen(false)}>
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
            <button className="profileBtn" onClick={() => setQnaOpen(false)}>
              취소
            </button>
            <button className="profileBtn" disabled={busy || !qnaMessage.trim()} onClick={submitQnA}>
              보내기
            </button>
          </div>
        </div>
      )}

      {/* ✅ 편집 모달(로컬 반영) */}
      {editOpen && (
        <div className="profileModalOverlay" role="dialog" aria-modal="true">
          <div className="profileModal">
            <div className="profileModalHeader">
              <strong>프로필 편집</strong>
              <button className="profileTextBtn" onClick={() => setEditOpen(false)}>
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
            </div>

            <div className="profileModalActions">
              <button className="profileBtn" onClick={() => setEditOpen(false)}>
                취소
              </button>
              <button className="profileBtn" onClick={saveEdit}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
