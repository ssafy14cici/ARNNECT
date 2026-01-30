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
 * ✅ TEST SITE에서는 mock 강제 (env 없이)
 * ========================= */
function isTestHost() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  // ✅ ssafy 도메인(예: i14e107.p.ssafy.io)에서는 무조건 mock
  return host.endsWith("ssafy.io");
}

// ✅ 여기 한 줄이 핵심: 배포(테스트)에서도 mock 강제
const USE_MOCK = import.meta.env.DEV || isTestHost();

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
  // mock에서만 의미 있음
  return "mock-user-0001";
}

const DEFAULT_BADGES = [
  { id: "b_first_review", label: "첫 리뷰", description: "리뷰 1개 달성" },
  { id: "b_first_ticket", label: "첫 티켓", description: "티켓 1개 수집" },
];

async function httpGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `GET ${url} failed (${res.status})`);
  }
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

    return httpGet<ArtistProfile>(`/api/artists/${id}`);
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

    return httpGet<UserProfile>(`/api/users/${id}`);
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

    return httpGet<PageResult<FeedItem>>(`/api/artists/${id}/feeds?cursor=${_cursor ?? ""}`);
  },

  getUserFeed: async (id: string, _cursor?: string | null) => {
    if (USE_MOCK) {
      return { items: [], nextCursor: null } as PageResult<FeedItem>;
    }

    return httpGet<PageResult<FeedItem>>(`/api/users/${id}/feeds?cursor=${_cursor ?? ""}`);
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

    await fetch(`/api/follows/${targetId}`, { method: "POST", credentials: "include" });
  },

  unfollow: async (targetId: string) => {
    if (USE_MOCK) {
      const myId = getMyId();
      const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
      const nextFollows = follows.filter((f) => !(f.from === myId && f.to === targetId));
      lsSet(KEY_FOLLOWS, nextFollows);
      return;
    }

    await fetch(`/api/unfollows/${targetId}`, { method: "POST", credentials: "include" });
  },

  submitQuestionToArtist: async (_artistId: string, _payload: { message: string }) => {
    if (USE_MOCK) return;
    await fetch(`/api/artists/${_artistId}/questions`, {
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

    await fetch(`/api/profiles/${profileId}/badges/featured`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeIds }),
    });
  },
};
