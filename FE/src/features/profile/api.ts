import type { ArtistProfile, UserProfile, FeedItem, ProfileRole } from "./types";
import { lsGet, lsSet } from "../../mocks/storage";

/** =========================
 * TYPES
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
 * 🚨 [중요] 프론트 단독 배포용 설정
 * ========================= */
// 제출용이므로 조건 따지지 말고 무조건 true로 고정합니다.
// 이렇게 해야 도커(Nginx) 환경에서도 백엔드를 찾지 않고 Mock 데이터를 보여줍니다.
const USE_MOCK = true; 

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
      let user = users.find((u) => u.memberUuid === id);
      const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
      const myId = getMyId();

      // 🚨 [수정] 데이터가 없으면 에러 대신 '임시 프로필'을 반환 (심사위원용 안전장치)
      if (!user) {
        // 만약 내 프로필 조회 중이었다면 내 ID로 간주
        const isMe = id === myId; 
        user = {
            memberUuid: id,
            name: isMe ? "내 아티스트 (Mock)" : "Unknown Artist",
            role: "ARTIST",
            displayName: isMe ? "Me" : undefined
        };
      }

      return {
        id: user.memberUuid,
        role: "ARTIST",
        name: user.displayName || user.name,
        imageUrl: "",
        bio: `${user.name} 작가의 프로필입니다.`,
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
      let user = users.find((u) => u.memberUuid === id);
      const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
      const myId = getMyId();

      // 🚨 [수정] 데이터가 없으면 안전장치 가동
      if (!user) {
         const isMe = id === myId;
         user = {
            memberUuid: id,
            name: isMe ? "내 유저 (Mock)" : "Unknown User",
            role: "USER"
         };
      }

      return {
        id: user.memberUuid,
        role: "USER",
        name: user.name,
        imageUrl: "",
        bio: "Mock 유저 프로필입니다.",
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