// FE/src/pages/profile/components/ProfileEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import "../profile.css";

import { useBadgeStore } from "../../../features/badge/store";
import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import type { ArtistProfile, UserProfile, Badge } from "../../../features/profile/types";

import BadgePicker from "../../../features/badge/ui/BadgePicker";

type ProfileModel = ArtistProfile | UserProfile;

type Props = {
  open: boolean;
  busy: boolean;

  profile: ProfileModel;
  isArtist: boolean;

  earnedBadges: Badge[];
  initialFeaturedIds: string[];

  onRequestClose: () => void;

  onSave: (payload: UpdateMyProfilePatch, nextFeaturedIds: string[]) => Promise<boolean>;
};

export default function ProfileEditModal({
  open,
  busy,
  profile,
  isArtist,
  earnedBadges,
  initialFeaturedIds,
  onRequestClose,
  onSave,
}: Props) {
  const { featured, setFeatured } = useBadgeStore();

  // badge picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFeaturedBadgeIds, setDraftFeaturedBadgeIds] = useState<string[]>(() => initialFeaturedIds);

  // common
  const [draftNickname, setDraftNickname] = useState(profile.name);
  const [draftPassword, setDraftPassword] = useState("");
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null);

  // artist only
  const [draftFieldId, setDraftFieldId] = useState<number | undefined>(undefined);
  const [draftGenreId, setDraftGenreId] = useState<number | undefined>(undefined);
  const [draftDebutYear, setDraftDebutYear] = useState<number | undefined>(undefined);
  const [draftSnsPage, setDraftSnsPage] = useState("");
  const [draftAffiliation, setDraftAffiliation] = useState("");
  const [draftIntroduction, setDraftIntroduction] = useState(profile.bio ?? "");

  // open init
  useEffect(() => {
    if (!open) return;

    // nickname: 화면 name을 기본값으로 쓰되, 서버에서 nickname이 있으면 그걸 우선
    const initialNick =
      (profile as UserProfile).nickname ??
      (isArtist ? (profile as ArtistProfile).name : profile.name) ??
      profile.name;

    setDraftNickname(initialNick);
    setDraftPassword("");
    setDraftImageFile(null);

    if (isArtist) {
      const p = profile as ArtistProfile;

      setDraftFieldId(p.fieldId ?? undefined);
      setDraftGenreId(p.genreId ?? undefined);
      setDraftDebutYear(p.debutYear ?? undefined);

      setDraftSnsPage(p.snsPage ?? p.sns ?? "");
      setDraftAffiliation(p.affiliation ?? "");

      // intro: bio 우선, 없으면 introduction/artIntroduction
      setDraftIntroduction(p.bio ?? p.introduction ?? p.artIntroduction ?? "");
    } else {
      setDraftIntroduction(profile.bio ?? "");
    }

    setDraftFeaturedBadgeIds(initialFeaturedIds);
    setFeatured(initialFeaturedIds);
    setPickerOpen(false);
  }, [open, profile, isArtist, initialFeaturedIds, setFeatured]);

  // store -> draft sync (modal open일 때만)
  useEffect(() => {
    if (!open) return;
    setDraftFeaturedBadgeIds(featured);
  }, [featured, open]);

  const draftBadgeObjects = useMemo(() => {
    const map = new Map(earnedBadges.map((b) => [b.id, b]));
    return draftFeaturedBadgeIds.map((id) => map.get(id)).filter(Boolean) as Badge[];
  }, [draftFeaturedBadgeIds, earnedBadges]);

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
    const nextFeatured = Array.from(new Set(draftFeaturedBadgeIds)).slice(0, 3);

    // ✅ BE updateArtist 정책(빈 문자열 무시)과 정합 맞추기:
    //    - 문자열은 trim 후 빈 값이면 undefined로 보내서 "아예 미전송" 되게 함.
    const nickname = draftNickname.trim() || profile.name;
    const password = draftPassword.trim() || undefined;

    const snsPageTrim = draftSnsPage.trim();
    const affiliationTrim = draftAffiliation.trim();
    const introductionTrim = draftIntroduction.trim();

    const payload: UpdateMyProfilePatch = isArtist
      ? {
          nickname,
          password,
          image: draftImageFile ?? undefined,

          fieldId: draftFieldId,
          genreId: draftGenreId,
          debutYear: draftDebutYear,

          snsPage: snsPageTrim ? snsPageTrim : undefined,
          affiliation: affiliationTrim ? affiliationTrim : undefined,
          introduction: introductionTrim ? introductionTrim : undefined,
        }
      : {
          nickname,
          password,
          image: draftImageFile ?? undefined,
        };

    const ok = await onSave(payload, nextFeatured);
    if (ok) close();
  };

  if (!open) return null;

  return (
    <>
      <div className="profileModalOverlay" role="dialog" aria-modal="true">
        <div className="profileModal">
          <div className="profileModalHeader">
            <strong>프로필 편집</strong>
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
                  src={imagePreviewUrl ?? (profile.imageUrl ?? "")}
                  alt="프로필 미리보기"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="profileHelp">새 파일을 선택하면 업로드됩니다. (URL 입력 방식 X)</span>
              </div>
            </div>

            {isArtist && (
              <>
                <div className="profileGrid2">
                  <label className="profileLabel">
                    분야 ID (fieldId)
                    <input
                      className="profileInput"
                      type="number"
                      min={1}
                      value={draftFieldId ?? ""}
                      onChange={(e) => setDraftFieldId(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="예: 1"
                    />
                  </label>

                  <label className="profileLabel">
                    장르 ID (genreId)
                    <input
                      className="profileInput"
                      type="number"
                      min={1}
                      value={draftGenreId ?? ""}
                      onChange={(e) => setDraftGenreId(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="예: 1"
                    />
                  </label>
                </div>

                <label className="profileLabel">
                  데뷔 연도 (debutYear)
                  <input
                    className="profileInput"
                    type="number"
                    max={2100}
                    value={draftDebutYear ?? ""}
                    onChange={(e) => setDraftDebutYear(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="예: 2020"
                  />
                </label>

                <label className="profileLabel">
                  SNS 페이지 (snsPage)
                  <input
                    className="profileInput"
                    value={draftSnsPage}
                    onChange={(e) => setDraftSnsPage(e.target.value)}
                    placeholder="예: https://instagram.com/..."
                  />
                </label>

                <label className="profileLabel">
                  소속 (affiliation)
                  <input
                    className="profileInput"
                    value={draftAffiliation}
                    onChange={(e) => setDraftAffiliation(e.target.value)}
                    placeholder="예: SSAFY"
                  />
                </label>

                <label className="profileLabel">
                  소개글 (introduction)
                  <textarea
                    className="profileTextarea"
                    value={draftIntroduction}
                    onChange={(e) => setDraftIntroduction(e.target.value)}
                    rows={4}
                    placeholder="최대 1000자"
                  />
                </label>
              </>
            )}

            <div className="profileLabel">
              <div className="profileRowBetween">
                <span>대표 뱃지 (최대 3개)</span>
                <button type="button" className="profileTextBtn" onClick={() => setPickerOpen(true)}>
                  선택하기 &gt;
                </button>
              </div>

              <div className="profileBadgePreview">
                {draftBadgeObjects.length > 0 ? (
                  draftBadgeObjects.map((b) => (
                    <span key={b.id} className="profileBadgePill">
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

      <BadgePicker open={pickerOpen} onClose={() => setPickerOpen(false)} earnedIds={earnedBadges.map((b) => b.id)} />
    </>
  );
}
