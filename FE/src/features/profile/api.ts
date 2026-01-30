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

// 목업 환경에서의 내 ID
function getMyId() {
  return "mock-user-0001";
}

const DEFAULT_BADGES = [
  { id: "b_first_review", label: "첫 리뷰", description: "리뷰 1개 달성" },
  { id: "b_first_ticket", label: "첫 티켓", description: "티켓 1개 수집" },
];

/** =========================
 * 🚨 [긴급 수정] 무조건 로컬 데이터만 반환하는 API 객체
 * fetch 코드를 전부 제거했습니다.
 * ========================= */
export const profileApi = {
  
  // 1. 아티스트 프로필 조회
  getArtistProfile: async (id: string): Promise<ArtistProfile> => {
    // 로컬 스토리지에서 찾아봄
    const users = lsGet<StoredUser[]>(KEY_USERS, []);
    let user = users.find((u) => u.memberUuid === id);
    const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
    const myId = getMyId();

    // 🚨 데이터가 없으면? 에러 내지 말고 그냥 가짜 데이터 리턴 (앱 죽음 방지)
    if (!user) {
      user = {
        memberUuid: id,
        name: "Mock Artist",
        displayName: "임시 아티스트",
        role: "ARTIST",
      };
    }

    return {
      id: user.memberUuid,
      role: "ARTIST",
      name: user.displayName || user.name,
      imageUrl: "", // 이미지가 없으면 기본 이미지 들어감
      bio: "이것은 도커 환경을 위한 임시 아티스트 프로필입니다.",
      genre: "Painting",
      contactEnabled: true,
      contactUrl: "https://example.com",
      followersCount: follows.filter((f) => f.to === id).length,
      followingsCount: follows.filter((f) => f.from === id).length,
      badges: DEFAULT_BADGES,
      featuredBadgeIds: loadFeatured("ARTIST", id),
      isFollowing: follows.some((f) => f.from === myId && f.to === id),
    };
  },

  // 2. 유저 프로필 조회
  getUserProfile: async (id: string): Promise<UserProfile> => {
    const users = lsGet<StoredUser[]>(KEY_USERS, []);
    let user = users.find((u) => u.memberUuid === id);
    const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
    const myId = getMyId();

    // 🚨 데이터 없으면 가짜 리턴
    if (!user) {
      user = {
        memberUuid: id,
        name: "Mock User",
        role: "USER",
      };
    }

    return {
      id: user.memberUuid,
      role: "USER",
      name: user.name,
      imageUrl: "",
      bio: "이것은 도커 환경을 위한 임시 유저 프로필입니다.",
      followersCount: follows.filter((f) => f.to === id).length,
      followingsCount: follows.filter((f) => f.from === id).length,
      badges: DEFAULT_BADGES,
      featuredBadgeIds: loadFeatured("USER", id),
      isFollowing: follows.some((f) => f.from === myId && f.to === id),
    };
  },

  // 3. 아티스트 피드 조회
  getArtistFeed: async (id: string, _cursor?: string | null) => {
    const artworks = lsGet<StoredArtwork[]>(KEY_ARTWORKS, []);
    
    // 로컬 데이터 기반으로 매핑, 없으면 빈 배열
    const items: FeedItem[] = artworks
      .filter((art) => art.authorId === id)
      .map((art) => ({
        id: art.id,
        imageUrl: art.imageUrl || "/art/a1.jpg", // 기본 이미지 안전장치
        createdAt: art.createdAt,
      }));

    return { items, nextCursor: null } as PageResult<FeedItem>;
  },

  // 4. 유저 피드 조회
  getUserFeed: async (id: string, _cursor?: string | null) => {
    // 유저 피드는 일단 빈 배열로 리턴 (에러 방지)
    return { items: [], nextCursor: null } as PageResult<FeedItem>;
  },

  // 5. 팔로우 (로컬 스토리지에만 저장)
  follow: async (targetId: string) => {
    const myId = getMyId();
    const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
    if (!follows.some((f) => f.from === myId && f.to === targetId)) {
      follows.push({ from: myId, to: targetId, createdAt: new Date().toISOString() });
      lsSet(KEY_FOLLOWS, follows);
    }
    return;
  },

  // 6. 언팔로우 (로컬 스토리지에서만 삭제)
  unfollow: async (targetId: string) => {
    const myId = getMyId();
    const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
    const nextFollows = follows.filter((f) => !(f.from === myId && f.to === targetId));
    lsSet(KEY_FOLLOWS, nextFollows);
    return;
  },

  // 7. 질문하기 (콘솔만 찍고 성공 처리)
  submitQuestionToArtist: async (_artistId: string, _payload: { message: string }) => {
    console.log("Mock 질문 전송 성공:", _payload);
    return;
  },

  // 8. 뱃지 설정 (로컬 스토리지에만 저장)
  updateFeaturedBadges: async (role: ProfileRole, profileId: string, badgeIds: string[]) => {
    saveFeatured(role, profileId, badgeIds);
    return;
  },
};