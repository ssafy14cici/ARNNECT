// FE/src/pages/profile/components/UserProfileEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import "../profile.css";

import { useBadgeStore } from "../../../features/badge/store";
import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import type { UserProfile, Badge } from "../../../features/profile/types";

import BadgePicker from "../../../features/badge/ui/BadgePicker";
import { resolveMediaUrl } from "../../artworks/detail/utils";
import { useAuthStore } from "../../../features/auth/store";

// --------- helpers ---------
function uniq3(ids: string[]) {
  return Array.from(new Set(ids)).slice(0, 3);
}

function unwrapData(v: any) {
  return v?.data ?? v;
}

/**
 * ✅ public/badges/badges1~9.png 매핑 (BASE_URL 안전)
 *  - review: 1~3
 *  - ticket: 4~6
 *  - social: 7~9
 */
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

function computeEarnedBadgeIds(stats: { reviewCount: number; ticketCount: number; followerCount: number }) {
  const { reviewCount, ticketCount, followerCount } = stats;

  const ids: string[] = [];

  if (reviewCount >= 1) ids.push("review_lv1");
  if (reviewCount >= 5) ids.push("review_lv2");
  if (reviewCount >= 20) ids.push("review_lv3");

  if (ticketCount >= 1) ids.push("ticket_lv1");
  if (ticketCount >= 5) ids.push("ticket_lv2");
  if (ticketCount >= 20) ids.push("ticket_lv3");

  if (followerCount >= 1) ids.push("social_lv1");
  if (followerCount >= 10) ids.push("social_lv2");
  if (followerCount >= 50) ids.push("social_lv3");

  return ids;
}

/**
 * ✅ 토큰을 최대한 찾아봄:
 *  - zustand store
 *  - localStorage 흔한 키
 *  - localStorage에 persist된 auth store(JSON) 파싱
 */
function getAnyAuthToken(): string {
  try {
    const st: any = useAuthStore.getState?.() ?? {};
    const fromStore =
      st.accessToken ??
      st.token ??
      st.jwt ??
      st?.auth?.token ??
      st?.tokens?.accessToken ??
      st?.state?.accessToken ??
      "";
    if (fromStore) return String(fromStore);

    const directKeys = ["accessToken", "ACCESS_TOKEN", "token", "TOKEN", "jwt", "JWT", "bearer", "Bearer"];
    for (const k of directKeys) {
      const v = localStorage.getItem(k);
      if (v && v !== "null" && v !== "undefined") return v;
    }

    // persist store 뒤져보기
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (!k) continue;
      if (!/auth|token|jwt|login|user/i.test(k)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        // zustand persist 형태: { state: {...}, version: n }
        const s = parsed?.state ?? parsed;
        const v =
          s?.accessToken ??
          s?.token ??
          s?.jwt ??
          s?.auth?.token ??
          s?.tokens?.accessToken ??
          "";
        if (v) return String(v);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return "";
}

/**
 * ✅ API URL 만들기:
 *  - DEV: 상대경로(프록시)
 *  - PROD: VITE_API_BASE_URL이 있으면 그 base로 붙임
 *    (base가 .../api/v1 인데 path가 /api/v1/... 로 시작하면 중복 제거)
 */
function buildApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return p;

  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (!apiBase) return p; // 없으면 현재 origin으로 감 (지금 네 환경이 이 케이스일 가능성 높음)

  try {
    const base = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
    const baseUrl = new URL(base);
    const basePath = baseUrl.pathname.replace(/\/+$/, ""); // "/api/v1"
    let rel = p.replace(/^\//, ""); // "api/v1/review/my"

    // base가 /api/v1 인데 rel이 api/v1/...면 중복 제거
    if (basePath.endsWith("/api/v1") && rel.startsWith("api/v1/")) {
      rel = rel.replace(/^api\/v1\//, "");
    }

    return new URL(rel, base).toString();
  } catch {
    return p;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const url = buildApiUrl(path);

  const tokenRaw = getAnyAuthToken();
  const tokenBearer = tokenRaw ? (tokenRaw.startsWith("Bearer ") ? tokenRaw : `Bearer ${tokenRaw}`) : "";

  const baseHeaders: Record<string, string> = { Accept: "application/json" };

  const tries: Array<Record<string, string>> = [
    baseHeaders, // 쿠키 인증만 되는 케이스
    ...(tokenBearer ? [{ ...baseHeaders, Authorization: tokenBearer }] : []),
    ...(tokenRaw ? [{ ...baseHeaders, Authorization: tokenRaw }] : []),
    ...(tokenRaw ? [{ ...baseHeaders, "X-Auth-Token": tokenRaw }] : []),
    ...(tokenRaw ? [{ ...baseHeaders, "X-ACCESS-TOKEN": tokenRaw }] : []),
  ];

  let lastStatus = 0;
  let lastText = "";

  for (const headers of tries) {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        const txt = await res.text().catch(() => "");
        throw new Error(`JSON이 아닌 응답: ${url} (${ct}) ${txt.slice(0, 120)}`);
      }
      return (await res.json()) as T;
    }

    lastStatus = res.status;
    lastText = await res.text().catch(() => "");

    // 401/403이면 다음 헤더 조합으로 재시도
    if (res.status === 401 || res.status === 403) continue;

    break;
  }

  throw new Error(`API 실패 ${lastStatus}: ${url} ${lastText.slice(0, 120)}`);
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

  // ✅ prop(서버) earnedBadges가 비면, 프론트 계산으로 earnedIds를 채움
  const [earnedIdsFallback, setEarnedIdsFallback] = useState<string[]>([]);
  const [badgeHint, setBadgeHint] = useState<string | null>(null);

  // ✅ store seeding
  useEffect(() => {
    if (!open) return;
    setFeatured(initialFeaturedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * ✅ 중요: 지금 네 콘솔에서 요청이 여러 번 반복됨
   * - deps에 객체 전체(profile, earnedBadges)를 넣으면 렌더마다 새 참조로 effect가 재실행될 수 있음
   * - 그래서 "길이/숫자"만 deps로 둬서 과호출을 막음
   */
  useEffect(() => {
    if (!open) return;

    const propIds = (earnedBadges ?? []).map((b) => b.id);

    console.log("[badge] earnedBadges(prop) =", earnedBadges);
    console.log("[badge] earnedIds(prop) =", propIds);

    // ✅ 서버/부모가 내려주는 earnedBadges가 있으면 그걸 신뢰
    if (propIds.length > 0) {
      setEarnedIdsFallback([]);
      setBadgeHint(null);
      return;
    }

    (async () => {
      // ✅ 네가 예전에 "내 피드"에서 성공했던 응답 형태를 고려해서 후보를 넓힘
      const REVIEW_MY = [
        "/api/v1/review/my",
        "/api/v1/reviews/my",
        "/api/v1/feed/my", // 내 피드가 이 경로일 가능성
      ];

      const TICKET_COUNT = [
        "/api/v1/ticket/count",
        "/api/v1/tickets/count",
      ];

      const followerCount = Number((profile as any).followers ?? 0);

      try {
        const [reviewsRaw, ticketRaw] = await Promise.all([
          firstOk<any>(REVIEW_MY),
          firstOk<any>(TICKET_COUNT),
        ]);

        const reviewsData = unwrapData(reviewsRaw);

        // array / envelope.data(array) / envelope.data.items(array) 모두 대응
        const reviewsArr = Array.isArray(reviewsRaw)
          ? reviewsRaw
          : Array.isArray(reviewsData)
            ? reviewsData
            : Array.isArray(reviewsData?.items)
              ? reviewsData.items
              : Array.isArray(reviewsData?.list)
                ? reviewsData.list
                : [];

        const reviewCount = reviewsArr.length;

        const ticketData = unwrapData(ticketRaw);
        const ticketCount =
          typeof ticketData === "number"
            ? ticketData
            : Number(ticketData?.count ?? ticketData?.ticketCount ?? ticketData?.totalCount ?? 0);

        const stats = { reviewCount, ticketCount, followerCount };
        const ids = computeEarnedBadgeIds(stats);

        console.log("[badge] computed stats =", stats);
        console.log("[badge] computed earnedIds =", ids);

        setEarnedIdsFallback(ids);
        setBadgeHint(null);
      } catch (e) {
        console.log("[badge] fallback compute failed:", e);

        /**
         * ✅ 핵심 안전장치:
         * - API가 401/403이면 "획득 뱃지만 보여주기"는 불가능
         * - 그래도 UI가 비면 UX가 박살나니까, '전체 뱃지 선택 가능'으로 fallback
         * - 나중에 백에서 stats/earnedBadges API 생기면 이 fallback 제거하면 됨
         */
        setEarnedIdsFallback(ALL_BADGE_IDS);
        setBadgeHint("활동량 조회에 실패하여 전체 뱃지를 표시합니다. (서버 권한/인증 확인 필요)");
      }
    })();
  }, [open, (earnedBadges ?? []).length, Number((profile as any).followers ?? 0)]);

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

              {badgeHint && <div className="profileHelp" style={{ opacity: 0.8 }}>{badgeHint}</div>}

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

      {/* ✅ 핵심: prop/계산값 earnedIds를 Picker에 전달 */}
      <BadgePicker open={pickerOpen} onClose={() => setPickerOpen(false)} earnedIds={earnedIds} />
    </>
  );
}
