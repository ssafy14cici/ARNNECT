// FE/src/pages/profile/components/UserProfileEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import "../profile.css";

import { useBadgeStore } from "../../../features/badge/store";
import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import type { UserProfile, Badge } from "../../../features/profile/types";

import BadgePicker from "../../../features/badge/ui/BadgePicker";
import { resolveMediaUrl } from "../../artworks/detail/utils";

// ✅ 추가: 뱃지 기준/계산/이미지
import { BADGES } from "../../../shared/config/badges"; // BadgePicker가 쓰는 것과 동일 소스 권장
import type { BadgeStats } from "../../../features/badge/types";
import { computeEarnedBadgeIds } from "../../../features/badge/rules";
import { badgeImageSrc } from "../../../features/badge/assets";
import { useAuthStore } from "../../../features/auth/store";

// --------- helpers ---------
function uniq3(ids: string[]) {
  return Array.from(new Set(ids)).slice(0, 3);
}

function unwrapData(v: any) {
  return v?.data ?? v;
}

// ✅ API helper (DEV: 상대경로 프록시 / PROD: VITE_API_BASE_URL의 origin + path)
function getApiOrigin() {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  try {
    return apiBase ? new URL(apiBase).origin : "";
  } catch {
    return "";
  }
}
async function apiGet<T>(path: string): Promise<T> {
  const u0 = path.startsWith("/") ? path : `/${path}`;
  const isDev = !!import.meta.env.DEV;

  const origin = getApiOrigin();
  const url = /^https?:\/\//i.test(u0) ? u0 : isDev ? u0 : origin ? `${origin}${u0}` : u0;

  const st: any = useAuthStore.getState();
  const token = st.accessToken ?? st.token ?? st.jwt ?? "";

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API 실패 ${res.status}: ${url}`);
  return (await res.json()) as T;
}

async function firstOk<T>(candidates: string[]): Promise<T> {
  let lastErr: any = null;
  for (const p of candidates) {
    try {
      return await apiGet<T>(p);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("모든 후보 엔드포인트 실패");
}

type Props = {
  open: boolean;
  busy: boolean;

  profile: UserProfile;

  earnedBadges: Badge[]; // (서버/부모가 주는 값)
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

  // ✅ 추가: earnedIds fallback (earnedBadges가 비어있을 때 프론트 계산)
  const [earnedIdsFallback, setEarnedIdsFallback] = useState<string[]>([]);

  // ✅ open=false면 언마운트 → useState 초기값만으로 충분
  useEffect(() => {
    if (!open) return;
    setFeatured(initialFeaturedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ✅ open 시: earnedBadges가 비어있으면 프론트에서 계산해 채움
  useEffect(() => {
    if (!open) return;

    const propIds = (earnedBadges ?? []).map((b) => b.id);
    console.log("[badge] earnedBadges(prop) =", earnedBadges);
    console.log("[badge] earnedIds(prop) =", propIds);

    // ✅ 서버/부모가 준 earnedBadges가 있으면 그걸 신뢰
    if (propIds.length > 0) {
      setEarnedIdsFallback([]);
      return;
    }

    // ✅ 없으면: reviewCount/ticketCount/followerCount로 계산
    (async () => {
      // 후보 엔드포인트 (너희 실제 경로에 맞으면 여기서 바로 잡힘)
      const REVIEW_MY = ["/api/v1/review/my", "/api/v1/reviews/my", "/review/my", "/reviews/my"];
      const TICKET_COUNT = ["/api/v1/ticket/count", "/api/v1/tickets/count", "/ticket/count", "/tickets/count"];

      const followerCount = Number((profile as any).followers ?? 0);

      try {
        const [reviewsRaw, ticketRaw] = await Promise.all([
          firstOk<any>(REVIEW_MY),
          firstOk<any>(TICKET_COUNT),
        ]);

        const reviewsData = unwrapData(reviewsRaw);
        const reviewsArr = Array.isArray(reviewsRaw)
          ? reviewsRaw
          : Array.isArray(reviewsData)
            ? reviewsData
            : Array.isArray(reviewsData?.items)
              ? reviewsData.items
              : [];
        const reviewCount = reviewsArr.length;

        const ticketData = unwrapData(ticketRaw);
        const ticketCount =
          typeof ticketData === "number"
            ? ticketData
            : Number(ticketData?.count ?? ticketData?.ticketCount ?? ticketData?.totalCount ?? 0);

        const stats: BadgeStats = { reviewCount, ticketCount, followerCount };
        const ids = computeEarnedBadgeIds(stats);

        console.log("[badge] computed stats =", stats);
        console.log("[badge] computed earnedIds =", ids);

        setEarnedIdsFallback(ids);
      } catch (e) {
        console.log("[badge] fallback compute failed:", e);
        // 실패 시: 어쩔 수 없이 빈 배열 유지 (UI는 '획득 없음' 상태)
        setEarnedIdsFallback([]);
      }
    })();
  }, [open, earnedBadges, profile]);

  // ✅ 최종 earnedIds 결정: prop 우선, 없으면 fallback
  const earnedIds = useMemo(() => {
    const propIds = (earnedBadges ?? []).map((b) => b.id);
    return propIds.length > 0 ? propIds : earnedIdsFallback;
  }, [earnedBadges, earnedIdsFallback]);

  // ✅ 최종 earnedBadges(라벨용): prop 우선, 없으면 BADGES에서 name으로 생성
  const earnedBadgesForUI: Badge[] = useMemo(() => {
    if ((earnedBadges ?? []).length > 0) return earnedBadges;

    const set = new Set(earnedIds);
    return BADGES.filter((b) => set.has(b.id)).map((b) => ({ id: b.id, label: b.name }));
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

      {/* ✅ 핵심: earnedIds를 prop/계산값으로 전달 */}
      <BadgePicker open={pickerOpen} onClose={() => setPickerOpen(false)} earnedIds={earnedIds} />
    </>
  );
}
