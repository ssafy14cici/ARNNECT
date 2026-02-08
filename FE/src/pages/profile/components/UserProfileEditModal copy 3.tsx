import { useEffect, useMemo, useState } from "react";
import "../profile.css";

import { useBadgeStore } from "../../../features/badge/store";
import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import type { UserProfile, Badge } from "../../../features/profile/types";

import BadgePicker from "../../../features/badge/ui/BadgePicker";
import { resolveMediaUrl } from "../../artworks/detail/utils";

// --------- helpers ---------
function uniq3(ids: string[]) {
  return Array.from(new Set(ids)).slice(0, 3);
}

// ✅ public/badges/badges1~9.png 매핑
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

const ALL_BADGE_IDS = Object.keys(ID_TO_NO);

function badgeImageSrc(id: string) {
  const no = ID_TO_NO[id] ?? 1;
  return `${import.meta.env.BASE_URL}badges/badges${no}.png`;
}

type Props = {
  open: boolean;
  busy: boolean;

  profile: UserProfile;

  earnedBadges: Badge[];
  initialFeaturedIds: string[];

  onRequestClose: () => void;
  onSave: (payload: UpdateMyProfilePatch, nextFeaturedIds: string[]) => Promise<boolean>;
};

export default function UserProfileEditModal({
  open,
  busy,
  profile,
  earnedBadges,
  initialFeaturedIds,
  onRequestClose,
  onSave,
}: Props) {
  const { featured, setFeatured } = useBadgeStore();

  const initialNick = useMemo(() => (profile.nickname ?? profile.name ?? "").trim(), [profile]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [draftNickname, setDraftNickname] = useState(initialNick);
  const [draftPassword, setDraftPassword] = useState("");
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null);

  const [earnedIdsFallback, setEarnedIdsFallback] = useState<string[]>([]);
  const [badgeHint, setBadgeHint] = useState<string | null>(null);

  // ✅ store seeding
  useEffect(() => {
    if (!open) return;
    setFeatured(initialFeaturedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * ✅ 핵심: 서버 카운트 API 호출은 완전히 끊는다.
   * - earnedBadges(prop)가 비어있으면 "전체 뱃지 선택 가능"으로 안전하게 처리
   */
  useEffect(() => {
    if (!open) return;

    const propIds = (earnedBadges ?? []).map((b) => b.id);

    console.log("[badge] earnedBadges(prop) =", earnedBadges);
    console.log("[badge] earnedIds(prop) =", propIds);

    if (propIds.length > 0) {
      setEarnedIdsFallback([]);
      setBadgeHint(null);
      return;
    }

    // ✅ FE-only 안전모드: 활동량 조회 못하니 전체 뱃지 노출
    setEarnedIdsFallback(ALL_BADGE_IDS);
    setBadgeHint("활동량 조회 API가 막혀 있어 전체 뱃지를 표시합니다. (추후 연동 시 '획득만'으로 변경 가능)");
  }, [open, (earnedBadges ?? []).length]);

  // ✅ 최종 earnedIds: prop 우선, 없으면 fallback
  const earnedIds = useMemo(() => {
    const propIds = (earnedBadges ?? []).map((b) => b.id);
    return propIds.length > 0 ? propIds : earnedIdsFallback;
  }, [earnedBadges, earnedIdsFallback]);

  // ✅ 라벨/프리뷰용 Badge 객체: prop 우선, 없으면 id->label 생성
  const earnedBadgesForUI: Badge[] = useMemo(() => {
    if ((earnedBadges ?? []).length > 0) return earnedBadges;
    return earnedIds.map((id) => ({ id, label: ID_TO_LABEL[id] ?? id }));
  }, [earnedBadges, earnedIds]);

  const draftBadgeObjects = useMemo(() => {
    const ids = featured ?? [];
    const map = new Map(earnedBadgesForUI.map((b) => [b.id, b]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Badge[];
  }, [featured, earnedBadgesForUI]);

  const imagePreviewUrl = useMemo(() => {
    if (!draftImageFile) return null;
    return URL.createObjectURL(draftImageFile);
  }, [draftImageFile]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const close = () => {
    setPickerOpen(false);
    onRequestClose();
  };

  const handleSave = async () => {
    const nextFeatured = uniq3(featured ?? []);

    const nickname = draftNickname.trim() || initialNick || "user";
    const password = draftPassword.trim() || undefined;

    const payload: UpdateMyProfilePatch = {
      nickname,
      password,
      image: draftImageFile ?? undefined,
    };

    const ok = await onSave(payload, nextFeatured);
    if (ok) close();
  };

  if (!open) return null;

  const previewSrc = imagePreviewUrl ?? resolveMediaUrl(profile.imageUrl ?? "");

  return (
    <>
      <div className="profileModalOverlay" role="dialog" aria-modal="true">
        <div className="profileModal">
          <div className="profileModalHeader">
            <strong>유저 프로필 편집</strong>
            <button className="profileTextBtn" onClick={close} type="button">
              닫기
            </button>
          </div>

          <div className="profileForm">
            <label className="profileLabel">
              닉네임
              <input
                className="profileInput"
                value={draftNickname}
                onChange={(e) => setDraftNickname(e.target.value)}
                placeholder="닉네임(최대 50자)"
              />
            </label>

            <label className="profileLabel">
              비밀번호 변경(선택)
              <input
                className="profileInput"
                type="password"
                value={draftPassword}
                onChange={(e) => setDraftPassword(e.target.value)}
                placeholder="8자 이상"
              />
              <span className="profileHelp">비워두면 변경하지 않습니다.</span>
            </label>

            <div className="profileLabel">
              <div className="profileRowBetween">
                <span>프로필 이미지</span>
                <label className="profileFileBtn">
                  파일 선택
                  <input
                    className="profileFileInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDraftImageFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className="profileImagePreviewRow">
                <img
                  className="profileImagePreview"
                  src={previewSrc}
                  alt="프로필 미리보기"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="profileHelp">새 파일을 선택하면 업로드됩니다. (URL 입력 방식 X)</span>
              </div>
            </div>

            <div className="profileLabel">
              <div className="profileRowBetween">
                <span>대표 뱃지 (최대 3개)</span>
                <button type="button" className="profileTextBtn" onClick={() => setPickerOpen(true)}>
                  선택하기 &gt;
                </button>
              </div>

              {badgeHint && (
                <div className="profileHelp" style={{ opacity: 0.85 }}>
                  {badgeHint}
                </div>
              )}

              <div className="profileBadgePreview">
                {draftBadgeObjects.length > 0 ? (
                  draftBadgeObjects.map((b) => (
                    <span
                      key={b.id}
                      className="profileBadgePill"
                      style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
                    >
                      <img
                        src={badgeImageSrc(b.id)}
                        alt=""
                        style={{ width: 16, height: 16, objectFit: "contain" }}
                        loading="lazy"
                      />
                      {b.label}
                    </span>
                  ))
                ) : (
                  <span className="profileHintMuted">선택된 뱃지가 없습니다.</span>
                )}
              </div>
            </div>
          </div>

          <div className="profileModalActions">
            <button className="profileBtn" onClick={close} type="button">
              취소
            </button>
            <button className="profileBtn" disabled={busy} onClick={handleSave} type="button">
              저장
            </button>
          </div>
        </div>
      </div>

      {/* ✅ 핵심: earnedIds가 비어있지 않도록(전체 or prop) 보장 */}
      <BadgePicker open={pickerOpen} onClose={() => setPickerOpen(false)} earnedIds={earnedIds} />
    </>
  );
}
