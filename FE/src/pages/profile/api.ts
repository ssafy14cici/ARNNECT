// FE/src/pages/profile/api.ts
import type { ArtistProfile, UserProfile, FeedItem } from "./types";

type PageResult<T> = { items: T[]; nextCursor?: string | null };

const MOCK_USER: UserProfile = {
  id: "me",
  role: "USER",
  name: "Mock User",
  imageUrl: "",
  bio: "로컬 mock 유저입니다.",
  followersCount: 12,
  followingsCount: 8,
  badges: [{ id: "b1", label: "뉴비" }],
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
  badges: [{ id: "v1", label: "인증" }],
  isFollowing: false,
};

const MOCK_FEED: FeedItem[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `f${i + 1}`,
  imageUrl: "https://picsum.photos/400?random=" + (i + 1),
  createdAt: new Date().toISOString(),
}));

async function httpGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });

  // ✅ 여기서부터: JSON 아닌 응답을 잡아내서 에러 메시지 개선
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
    if (import.meta.env.DEV) return { ...MOCK_ARTIST, id } as ArtistProfile;
    return httpGet<ArtistProfile>(`/api/artists/${id}`);
  },

  getUserProfile: async (id: string) => {
    if (import.meta.env.DEV) return { ...MOCK_USER, id } as UserProfile;
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
};
