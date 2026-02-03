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
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/**
 * ✅ role 정규화 (서버/토큰 어떤 형태든 최대한 방어)
 * - "ARTIST", "ROLE_ARTIST", "artist" -> "ARTIST"
 * - "USER", "GENERAL", "ROLE_USER", "general" -> "USER"
 */
function normalizeRole(v: unknown): "USER" | "ARTIST" | null {
  const r = String(v ?? "").toUpperCase();
  if (r.includes("ARTIST")) return "ARTIST";
  if (r.includes("USER") || r.includes("GENERAL")) return "USER";
  return null;
}

/** 서버 응답이 공통 envelope({data})일 때 data만 뽑기 */
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

  for (const [k, v] of Object.entries(extra)) out[k] = v;
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
 * ✅ JWT payload 디코딩 (검증은 서버가 하므로 FE에서는 UI/분기용으로만 사용)
 * payload 예: { sub: "uuid", role: "ARTIST" | "USER", ... }
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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessTokenFromStore();

  const headers = mergeHeaders({ "Content-Type": "application/json" }, init?.headers);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url(path), {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    // 여기 메시지는 최소화. 필요하면 res.text() 읽어서 message 뽑도록 확장 가능.
    throw new HttpError(res.status, `${init?.method ?? "GET"} ${path} failed (${res.status})`);
  }

  const data = (await res.json()) as unknown;
  return data as T;
}

/** badges: unknown -> Badge[] */
function normalizeBadges(raw: unknown): Badge[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const out: Badge[] = [];
  for (const it of raw) {
    if (!isRecord(it)) continue;

    const id = asString((it as any).id ?? (it as any).badgeId ?? "");
    if (!id) continue;

    const label = asString((it as any).label ?? (it as any).name ?? (it as any).title ?? "");
    const description = typeof (it as any).description === "string" ? (it as any).description : undefined;

    out.push({ id, label, description });
  }
  return out;
}

/** featured ids: string[] or Badge[] 형태도 대응 */
function normalizeFeaturedIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const ids: string[] = [];
  for (const it of raw) {
    if (typeof it === "string" && it.trim()) ids.push(it.trim());
    else if (isRecord(it)) {
      const id = asString((it as any).id ?? (it as any).badgeId ?? "");
      if (id) ids.push(id);
    }
  }
  const uniq = Array.from(new Set(ids));
  return uniq.length ? uniq : undefined;
}

function isArtistRoleLike(v: unknown): boolean {
  return String(v ?? "").toUpperCase().includes("ARTIST");
}

/**
 * ✅ 서버 프로필 -> 화면 프로필(공통 모델)
 * roleHint: 응답에 role이 없을 때(= /member/my 같은 케이스) 토큰 기반으로 role 고정 가능
 */
function normalizeProfile(raw: unknown, roleHint?: "USER" | "ARTIST"): ProfileModel {
  const d = pickData(raw);
  const rec = isRecord(d) ? d : ({} as JsonRecord);

  const role =
    normalizeRole((rec as any).role) ??
    normalizeRole((rec as any).userRole) ??
    normalizeRole((rec as any).memberRole) ??
    roleHint ??
    "USER";

  const id = asString((rec as any).memberUuid ?? (rec as any).id ?? (rec as any).artistId ?? (rec as any).userId ?? "");
  const name = asString((rec as any).displayName ?? (rec as any).nickname ?? (rec as any).name ?? "—");

  const imageUrl =
    typeof (rec as any).profileImageUrl === "string"
      ? (rec as any).profileImageUrl
      : typeof (rec as any).profileImage === "string"
        ? (rec as any).profileImage
        : typeof (rec as any).imageUrl === "string"
          ? (rec as any).imageUrl
          : typeof (rec as any).image === "string"
            ? (rec as any).image
            : null;

  const bio =
    typeof (rec as any).bio === "string"
      ? (rec as any).bio
      : typeof (rec as any).artIntroduction === "string"
        ? (rec as any).artIntroduction
        : typeof (rec as any).introduction === "string"
          ? (rec as any).introduction
          : null;

  const followersCount = asNumber((rec as any).followersCount ?? (rec as any).followerCount ?? 0);
  const followingsCount = asNumber((rec as any).followingsCount ?? (rec as any).followingCount ?? 0);
  const isFollowing = asBool((rec as any).isFollowing ?? (rec as any).following ?? false);

  const badges = normalizeBadges((rec as any).badges);
  const featuredBadgeIds =
    normalizeFeaturedIds((rec as any).featuredBadgeIds) ??
    normalizeFeaturedIds((rec as any).featuredBadges) ??
    undefined;

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
      typeof (rec as any).genre === "string"
        ? (rec as any).genre
        : typeof (rec as any).genreName === "string"
          ? (rec as any).genreName
          : undefined;

    const artist: ArtistProfile = {
      ...common,
      role: "ARTIST",
      genre,
      contactEnabled: typeof (rec as any).contactEnabled === "boolean" ? (rec as any).contactEnabled : undefined,
      contactUrl: typeof (rec as any).contactUrl === "string" ? (rec as any).contactUrl : undefined,

      // optional pass-through
      email: typeof (rec as any).email === "string" ? (rec as any).email : undefined,
      birth: typeof (rec as any).birth === "string" ? (rec as any).birth : undefined,
      phone: typeof (rec as any).phone === "string" ? (rec as any).phone : undefined,
      isAgree: typeof (rec as any).isAgree === "boolean" ? (rec as any).isAgree : undefined,

      document: typeof (rec as any).document === "string" ? (rec as any).document : undefined,
      field:
        typeof (rec as any).field === "string"
          ? (rec as any).field
          : typeof (rec as any).fieldName === "string"
            ? (rec as any).fieldName
            : undefined,
      debutYear: typeof (rec as any).debutYear === "number" ? (rec as any).debutYear : undefined,
      sns:
        typeof (rec as any).sns === "string"
          ? (rec as any).sns
          : typeof (rec as any).snsPage === "string"
            ? (rec as any).snsPage
            : undefined,
      affiliation: typeof (rec as any).affiliation === "string" ? (rec as any).affiliation : undefined,
      isVerified: typeof (rec as any).isVerified === "boolean" ? (rec as any).isVerified : undefined,
      artIntroduction: typeof (rec as any).artIntroduction === "string" ? (rec as any).artIntroduction : undefined,
    };

    return artist;
  }

  const user: UserProfile = {
    ...common,
    role: "USER",

    // optional pass-through
    email: typeof (rec as any).email === "string" ? (rec as any).email : undefined,
    nickname: typeof (rec as any).nickname === "string" ? (rec as any).nickname : undefined,
    birth: typeof (rec as any).birth === "string" ? (rec as any).birth : undefined,
    phone: typeof (rec as any).phone === "string" ? (rec as any).phone : undefined,
    isAgree: typeof (rec as any).isAgree === "boolean" ? (rec as any).isAgree : undefined,
  };

  return user;
}

/** 프로필 수정 payload */
export type UpdateMyProfilePatch = {
  nickname?: string;
  displayName?: string;

  profileImage?: string | null;
  profileImageUrl?: string | null;

  artIntroduction?: string;
  bio?: string;

  genre?: string;
  genreName?: string;

  contactEnabled?: boolean;
  contactUrl?: string | null;
};

/**
 * ✅ 내 프로필 조회
 * - BE가 role을 /member/my에 안 준다면, 토큰 role 기준으로 올바른 엔드포인트를 호출해야 함.
 * - 토큰 role이 없거나 엔드포인트가 없으면 fallback으로 /member/my 사용.
 */
export async function getMyProfile(): Promise<ProfileModel> {
  const roleFromToken = getRoleFromToken(); // "USER" | "ARTIST" | null

  // 1) 토큰에 role이 있으면 그 role 엔드포인트 우선
  if (roleFromToken === "ARTIST") {
    try {
      const raw = await req<unknown>("/api/v1/member/artists/my");
      return normalizeProfile(raw, "ARTIST");
    } catch (e) {
      // 엔드포인트 미구현/메서드 미지원일 때만 fallback
      if (e instanceof HttpError && (e.status === 404 || e.status === 405)) {
        // continue to fallback
      } else {
        throw e;
      }
    }
  }

  if (roleFromToken === "USER") {
    try {
      const raw = await req<unknown>("/api/v1/member/users/my");
      return normalizeProfile(raw, "USER");
    } catch (e) {
      if (e instanceof HttpError && (e.status === 404 || e.status === 405)) {
        // continue to fallback
      } else {
        throw e;
      }
    }
  }

  // 2) role이 없거나 fallback: artists/my → users/my → member/my 순
  try {
    const rawA = await req<unknown>("/api/v1/member/artists/my");
    return normalizeProfile(rawA, "ARTIST");
  } catch (eA) {
    if (!(eA instanceof HttpError) || (eA.status !== 404 && eA.status !== 405 && eA.status !== 403)) {
      // 401 같은 건 재로그인 이슈라 그대로 던지는 게 맞음
      // 403은 "유저인데 artists/my 접근" 같은 경우라 users/my로 넘어가기 위해 허용
      if (eA instanceof HttpError && eA.status === 401) throw eA;
    }
  }

  try {
    const rawU = await req<unknown>("/api/v1/member/users/my");
    return normalizeProfile(rawU, "USER");
  } catch (eU) {
    if (eU instanceof HttpError && eU.status === 401) throw eU;
    // 마지막 fallback
  }

  const raw = await req<unknown>("/api/v1/member/my");
  return normalizeProfile(raw, roleFromToken ?? undefined);
}

export async function getProfile(memberUuid: string): Promise<ProfileModel> {
  const raw = await req<unknown>(`/api/v1/member/${encodeURIComponent(memberUuid)}`);
  return normalizeProfile(raw);
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
  const id = asString((x as any).artworkId ?? (x as any).id ?? "");
  const imageUrl = asString((x as any).imageUrl ?? (x as any).thumbnailUrl ?? (x as any).artworkImageUrl ?? (x as any).posterUrl ?? "");
  if (!id || !imageUrl) return null;

  const createdAt = asString((x as any).createdAt ?? (x as any).createdDate ?? (x as any).date ?? new Date().toISOString());
  return { id, imageUrl, createdAt };
}

function toFeedItemFromReview(x: unknown): FeedItem | null {
  if (!isRecord(x)) return null;
  const id = asString((x as any).reviewId ?? (x as any).id ?? "");
  const imageUrl = asString((x as any).imageUrl ?? (x as any).thumbnailUrl ?? (x as any).reviewImageUrl ?? "");
  if (!id || !imageUrl) return null;

  const createdAt = asString((x as any).createdAt ?? (x as any).createdDate ?? (x as any).date ?? new Date().toISOString());
  return { id, imageUrl, createdAt };
}

export async function getArtistFeed(
  artistUuid: string,
  cursor?: string | null,
): Promise<PageResult<FeedItem>> {
  const qs = new URLSearchParams();
  qs.set("artist", artistUuid);
  if (cursor) qs.set("cursor", cursor);

  const raw = await req<unknown>(`/api/v1/artworks?${qs.toString()}`);
  const d = pickData(raw);

  const list = pickList(d);
  const items = list.map(toFeedItemFromArtwork).filter((v): v is FeedItem => Boolean(v));

  const nextCursor = pickNextCursor(d);
  return { items, nextCursor };
}

export async function getUserFeed(
  memberUuid: string,
  cursor?: string | null,
): Promise<PageResult<FeedItem>> {
  const s = useAuthStore.getState() as unknown as AuthStateLike;
  const myUuid = s.user?.memberUuid ?? null;

  if (memberUuid === "me" || (myUuid && memberUuid === myUuid)) {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", cursor);

    const raw = await req<unknown>(`/api/v1/reviews/my${qs.toString() ? `?${qs}` : ""}`);
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
      body: JSON.stringify({ artistUuid, content }),
    });
  } catch (e) {
    if (e instanceof HttpError && (e.status === 400 || e.status === 422)) {
      await req<unknown>("/api/v1/fanletters", {
        method: "POST",
        body: JSON.stringify({ artistId: artistUuid, content }),
      });
      return;
    }
    throw e;
  }
}

/**
 * 내 프로필 수정
 * - ARTIST: /api/v1/member/artists/my
 * - USER:   /api/v1/member/users/my
 */
export async function updateMyProfile(
  role: ProfileRole,
  patch: UpdateMyProfilePatch,
): Promise<ProfileModel> {
  const isArtist = isArtistRoleLike(role);
  const path = isArtist ? "/api/v1/member/artists/my" : "/api/v1/member/users/my";

  await req<unknown>(path, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  return getMyProfile();
}

/**
 * 대표뱃지 엔드포인트 확정 전: no-op
 */
export async function updateFeaturedBadges(
  role: ProfileRole,
  profileId: string,
  badgeIds: string[],
): Promise<void> {
  void role;
  void profileId;
  void badgeIds;
  return;
}
