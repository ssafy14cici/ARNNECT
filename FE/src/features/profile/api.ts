// FE/src/features/profile/api.ts
import type { ArtistProfile, UserProfile, FeedItem, ProfileRole } from "./types";
import { lsGet, lsSet } from "../../mocks/storage";

/** =========================
 * TYPES (seed.ts의 구조와 일치시킴)
 * ========================= */
interface StoredUser {
  memberUuid: string;
  name: string;
  displayName?: string;
  role: "USER" | "ARTIST";
}

interface StoredArtwork {
  id: string;
  authorId: string;
  imageUrl?: string;
  createdAt: string;
}

interface FollowEdge {
  from: string;
  to: string;
  createdAt: string;
}

const KEY_USERS = "comet_mock_users_v1";
const KEY_ARTWORKS = "arnnect_mock_artworks_v1";
const KEY_FOLLOWS = "arnnect_mock_follows_v1";

type PageResult<T> = { items: T[]; nextCursor?: string | null };

/** =========================
 * RUNTIME FLAGS (도커/배포 대응)
 * ========================= */
const ENV = ((import.meta as any).env ?? {}) as Record<string, unknown>;
const RAW_BASE_URL =
  typeof ENV.VITE_API_BASE_URL === "string" ? (ENV.VITE_API_BASE_URL as string).trim() : "";
const RAW_USE_MOCK = typeof ENV.VITE_USE_MOCK === "string" ? (ENV.VITE_USE_MOCK as string) : "";

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

/**
 * tickets/api.ts랑 동일한 철학:
 * - baseURL 없으면(mock)
 * - use_mock=true면(mock)
 * - dev면(mock)
 * - 실수로 프론트 origin 넣었으면(mock)
 */
const USE_MOCK =
  RAW_USE_MOCK === "true" ||
  !RAW_BASE_URL ||
  RAW_BASE_URL === ORIGIN ||
  RAW_BASE_URL.includes("localhost:5173") ||
  Boolean((import.meta as any).env?.DEV);

/** =========================
 * HELPERS
 * ========================= */
function featuredKey(role: ProfileRole, id: string) {
  return `arnnect.profile.featuredBadges.${role}.${id}`;
}

function loadFeatured(role: ProfileRole, id: string): string[] {
  const raw = localStorage.getItem(featuredKey(role, id));
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveFeatured(role: ProfileRole, id: string, badgeIds: string[]) {
  localStorage.setItem(featuredKey(role, id), JSON.stringify(badgeIds));
}

function getMyId() {
  // ✅ mock 유지 시 기본 내 ID
  return "mock-user-0001";
}

const DEFAULT_BADGES = [
  { id: "b_first_review", label: "첫 리뷰", description: "리뷰 1개 달성" },
  { id: "b_first_ticket", label: "첫 티켓", description: "티켓 1개 수집" },
];

// mock id가 실API로 섞였을 때 바로 잡기용 방어
function assertNotMockId(id: string) {
  if (id.startsWith("mock-")) {
    throw new Error(`실API 호출인데 mock id가 들어왔습니다: ${id} (mock 분기/로그인 id 확인)`);
  }
}

async function httpGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json();
}

/** =========================
 * API OBJECT
 * ========================= */
export const profileApi = {
  getArtistProfile: async (id: string): Promise<ArtistProfile> => {
    if (USE_MOCK) {
      const users = lsGet<StoredUser[]>(KEY_USERS, []);
      const user = users.find((u) => u.memberUuid === id);
      const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
      const myId = getMyId();

      if (!user) throw new Error("Artist not found");

      return {
        id: user.memberUuid,
        role: "ARTIST",
        name: user.displayName || user.name,
        imageUrl: "",
        bio: `${user.name} 작가의 로컬 프로필입니다.`,
        genre: "Painting",
        contactEnabled: true,
        contactUrl: "https://example.com",
        followersCount: follows.filter((f) => f.to === id).length,
        followingsCount: follows.filter((f) => f.from === id).length,
        badges: DEFAULT_BADGES,
        featuredBadgeIds: loadFeatured("ARTIST", id),
        isFollowing: follows.some((f) => f.from === myId && f.to === id),
      };
    }

    // ✅ 실API로 붙일 때: mock id 차단
    assertNotMockId(id);

    return httpGet<ArtistProfile>(`/api/artists/${encodeURIComponent(id)}`);
  },

  getUserProfile: async (id: string): Promise<UserProfile> => {
    if (USE_MOCK) {
      const users = lsGet<StoredUser[]>(KEY_USERS, []);
      const user = users.find((u) => u.memberUuid === id);
      const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
      const myId = getMyId();

      if (!user) throw new Error("User not found");

      return {
        id: user.memberUuid,
        role: "USER",
        name: user.name,
        imageUrl: "",
        bio: "로컬 mock 유저입니다.",
        followersCount: follows.filter((f) => f.to === id).length,
        followingsCount: follows.filter((f) => f.from === id).length,
        badges: DEFAULT_BADGES,
        featuredBadgeIds: loadFeatured("USER", id),
        isFollowing: follows.some((f) => f.from === myId && f.to === id),
      };
    }

    assertNotMockId(id);

    return httpGet<UserProfile>(`/api/users/${encodeURIComponent(id)}`);
  },

  getArtistFeed: async (id: string, _cursor?: string | null) => {
    if (USE_MOCK) {
      const artworks = lsGet<StoredArtwork[]>(KEY_ARTWORKS, []);
      const items: FeedItem[] = artworks
        .filter((art) => art.authorId === id)
        .map((art) => ({
          id: art.id,
          imageUrl: art.imageUrl || "https://picsum.photos/400",
          createdAt: art.createdAt,
        }));

      return { items, nextCursor: null } as PageResult<FeedItem>;
    }

    assertNotMockId(id);

    const cursor = _cursor ? encodeURIComponent(_cursor) : "";
    return httpGet<PageResult<FeedItem>>(
      `/api/artists/${encodeURIComponent(id)}/feeds?cursor=${cursor}`,
    );
  },

  getUserFeed: async (id: string, _cursor?: string | null) => {
    if (USE_MOCK) {
      return { items: [], nextCursor: null } as PageResult<FeedItem>;
    }

    assertNotMockId(id);

    const cursor = _cursor ? encodeURIComponent(_cursor) : "";
    return httpGet<PageResult<FeedItem>>(`/api/users/${encodeURIComponent(id)}/feeds?cursor=${cursor}`);
  },

  follow: async (targetId: string) => {
    if (USE_MOCK) {
      const myId = getMyId();
      const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
      if (!follows.some((f) => f.from === myId && f.to === targetId)) {
        follows.push({ from: myId, to: targetId, createdAt: new Date().toISOString() });
        lsSet(KEY_FOLLOWS, follows);
      }
      return;
    }

    assertNotMockId(targetId);

    await fetch(`/api/follows/${encodeURIComponent(targetId)}`, { method: "POST", credentials: "include" });
  },

  unfollow: async (targetId: string) => {
    if (USE_MOCK) {
      const myId = getMyId();
      const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
      const nextFollows = follows.filter((f) => !(f.from === myId && f.to === targetId));
      lsSet(KEY_FOLLOWS, nextFollows);
      return;
    }

    assertNotMockId(targetId);

    await fetch(`/api/unfollows/${encodeURIComponent(targetId)}`, { method: "POST", credentials: "include" });
  },

  submitQuestionToArtist: async (_artistId: string, _payload: { message: string }) => {
    if (USE_MOCK) return;

    assertNotMockId(_artistId);

    await fetch(`/api/artists/${encodeURIComponent(_artistId)}/questions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(_payload),
    });
  },

  updateFeaturedBadges: async (role: ProfileRole, profileId: string, badgeIds: string[]) => {
    if (USE_MOCK) {
      saveFeatured(role, profileId, badgeIds);
      return;
    }

    assertNotMockId(profileId);

    await fetch(`/api/profiles/${encodeURIComponent(profileId)}/badges/featured`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeIds }),
    });
  },
};
