// FE/src/features/profile/api/real.ts
import type {
  ArtistProfile,
  UserProfile,
  ProfileModel,
  PageResult,
  FeedItem,
  ProfileRole,
  Badge,
} from "../types";

import { useAuthStore } from "../../auth/store";

const BASE = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function url(path: string) {
  return BASE ? `${BASE}${path}` : path;
}

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return String(v);
  return fallback;
}

/** ✅ null/undefined/공백 → "" */
function asNonEmptyString(v: unknown): string {
  return asString(v, "").trim();
}

// ✅ string number / boolean도 흡수
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return fallback;
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  if (typeof v === "boolean") return v ? 1 : 0;

  return fallback;
}

// ✅ 0/1, "0"/"1", "true"/"false" 흡수
function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;

  if (typeof v === "number") return v !== 0;

  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (!s) return fallback;
    if (["true", "t", "1", "y", "yes"].includes(s)) return true;
    if (["false", "f", "0", "n", "no"].includes(s)) return false;
    return fallback;
  }

  return fallback;
}

/**
 * role 정규화
 * - "ARTIST", "ROLE_ARTIST", "artist" -> "ARTIST"
 * - "USER", "GENERAL", "ROLE_USER", "general" -> "USER"
 */
function normalizeRole(v: unknown): "USER" | "ARTIST" | null {
  const r = String(v ?? "").toUpperCase();
  if (r.includes("ARTIST")) return "ARTIST";
  if (r.includes("USER") || r.includes("GENERAL")) return "USER";
  return null;
}

function isArtistRoleLike(v: unknown): boolean {
  return String(v ?? "").toUpperCase().includes("ARTIST");
}

/** 서버 응답이 공통 envelope({data}/{result})일 때 unwrap */
function pickData(raw: unknown): unknown {
  if (isRecord(raw) && "data" in raw) return (raw as any).data;
  if (isRecord(raw) && "result" in raw) return (raw as any).result;
  return raw;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mergeHeaders(base: Record<string, string>, extra?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = { ...base };
  if (!extra) return out;

  if (extra instanceof Headers) {
    extra.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  if (Array.isArray(extra)) {
    for (const [k, v] of extra) out[k] = v;
    return out;
  }

  for (const [k, v] of Object.entries(extra)) out[k] = v as string;
  return out;
}

type AuthStateLike = {
  token?: string | null;
  accessToken?: string | null;
  user?: { memberUuid?: string | null } | null;
};

function getAccessTokenFromStore(): string | null {
  const s = useAuthStore.getState() as unknown as AuthStateLike;
  return (s.token ?? s.accessToken ?? null) || null;
}

/**
 * JWT payload decode (UI 분기/표시용)
 * - 검증은 서버가 하므로 FE는 "읽기"만 한다.
 */
function parseJwtPayload(token: string): JsonRecord | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");

    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr) as unknown;

    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

function getRoleFromToken(): "USER" | "ARTIST" | null {
  const token = getAccessTokenFromStore();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload) return null;
  return normalizeRole(payload.role);
}

function getMemberUuidFromToken(): string | null {
  const token = getAccessTokenFromStore();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  // JwtTokenProvider에서 subject에 memberUuid 넣는 구조
  const sub = payload.sub;
  return typeof sub === "string" && sub.trim() ? sub : null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessTokenFromStore();

  const headers = mergeHeaders({}, init?.headers);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url(path), {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new HttpError(
      res.status,
      `${init?.method ?? "GET"} ${path} failed (${res.status})${text ? ` - ${text}` : ""}`,
    );
  }

  // ✅ 204 / empty body 방어
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** badges: unknown -> Badge[] (✅ 항상 배열 반환해서 .length 안전) */
function normalizeBadges(raw: unknown): Badge[] {
  if (!Array.isArray(raw)) return [];

  const out: Badge[] = [];
  for (const it of raw) {
    if (!isRecord(it)) continue;

    const id = asNonEmptyString((it as any).id ?? (it as any).badgeId ?? "");
    if (!id) continue;

    const label = asNonEmptyString((it as any).label ?? (it as any).name ?? (it as any).title ?? "");
    const description = typeof (it as any).description === "string" ? (it as any).description : undefined;

    out.push({ id, label, description });
  }
  return out;
}

/** featured ids: string[] or Badge[] 형태도 대응 (✅ 항상 배열 반환해서 .length 안전) */
function normalizeFeaturedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const ids: string[] = [];
  for (const it of raw) {
    if (typeof it === "string" && it.trim()) ids.push(it.trim());
    else if (isRecord(it)) {
      const id = asNonEmptyString((it as any).id ?? (it as any).badgeId ?? "");
      if (id) ids.push(id);
    }
  }
  return Array.from(new Set(ids));
}

/**
 * 서버 프로필 -> 화면 프로필(공통 모델)
 */
function normalizeProfile(
  raw: unknown,
  opts?: { roleHint?: "USER" | "ARTIST"; idHint?: string | null },
): ProfileModel {
  const d = pickData(raw);
  const rec = isRecord(d) ? d : ({} as JsonRecord);

  const roleFromField =
    normalizeRole((rec as any).role) ??
    normalizeRole((rec as any).userRole) ??
    normalizeRole((rec as any).memberRole) ??
    null;

  const isArtistFlag =
    typeof (rec as any).isArtist === "boolean"
      ? (rec as any).isArtist
      : typeof (rec as any).is_artist === "boolean"
        ? (rec as any).is_artist
        : typeof (rec as any).is_artist === "number"
          ? Boolean((rec as any).is_artist)
          : typeof (rec as any).isArtist === "number"
            ? Boolean((rec as any).isArtist)
            : null;

  const role: "USER" | "ARTIST" =
    roleFromField ??
    (isArtistFlag != null ? (isArtistFlag ? "ARTIST" : "USER") : null) ??
    opts?.roleHint ??
    "USER";

  // ✅ id 키 흡수 강화
  const id =
    asNonEmptyString(
      (rec as any).memberUuid ??
        (rec as any).memberUUID ??
        (rec as any).member_uuid ??
        (rec as any).id ??
        (rec as any).artistId ??
        (rec as any).userId ??
        (rec as any).memberId ??
        "",
    ) ||
    asNonEmptyString(opts?.idHint ?? "") ||
    "";

  const name = asNonEmptyString((rec as any).displayName ?? (rec as any).nickname ?? (rec as any).name ?? "—") || "—";

  /**
   * ✅ imageUrl: null/undefined 절대 금지(항상 string)
   * - BE가 imgUrl로 내려주는 케이스 포함
   */
    let imageUrl =
      asNonEmptyString((rec as any).profileImageUrl) ||
      asNonEmptyString((rec as any).profileImage) ||
      asNonEmptyString((rec as any).imgUrl) ||
      asNonEmptyString((rec as any).savedProfileImageName) ||
      asNonEmptyString((rec as any).saved_profile_image_name) ||
      asNonEmptyString((rec as any).imageUrl) ||
      asNonEmptyString((rec as any).image) ||
      "";

    // ✅ [추가] 파일명/경로 보정 → resolveProfileMediaUrl 규칙(/profile/)에 맞춰줌
    if (imageUrl) {
      // "profile/xxx.jpg" -> "/profile/xxx.jpg"
      if (!imageUrl.startsWith("http") && !imageUrl.startsWith("/") && imageUrl.startsWith("profile/")) {
        imageUrl = `/${imageUrl}`;
      }

      // "xxx.jpg" 같은 파일명만 내려오는 경우 -> "/profile/xxx.jpg"
      const looksLikeFilenameOnly =
        !imageUrl.includes("/") && !imageUrl.startsWith("data:") && !imageUrl.startsWith("blob:");

      if (looksLikeFilenameOnly) {
        imageUrl = `/profile/${imageUrl}`;
      }
    }


  /** ✅ bio: null/undefined 절대 금지(항상 string) */
  const bio =
    asNonEmptyString((rec as any).bio) ||
    asNonEmptyString((rec as any).introduction) ||
    asNonEmptyString((rec as any).artIntroduction) ||
    "";

  const followersCount = asNumber(
    (rec as any).followersCount ??
      (rec as any).followers ??
      (rec as any).followerCount ??
      (rec as any).followers_count ??
      (rec as any).follower_cnt ??
      0,
  );

  const followingsCount = asNumber(
    (rec as any).followingsCount ??
      (rec as any).followings ??
      (rec as any).followingCount ??
      (rec as any).followings_count ??
      (rec as any).following_cnt ??
      0,
  );

  const isFollowing = asBool(
    (rec as any).isFollowing ??
      (rec as any).is_following ??
      (rec as any).following ??
      (rec as any).isFollows ??
      (rec as any).is_follows ??
      (rec as any).followed ??
      false,
  );

  /** ✅ 배열은 항상 []로 정규화해서 UI에서 .length 안전 */
  const badges = normalizeBadges((rec as any).badges);

  const featured1 = normalizeFeaturedIds((rec as any).featuredBadgeIds);
  const featured2 = normalizeFeaturedIds((rec as any).featuredBadges);
  const featuredBadgeIds = (featured1.length ? featured1 : featured2.length ? featured2 : []) as string[];

  const common = {
    id,
    name,
    imageUrl,
    bio,
    followersCount,
    followingsCount,
    isFollowing,
    badges,
    featuredBadgeIds,
  };

  if (role === "ARTIST") {
    const genre =
      asNonEmptyString((rec as any).genre) ||
      asNonEmptyString((rec as any).genreName) ||
      asNonEmptyString((rec as any).genre_name) ||
      "";

    const artist: ArtistProfile = {
      ...common,
      role: "ARTIST",
      genre,

      contactEnabled: typeof (rec as any).contactEnabled === "boolean" ? (rec as any).contactEnabled : undefined,
      contactUrl: asNonEmptyString((rec as any).contactUrl) || "",

      email: asNonEmptyString((rec as any).email) || "",
      birth: asNonEmptyString((rec as any).birth) || "",
      phone: asNonEmptyString((rec as any).phone) || "",
      isAgree: typeof (rec as any).isAgree === "boolean" ? (rec as any).isAgree : undefined,

      document: asNonEmptyString((rec as any).document) || "",

      fieldId:
        typeof (rec as any).fieldId === "number"
          ? (rec as any).fieldId
          : Number.isFinite(Number((rec as any).fieldId))
            ? Number((rec as any).fieldId)
            : undefined,

      genreId:
        typeof (rec as any).genreId === "number"
          ? (rec as any).genreId
          : Number.isFinite(Number((rec as any).genreId))
            ? Number((rec as any).genreId)
            : undefined,

      field:
        asNonEmptyString((rec as any).field) ||
        asNonEmptyString((rec as any).fieldName) ||
        asNonEmptyString((rec as any).field_name) ||
        "",

      debutYear:
        typeof (rec as any).debutYear === "number"
          ? (rec as any).debutYear
          : typeof (rec as any).debut_year === "number"
            ? (rec as any).debut_year
            : Number.isFinite(Number((rec as any).debutYear))
              ? Number((rec as any).debutYear)
              : undefined,

      snsPage: asNonEmptyString((rec as any).snsPage ?? (rec as any).sns_page) || "",
      introduction: asNonEmptyString((rec as any).introduction) || "",

      sns:
        asNonEmptyString((rec as any).sns) ||
        asNonEmptyString((rec as any).snsPage) ||
        asNonEmptyString((rec as any).sns_page) ||
        "",

      affiliation: asNonEmptyString((rec as any).affiliation) || "",
      isVerified: typeof (rec as any).isVerified === "boolean" ? (rec as any).isVerified : undefined,
      artIntroduction: asNonEmptyString((rec as any).artIntroduction) || "",
    };

    return artist;
  }

  const user: UserProfile = {
    ...common,
    role: "USER",

    email: asNonEmptyString((rec as any).email) || "",
    nickname: asNonEmptyString((rec as any).nickname) || "",
    birth: asNonEmptyString((rec as any).birth) || "",
    phone: asNonEmptyString((rec as any).phone) || "",
    isAgree: typeof (rec as any).isAgree === "boolean" ? (rec as any).isAgree : undefined,
  };

  return user;
}

/** ✅ BE DTO 기준 프로필 수정 payload */
export type UpdateMemberPatch = {
  password?: string; // 8~255
  nickname?: string; // 1~50
  image?: File | null; // MultipartFile
};

export type UpdateArtistPatch = UpdateMemberPatch & {
  fieldId?: number; // >=1
  genreId?: number; // >=1
  debutYear?: number; // <=2100
  snsPage?: string; // <=500
  affiliation?: string; // <=50
  introduction?: string; // <=1000
};

export type UpdateMyProfilePatch = UpdateMemberPatch | UpdateArtistPatch;

/**
 * ✅ 내 프로필 조회
 */
export async function getMyProfile(): Promise<ProfileModel> {
  const roleHint = getRoleFromToken();
  const idHint = getMemberUuidFromToken();

  const raw = await req<unknown>("/api/v1/member/my", { method: "GET" });
  return normalizeProfile(raw, { roleHint: roleHint ?? undefined, idHint });
}

export async function getProfile(memberUuid: string): Promise<ProfileModel> {
  const raw = await req<unknown>(`/api/v1/member/${encodeURIComponent(memberUuid)}`, { method: "GET" });
  return normalizeProfile(raw, { idHint: memberUuid });
}

export async function getArtistProfile(memberUuid: string): Promise<ProfileModel> {
  const p = await getProfile(memberUuid);
  if (!isArtistRoleLike(p.role)) throw new Error("Artist not found");
  return p;
}

export async function getUserProfile(memberUuid: string): Promise<ProfileModel> {
  const p = await getProfile(memberUuid);
  if (isArtistRoleLike(p.role)) throw new Error("User not found");
  return p;
}

function pickList(d: unknown): unknown[] {
  if (Array.isArray(d)) return d;
  if (!isRecord(d)) return [];
  if (Array.isArray((d as any).items)) return (d as any).items as unknown[];
  if (Array.isArray((d as any).content)) return (d as any).content as unknown[];
  if (Array.isArray((d as any).results)) return (d as any).results as unknown[];
  return [];
}

function pickNextCursor(d: unknown): string | null {
  if (!isRecord(d)) return null;
  const c =
    (typeof (d as any).nextCursor === "string" && (d as any).nextCursor) ||
    (typeof (d as any).cursor === "string" && (d as any).cursor) ||
    (typeof (d as any).next === "string" && (d as any).next) ||
    null;
  return c;
}

function toFeedItemFromArtwork(x: unknown): FeedItem | null {
  if (!isRecord(x)) return null;
  const id = asNonEmptyString((x as any).artworkId ?? (x as any).id ?? "");
  const imageUrl = asNonEmptyString(
    (x as any).imageUrl ??
      (x as any).thumbnailUrl ??
      (x as any).artworkImageUrl ??
      (x as any).posterUrl ??
      "",
  );
  if (!id) return null;

  const createdAt = asNonEmptyString(
    (x as any).createdAt ?? (x as any).createdDate ?? (x as any).date ?? new Date().toISOString(),
  );
  return { id, imageUrl: imageUrl || "", createdAt: createdAt || new Date().toISOString() };
}

function toFeedItemFromReview(x: unknown): FeedItem | null {
  if (!isRecord(x)) return null;
  const id = asNonEmptyString((x as any).reviewId ?? (x as any).id ?? "");
  const imageUrl = asNonEmptyString((x as any).imageUrl ?? (x as any).thumbnailUrl ?? (x as any).reviewImageUrl ?? "");
  if (!id) return null;

  const createdAt = asNonEmptyString(
    (x as any).createdAt ?? (x as any).createdDate ?? (x as any).date ?? new Date().toISOString(),
  );
  return { id, imageUrl: imageUrl || "", createdAt: createdAt || new Date().toISOString() };
}

export async function getArtistFeed(artistUuid: string, cursor?: string | null): Promise<PageResult<FeedItem>> {
  const qs = new URLSearchParams();
  qs.set("artist", artistUuid);
  if (cursor) qs.set("cursor", cursor);

  const raw = await req<unknown>(`/api/v1/artworks?${qs.toString()}`, { method: "GET" });
  const d = pickData(raw);

  const list = pickList(d);
  const items = list.map(toFeedItemFromArtwork).filter((v): v is FeedItem => Boolean(v));

  const nextCursor = pickNextCursor(d);
  return { items, nextCursor };
}

export async function getUserFeed(memberUuid: string, cursor?: string | null): Promise<PageResult<FeedItem>> {
  const s = useAuthStore.getState() as unknown as AuthStateLike;
  const myUuid = s.user?.memberUuid ?? null;

  if (memberUuid === "me" || (myUuid && memberUuid === myUuid)) {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", cursor);

    const raw = await req<unknown>(`/api/v1/reviews/my${qs.toString() ? `?${qs}` : ""}`, { method: "GET" });
    const d = pickData(raw);

    const list = pickList(d);
    const items = list.map(toFeedItemFromReview).filter((v): v is FeedItem => Boolean(v));

    const nextCursor = pickNextCursor(d);
    return { items, nextCursor };
  }

  void cursor;
  return { items: [], nextCursor: null };
}

// toggle: POST /api/v1/follow/{memberUuid}
export async function follow(targetId: string): Promise<void> {
  await req<unknown>(`/api/v1/follow/${encodeURIComponent(targetId)}`, { method: "POST" });
}

export async function unfollow(targetId: string): Promise<void> {
  await req<unknown>(`/api/v1/follow/${encodeURIComponent(targetId)}`, { method: "POST" });
}

/**
 * QnA(팬레터) 전송
 * POST /api/v1/fanletters
 */
export async function sendFanLetter(artistUuid: string, content: string): Promise<void> {
  try {
    await req<unknown>("/api/v1/fanletters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistUuid, content }),
    });
  } catch (e) {
    if (e instanceof HttpError && (e.status === 400 || e.status === 422)) {
      await req<unknown>("/api/v1/fanletters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artistUuid, content }),
      });
      return;
    }
    throw e;
  }
}

/** ✅ FormData 빌더 (@ModelAttribute 대응) - BE DTO 필드명 그대로 */
function buildUpdateFormData(role: ProfileRole, patch: UpdateMyProfilePatch): FormData {
  const fd = new FormData();
  const isArtist = isArtistRoleLike(role);

  const putStr = (k: string, v: unknown) => {
    if (v === undefined || v === null) return;
    if (typeof v !== "string") return;
    if (!v.trim()) return;
    fd.append(k, v);
  };

  const putNum = (k: string, v: unknown, opt?: { min?: number; max?: number }) => {
    if (v === undefined || v === null) return;

    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (!Number.isFinite(n)) return;

    if (opt?.min != null && n < opt.min) return;
    if (opt?.max != null && n > opt.max) return;

    fd.append(k, String(n));
  };

  const putFile = (k: string, v: unknown) => {
    if (v instanceof File) fd.append(k, v);
  };

  // ✅ 공통(UpdateMemberRequest)
  putStr("password", (patch as any).password);
  putStr("nickname", (patch as any).nickname);
  putFile("image", (patch as any).image);

  // ✅ 아티스트(UpdateArtistRequest)
  if (isArtist) {
    putNum("fieldId", (patch as any).fieldId, { min: 1 });
    putNum("genreId", (patch as any).genreId, { min: 1 });
    putNum("debutYear", (patch as any).debutYear, { max: 2100 });
 // 필요하면 2100으로 조정

    putStr("snsPage", (patch as any).snsPage);
    putStr("affiliation", (patch as any).affiliation);
    putStr("introduction", (patch as any).introduction);
  }

  return fd;
}

/**
 * ✅ 내 프로필 수정
 * - USER:   /api/v1/member/users/my
 * - ARTIST: /api/v1/member/artists/my (우선) -> 404면 /api/v1/member/artist/my fallback
 */
export async function updateMyProfile(role: ProfileRole, patch: UpdateMyProfilePatch): Promise<ProfileModel> {
  const isArtist = isArtistRoleLike(role);

  const paths = isArtist
  ? ["/api/v1/member/artist/my"]
  : ["/api/v1/member/users/my"];

  let lastErr: unknown = null;

  for (const path of paths) {

    try {
      const fd = buildUpdateFormData(role, patch);
      await req<unknown>(path, {
        method: "PUT",
        body: fd,
        headers: {}, // FormData는 Content-Type 직접 세팅 X
      });

      return getMyProfile();
    } catch (e) {
      lastErr = e;
      if (e instanceof HttpError && e.status === 404) continue;
      throw e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("프로필 수정 실패");
}

/**
 * 대표뱃지 엔드포인트 확정 전: no-op
 */
export async function updateFeaturedBadges(role: ProfileRole, profileId: string, badgeIds: string[]): Promise<void> {
  void role;
  void profileId;
  void badgeIds;
  return;
}
