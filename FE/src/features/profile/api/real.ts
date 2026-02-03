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

function normalizeRole(v: unknown): "USER" | "ARTIST" | null {
  const r = String(v ?? "").toUpperCase();
  if (r === "USER") return "USER";
  if (r === "ARTIST") return "ARTIST";
  return null;
}

/** 서버 응답이 공통 envelope({data})일 때 data만 뽑기 */
function pickData(raw: unknown): unknown {
  if (isRecord(raw) && "data" in raw) return raw.data;
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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const s = useAuthStore.getState() as unknown as AuthStateLike;
  const token = s.token ?? s.accessToken ?? null;

  const headers = mergeHeaders({ "Content-Type": "application/json" }, init?.headers);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url(path), {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
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

    const id = asString(it.id ?? it.badgeId ?? "");
    if (!id) continue;

    const label = asString(it.label ?? it.name ?? it.title ?? "");
    const description = typeof it.description === "string" ? it.description : undefined;

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
      const id = asString(it.id ?? it.badgeId ?? "");
      if (id) ids.push(id);
    }
  }
  const uniq = Array.from(new Set(ids));
  return uniq.length ? uniq : undefined;
}

/** 서버 프로필 -> 화면 프로필(공통 모델) */
function normalizeProfile(raw: unknown): ProfileModel {
  const d = pickData(raw);
  const rec = isRecord(d) ? d : ({} as JsonRecord);

  const role =
    normalizeRole(rec.role) ??
    normalizeRole(rec.userRole) ??
    normalizeRole(rec.memberRole) ??
    "USER";

  const id = asString(rec.memberUuid ?? rec.id ?? rec.artistId ?? rec.userId ?? "");
  const name = asString(rec.displayName ?? rec.nickname ?? rec.name ?? "—");

  const imageUrl =
    typeof rec.profileImageUrl === "string"
      ? rec.profileImageUrl
      : typeof rec.profileImage === "string"
        ? rec.profileImage
        : typeof rec.imageUrl === "string"
          ? rec.imageUrl
          : typeof rec.image === "string"
            ? rec.image
            : null;

  const bio =
    typeof rec.bio === "string"
      ? rec.bio
      : typeof rec.artIntroduction === "string"
        ? rec.artIntroduction
        : typeof rec.introduction === "string"
          ? rec.introduction
          : null;

  const followersCount = asNumber(rec.followersCount ?? rec.followerCount ?? 0);
  const followingsCount = asNumber(rec.followingsCount ?? rec.followingCount ?? 0);
  const isFollowing = asBool(rec.isFollowing ?? rec.following ?? false);

  const badges = normalizeBadges(rec.badges);
  const featuredBadgeIds =
    normalizeFeaturedIds(rec.featuredBadgeIds) ??
    normalizeFeaturedIds(rec.featuredBadges) ??
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
      typeof rec.genre === "string"
        ? rec.genre
        : typeof rec.genreName === "string"
          ? rec.genreName
          : undefined;

    const artist: ArtistProfile = {
      ...common,
      role: "ARTIST",
      genre,
      contactEnabled: typeof rec.contactEnabled === "boolean" ? rec.contactEnabled : undefined,
      contactUrl: typeof rec.contactUrl === "string" ? rec.contactUrl : undefined,

      // optional pass-through
      email: typeof rec.email === "string" ? rec.email : undefined,
      birth: typeof rec.birth === "string" ? rec.birth : undefined,
      phone: typeof rec.phone === "string" ? rec.phone : undefined,
      isAgree: typeof rec.isAgree === "boolean" ? rec.isAgree : undefined,

      document: typeof rec.document === "string" ? rec.document : undefined,
      field: typeof rec.field === "string" ? rec.field : (typeof rec.fieldName === "string" ? rec.fieldName : undefined),
      debutYear: typeof rec.debutYear === "number" ? rec.debutYear : undefined,
      sns: typeof rec.sns === "string" ? rec.sns : (typeof rec.snsPage === "string" ? rec.snsPage : undefined),
      affiliation: typeof rec.affiliation === "string" ? rec.affiliation : undefined,
      isVerified: typeof rec.isVerified === "boolean" ? rec.isVerified : undefined,
      artIntroduction: typeof rec.artIntroduction === "string" ? rec.artIntroduction : undefined,
    };

    return artist;
  }

  const user: UserProfile = {
    ...common,
    role: "USER",

    // optional pass-through
    email: typeof rec.email === "string" ? rec.email : undefined,
    nickname: typeof rec.nickname === "string" ? rec.nickname : undefined,
    birth: typeof rec.birth === "string" ? rec.birth : undefined,
    phone: typeof rec.phone === "string" ? rec.phone : undefined,
    isAgree: typeof rec.isAgree === "boolean" ? rec.isAgree : undefined,
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

export async function getMyProfile(): Promise<ProfileModel> {
  const raw = await req<unknown>("/api/v1/member/my");
  return normalizeProfile(raw);
}

export async function getProfile(memberUuid: string): Promise<ProfileModel> {
  const raw = await req<unknown>(`/api/v1/member/${encodeURIComponent(memberUuid)}`);
  return normalizeProfile(raw);
}

export async function getArtistProfile(memberUuid: string): Promise<ProfileModel> {
  const p = await getProfile(memberUuid);
  if (p.role !== "ARTIST") throw new Error("Artist not found");
  return p;
}

export async function getUserProfile(memberUuid: string): Promise<ProfileModel> {
  const p = await getProfile(memberUuid);
  if (p.role !== "USER") throw new Error("User not found");
  return p;
}

function pickList(d: unknown): unknown[] {
  if (Array.isArray(d)) return d;
  if (!isRecord(d)) return [];
  if (Array.isArray(d.items)) return d.items as unknown[];
  if (Array.isArray(d.content)) return d.content as unknown[];
  if (Array.isArray(d.results)) return d.results as unknown[];
  return [];
}

function pickNextCursor(d: unknown): string | null {
  if (!isRecord(d)) return null;
  const c =
    (typeof d.nextCursor === "string" && d.nextCursor) ||
    (typeof d.cursor === "string" && d.cursor) ||
    (typeof d.next === "string" && d.next) ||
    null;
  return c;
}

function toFeedItemFromArtwork(x: unknown): FeedItem | null {
  if (!isRecord(x)) return null;
  const id = asString(x.artworkId ?? x.id ?? "");
  const imageUrl = asString(x.imageUrl ?? x.thumbnailUrl ?? x.artworkImageUrl ?? x.posterUrl ?? "");
  if (!id || !imageUrl) return null;

  const createdAt = asString(x.createdAt ?? x.createdDate ?? x.date ?? new Date().toISOString());
  return { id, imageUrl, createdAt };
}

function toFeedItemFromReview(x: unknown): FeedItem | null {
  if (!isRecord(x)) return null;
  const id = asString(x.reviewId ?? x.id ?? "");
  const imageUrl = asString(x.imageUrl ?? x.thumbnailUrl ?? x.reviewImageUrl ?? "");
  if (!id || !imageUrl) return null;

  const createdAt = asString(x.createdAt ?? x.createdDate ?? x.date ?? new Date().toISOString());
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
  // 명세 상 확실한 건 /api/v1/reviews/my 뿐이라서:
  // - 내 프로필이면 연결
  // - 타인 프로필은 (BE에서 엔드포인트 확정 전까지) 빈 배열
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

  // 타인 USER 피드는 API 확정되면 여기에 연결
  void cursor;
  return { items: [], nextCursor: null };
}

// toggle: POST /api/v1/follow/{memberUuid}
export async function follow(targetId: string): Promise<void> {
  await req<unknown>(`/api/v1/follow/${encodeURIComponent(targetId)}`, { method: "POST" });
}

export async function unfollow(targetId: string): Promise<void> {
  // 명세상 toggle이라 동일 호출
  await req<unknown>(`/api/v1/follow/${encodeURIComponent(targetId)}`, { method: "POST" });
}

/**
 * QnA(팬레터) 전송
 * POST /api/v1/fanletters
 * (백엔드 body 키가 artistUuid / artistId 둘 중 뭐인지 애매해서 fallback 처리)
 */
export async function sendFanLetter(artistUuid: string, content: string): Promise<void> {
  try {
    await req<unknown>("/api/v1/fanletters", {
      method: "POST",
      body: JSON.stringify({ artistUuid, content }),
    });
  } catch (e) {
    // body 키가 artistId인 경우 대비 (400/422 등)
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
  const path = role === "ARTIST" ? "/api/v1/member/artists/my" : "/api/v1/member/users/my";

  await req<unknown>(path, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  return getMyProfile();
}


/**
 * 대표뱃지 엔드포인트 확정 전: no-op
 * (unused-vars 방지)
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
