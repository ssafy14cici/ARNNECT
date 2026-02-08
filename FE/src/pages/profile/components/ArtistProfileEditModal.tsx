// FE/src/pages/profile/components/ArtistProfileEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import "../profile.css";

import { useBadgeStore } from "../../../features/badge/store";
import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import type { ArtistProfile, Badge } from "../../../features/profile/types";

import BadgePicker from "../../../features/badge/ui/BadgePicker";

// --------- helpers (no any) ---------
type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
function optStringFromObj(obj: object, key: string): string | undefined {
  const rec = obj as JsonObject;
  const v = get(rec, key);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
}
function uniq3(ids: string[]) {
  return Array.from(new Set(ids)).slice(0, 3);
}

// BE 키가 섞여있는 경우 대비용(타입 안전)
type ArtistPatchAliases = {
  sns?: string;
  artIntroduction?: string;
  bio?: string;
};

type Props = {
  open: boolean;
  busy: boolean;

  profile: ArtistProfile;

  earnedBadges: Badge[];
  initialFeaturedIds: string[];

  onRequestClose: () => void;
  onSave: (payload: UpdateMyProfilePatch, nextFeaturedIds: string[]) => Promise<boolean>;
};

export default function ArtistProfileEditModal({
  open,
  busy,
  profile,
  earnedBadges,
  initialFeaturedIds,
  onRequestClose,
  onSave,
}: Props) {
  const { featured, setFeatured } = useBadgeStore();

  // ✅ 초기값 후보들(서버 키가 섞여도 안전)
  const initialNick = useMemo(() => {
    return optStringFromObj(profile, "nickname") ?? asString((profile as { name?: string }).name, "");
  }, [profile]);

  const initialIntro = useMemo(() => {
    const bio = optStringFromObj(profile, "bio");
    const introduction = optStringFromObj(profile, "introduction");
    const artIntroduction = optStringFromObj(profile, "artIntroduction");
    return bio ?? introduction ?? artIntroduction ?? "";
  }, [profile]);

  const initialSns = useMemo(() => {
    const snsPage = optStringFromObj(profile, "snsPage");
    const sns = optStringFromObj(profile, "sns");
    return snsPage ?? sns ?? "";
  }, [profile]);

  // ✅ 프로필 이미지 URL은 resolveMediaUrl로 가공하지 말고 "그대로" 사용
  // - normalizeProfile에서 imageUrl에 imgUrl까지 흡수하지만, 혹시 직접 내려오는 경우까지 방어
  const profileImageUrl = useMemo(() => {
    return optStringFromObj(profile, "imageUrl") ?? optStringFromObj(profile, "imgUrl") ?? "";
  }, [profile]);

  const [pickerOpen, setPickerOpen] = useState(false);

  // common
  const [draftNickname, setDraftNickname] = useState(initialNick);
  const [draftPassword, setDraftPassword] = useState("");
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null);

  // artist only
  const [draftFieldId, setDraftFieldId] = useState<number | undefined>((profile as { fieldId?: number }).fieldId);
  const [draftGenreId, setDraftGenreId] = useState<number | undefined>((profile as { genreId?: number }).genreId);
  const [draftDebutYear, setDraftDebutYear] = useState<number | undefined>((profile as { debutYear?: number }).debutYear);

  const [draftSnsPage, setDraftSnsPage] = useState(initialSns);
  const [draftAffiliation, setDraftAffiliation] = useState(asString((profile as { affiliation?: string }).affiliation, ""));
  const [draftIntroduction, setDraftIntroduction] = useState(initialIntro);

  // ✅ 중요: 이 컴포넌트는 open=false여도 "언마운트"가 아님(그냥 null 렌더)
  // 그래서 open이 true가 되는 시점에 draft/state를 확실히 리셋해줘야 함.
  useEffect(() => {
    if (!open) return;

    setFeatured(initialFeaturedIds);

    setPickerOpen(false);

    setDraftNickname(initialNick);
    setDraftPassword("");
    setDraftImageFile(null);

    setDraftFieldId((profile as { fieldId?: number }).fieldId);
    setDraftGenreId((profile as { genreId?: number }).genreId);
    setDraftDebutYear((profile as { debutYear?: number }).debutYear);

    setDraftSnsPage(initialSns);
    setDraftAffiliation(asString((profile as { affiliation?: string }).affiliation, ""));
    setDraftIntroduction(initialIntro);
  }, [open, initialFeaturedIds, setFeatured, initialNick, initialSns, initialIntro, profile]);

  const draftBadgeObjects = useMemo(() => {
    const ids = featured ?? [];
    const map = new Map(earnedBadges.map((b) => [b.id, b]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Badge[];
  }, [featured, earnedBadges]);

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

    const nickname = draftNickname.trim() || initialNick || "artist";
    const password = draftPassword.trim() || undefined;

    const snsPageTrim = draftSnsPage.trim();
    const affiliationTrim = draftAffiliation.trim();
    const introductionTrim = draftIntroduction.trim();

    const base: UpdateMyProfilePatch = {
      nickname,
      password,
      image: draftImageFile ?? undefined,

      fieldId: draftFieldId,
      genreId: draftGenreId,
      debutYear: draftDebutYear,

      snsPage: snsPageTrim ? snsPageTrim : undefined,
      affiliation: affiliationTrim ? affiliationTrim : undefined,
      introduction: introductionTrim ? introductionTrim : undefined,
    };

    // ✅ 서버가 sns / artIntroduction / bio 를 받는 경우 대비(타입 안전)
    // (실제 UpdateArtistRequest에는 snsPage / introduction 만 있으므로 서버는 나머지 키는 무시)
    const payload: UpdateMyProfilePatch & Partial<ArtistPatchAliases> = {
      ...base,
      ...(snsPageTrim ? { sns: snsPageTrim } : {}),
      ...(introductionTrim ? { artIntroduction: introductionTrim, bio: introductionTrim } : {}),
    };

    const ok = await onSave(payload, nextFeatured);
    if (ok) close();
  };

  if (!open) return null;

  // ✅ preview는 blob 우선, 없으면 서버에서 내려온 프로필 URL 그대로 사용
  const previewSrc = imagePreviewUrl ?? profileImageUrl;

  return (
    <>
      <div className="profileModalOverlay" role="dialog" aria-modal="true">
        <div className="profileModal">
          <div className="profileModalHeader">
            <strong>아티스트 프로필 편집</strong>
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
