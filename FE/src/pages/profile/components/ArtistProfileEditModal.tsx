// FE/src/pages/profile/components/ArtistProfileEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import "../profile.css";

import { useBadgeStore } from "../../../features/badge/store";
import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import type { ArtistProfile, Badge } from "../../../features/profile/types";

import BadgePicker from "../../../features/badge/ui/BadgePicker";
import { resolveMediaUrl } from "../../artworks/detail/utils";

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

  // ✅ 모달은 open=false면 언마운트되므로 useState 초기값으로만 세팅하면 됨(=effect setState 불필요)
  const initialNick = useMemo(() => {
    // ArtistProfile에 nickname 없으므로, 혹시 서버가 내려주는 경우만 안전하게 읽고, 기본은 name
    return optStringFromObj(profile, "nickname") ?? asString((profile as { name?: string }).name, "");
  }, [profile]);

  const initialIntro = useMemo(() => {
    // ArtistProfile에 있는 후보 키들만 안전하게 접근(없는 키는 optStringFromObj로)
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

  const [pickerOpen, setPickerOpen] = useState(false);

  // common
  const [draftNickname, setDraftNickname] = useState(initialNick);
  const [draftPassword, setDraftPassword] = useState("");
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null);

  // artist only (존재하는 필드라고 가정되는 것들만 안전하게)
  const [draftFieldId, setDraftFieldId] = useState<number | undefined>((profile as { fieldId?: number }).fieldId);
  const [draftGenreId, setDraftGenreId] = useState<number | undefined>((profile as { genreId?: number }).genreId);
  const [draftDebutYear, setDraftDebutYear] = useState<number | undefined>((profile as { debutYear?: number }).debutYear);

  const [draftSnsPage, setDraftSnsPage] = useState(initialSns);
  const [draftAffiliation, setDraftAffiliation] = useState(asString((profile as { affiliation?: string }).affiliation, ""));
  const [draftIntroduction, setDraftIntroduction] = useState(initialIntro);

  // ✅ store seeding (React setState 아님)
  useEffect(() => {
    if (!open) return;
    setFeatured(initialFeaturedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    const payload: UpdateMyProfilePatch & Partial<ArtistPatchAliases> = {
      ...base,
      ...(snsPageTrim ? { sns: snsPageTrim } : {}),
      ...(introductionTrim ? { artIntroduction: introductionTrim, bio: introductionTrim } : {}),
    };

    const ok = await onSave(payload, nextFeatured);
    if (ok) close();
  };

  if (!open) return null;

  const previewSrc =
    imagePreviewUrl ??
    resolveMediaUrl(asString((profile as { imageUrl?: string }).imageUrl, ""));

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
