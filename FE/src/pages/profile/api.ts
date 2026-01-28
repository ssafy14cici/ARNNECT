// FE/src/pages/profile/api.ts
import type { ArtistProfile, UserProfile, FeedItem, ProfileRole } from "./types";

type PageResult<T> = { items: T[]; nextCursor?: string | null };

/** =========================
 * DEV: 대표뱃지 localStorage 저장
 * ========================= */
function featuredKey(role: ProfileRole, id: string) {
  return `arnnect.profile.featuredBadges.${role}.${id}`;
}
function loadFeatured(role: ProfileRole, id: string): string[] {
  const raw = localStorage.getItem(featuredKey(role, id));
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}
function saveFeatured(role: ProfileRole, id: string, badgeIds: string[]) {
  localStorage.setItem(featuredKey(role, id), JSON.stringify(badgeIds));
}

/** =========================
 * MOCK DATA
 * ========================= */
const MOCK_USER: UserProfile = {
  id: "me",
  role: "USER",
  name: "Mock User",
  imageUrl: "",
  bio: "로컬 mock 유저입니다.",
  followersCount: 12,
  followingsCount: 8,
  badges: [
    { id: "b_first_review", label: "첫 리뷰", description: "리뷰 1개 달성" },
    { id: "b_reviewer", label: "리뷰러", description: "리뷰 5개 달성" },
    { id: "b_first_ticket", label: "첫 티켓", description: "티켓 1개 수집" },
    { id: "b_collector", label: "컬렉터", description: "티켓 5개 수집" },
    { id: "b_first_follower", label: "첫 팔로워", description: "팔로워 1명 달성" },
    { id: "b_popular", label: "인기 유저", description: "팔로워 10명 달성" },
  ],
  featuredBadgeIds: ["b_first_review", "b_reviewer", "b_first_ticket"],
  isFollowing: false,
};

const MOCK_ARTIST: ArtistProfile = {
  id: "me",
  role: "ARTIST",
  name: "Mock Artist",
  imageUrl: "",
  bio: "로컬 mock 작가입니다.",
  genre: "Painting",
  contactEnabled: true,
  contactUrl: "https://example.com",
  followersCount: 120,
  followingsCount: 15,
  badges: [
    { id: "a_verified", label: "인증", description: "예술인 인증" },
    { id: "a_featured", label: "추천", description: "추천 작가" },
    { id: "a_hot", label: "HOT", description: "인기 상승" },
  ],
  featuredBadgeIds: ["a_verified"],
  isFollowing: false,
};

const MOCK_FEED: FeedItem[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `f${i + 1}`,
  imageUrl: "https://picsum.photos/400?random=" + (i + 1),
  createdAt: new Date().toISOString(),
}));

function applyPersistedFeatured<T extends { role: ProfileRole; id: string; featuredBadgeIds?: string[] }>(
  p: T,
): T {
  const persisted = loadFeatured(p.role, p.id);
  if (persisted.length === 0) return p;
  return { ...p, featuredBadgeIds: persisted } as T;
}

/** =========================
 * fetch helper
 * ========================= */
async function httpGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });

  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${url} failed (${res.status})\n${text.slice(0, 200)}`);
  }
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`GET ${url} expected JSON but got: ${ct}\n${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const profileApi = {
  getArtistProfile: async (id: string) => {
    if (import.meta.env.DEV) return applyPersistedFeatured({ ...MOCK_ARTIST, id } as ArtistProfile);
    return httpGet<ArtistProfile>(`/api/artists/${id}`);
  },

  getUserProfile: async (id: string) => {
    if (import.meta.env.DEV) return applyPersistedFeatured({ ...MOCK_USER, id } as UserProfile);
    return httpGet<UserProfile>(`/api/users/${id}`);
  },

  getArtistFeed: async (id: string, cursor?: string | null) => {
    if (import.meta.env.DEV) return { items: MOCK_FEED, nextCursor: null } as PageResult<FeedItem>;
    return httpGet<PageResult<FeedItem>>(`/api/artists/${id}/feeds?cursor=${cursor ?? ""}`);
  },

  getUserFeed: async (id: string, cursor?: string | null) => {
    if (import.meta.env.DEV) return { items: MOCK_FEED, nextCursor: null } as PageResult<FeedItem>;
    return httpGet<PageResult<FeedItem>>(`/api/users/${id}/feeds?cursor=${cursor ?? ""}`);
  },

  follow: async (_targetId: string) => {
    if (import.meta.env.DEV) return;
    await fetch(`/api/follows/${_targetId}`, { method: "POST", credentials: "include" });
  },

  unfollow: async (_targetId: string) => {
    if (import.meta.env.DEV) return;
    await fetch(`/api/unfollows/${_targetId}`, { method: "POST", credentials: "include" });
  },

  submitQuestionToArtist: async (_artistId: string, _payload: { message: string }) => {
    if (import.meta.env.DEV) return;
    await fetch(`/api/artists/${_artistId}/questions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(_payload),
    });
  },

  /** ✅ 대표 뱃지 저장 */
  updateFeaturedBadges: async (role: ProfileRole, profileId: string, badgeIds: string[]) => {
    if (import.meta.env.DEV) {
      saveFeatured(role, profileId, badgeIds);
      return;
    }

    // TODO: 서버 API 확정되면 교체 (예: PATCH /api/users/me/badges/featured)
    await fetch(`/api/profiles/${profileId}/badges/featured`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeIds }),
    });
  },
};
