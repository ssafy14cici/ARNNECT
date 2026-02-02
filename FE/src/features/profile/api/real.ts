// FE/src/features/profile/api/real.ts
import type {
  ArtistProfile,
  UserProfile,
  ProfileModel,
  PageResult,
  FeedItem,
  ProfileRole,
} from "../types";
import { useAuthStore } from "../../auth/store";

const BASE = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function url(path: string) {
  return BASE ? `${BASE}${path}` : path;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url(path), {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status})`);
  }

  return res.json();
}

function pickData(raw: any) {
  return raw?.data ?? raw;
}

function normalizeRole(v: any): "USER" | "ARTIST" | null {
  const r = String(v ?? "").toUpperCase();
  if (r === "USER") return "USER";
  if (r === "ARTIST") return "ARTIST";
  return null;
}

function normalizeProfile(raw: any): ProfileModel {
  const d = pickData(raw);

  const role =
    normalizeRole(d?.role) ??
    normalizeRole(d?.userRole) ??
    normalizeRole(d?.memberRole) ??
    "USER";

  const base = {
    id: String(d?.memberUuid ?? d?.id ?? ""),
    role: role as ProfileRole,
    name: String(d?.displayName ?? d?.nickname ?? d?.name ?? "—"),
    imageUrl: d?.profileImageUrl ?? d?.imageUrl ?? null,
    bio: d?.bio ?? null,
    followersCount: Number(d?.followersCount ?? d?.followerCount ?? 0),
    followingsCount: Number(d?.followingsCount ?? d?.followingCount ?? 0),
    isFollowing: Boolean(d?.isFollowing ?? d?.following ?? false),
    badges: Array.isArray(d?.badges) ? d.badges : undefined,
    featuredBadgeIds: Array.isArray(d?.featuredBadgeIds) ? d.featuredBadgeIds : undefined,
  };

  if (role === "ARTIST") {
    const a: ArtistProfile = {
      ...base,
      role: "ARTIST",
      genre: d?.genre,
      contactEnabled: d?.contactEnabled,
      contactUrl: d?.contactUrl,
    };
    return a;
  }

  const u: UserProfile = { ...base, role: "USER" };
  return u;
}

export async function getMyProfile(): Promise<ProfileModel> {
  // 명세: /api/v1/member/my
  const raw = await req<any>("/api/v1/member/my");
  return normalizeProfile(raw);
}

export async function getArtistProfile(id: string): Promise<ArtistProfile> {
  const raw = await req<any>(`/api/v1/member/${encodeURIComponent(id)}`);
  const p = normalizeProfile(raw);
  if (p.role !== "ARTIST") throw new Error("Artist not found");
  return p;
}

export async function getUserProfile(id: string): Promise<UserProfile> {
  const raw = await req<any>(`/api/v1/member/${encodeURIComponent(id)}`);
  const p = normalizeProfile(raw);
  if (p.role !== "USER") throw new Error("User not found");
  return p;
}

export async function getArtistFeed(
  artistUuid: string,
  _cursor?: string | null,
): Promise<PageResult<FeedItem>> {
  // 명세: /api/v1/artworks?artist={memberUuid}
  const raw = await req<any>(`/api/v1/artworks?artist=${encodeURIComponent(artistUuid)}`);
  const d = pickData(raw);
  const list = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];

  const items: FeedItem[] = list.map((x: any) => ({
    id: String(x?.artworkId ?? x?.id ?? ""),
    imageUrl: String(x?.imageUrl ?? x?.thumbnailUrl ?? ""),
    createdAt: String(x?.createdAt ?? x?.date ?? new Date().toISOString()),
  }));

  return { items, nextCursor: null };
}

export async function getUserFeed(
  _id: string,
  _cursor?: string | null,
): Promise<PageResult<FeedItem>> {
  return { items: [], nextCursor: null };
}

// 명세: /api/v1/follow/{memberUuid} (toggle)
export async function follow(targetId: string): Promise<void> {
  await req(`/api/v1/follow/${encodeURIComponent(targetId)}`, { method: "POST" });
}

export async function unfollow(targetId: string): Promise<void> {
  await req(`/api/v1/follow/${encodeURIComponent(targetId)}`, { method: "POST" });
}

// 실API에 대표뱃지 저장 엔드포인트가 확정되기 전까지는 no-op
export async function updateFeaturedBadges(
  _role: ProfileRole,
  _profileId: string,
  _badgeIds: string[],
): Promise<void> {
  return;
}
