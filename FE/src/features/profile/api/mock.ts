// FE/src/features/profile/api/mock.ts
import type {
  ArtistProfile,
  UserProfile,
  FeedItem,
  ProfileRole,
  PageResult,
} from "../types";
import { lsGet, lsSet } from "../../../mocks/storage";
import { useAuthStore } from "../../auth/store";

type StoredUser = {
  memberUuid: string;
  name: string;
  displayName?: string;
  role: "USER" | "ARTIST";
};

type StoredArtwork = {
  id: string;
  authorId: string;
  imageUrl?: string;
  createdAt: string;
};

type FollowEdge = {
  from: string;
  to: string;
  createdAt: string;
};

const KEY_USERS = "comet_mock_users_v1";
const KEY_ARTWORKS = "arnnect_mock_artworks_v1";
const KEY_FOLLOWS = "arnnect_mock_follows_v1";
const KEY_FEATURED = "arnnect_mock_profile_featured_v1";

type FeaturedMap = Record<string, string[]>;

const DEFAULT_BADGES = [
  { id: "b_first_review", label: "첫 리뷰", description: "리뷰 1개 달성" },
  { id: "b_first_ticket", label: "첫 티켓", description: "티켓 1개 수집" },
];

function myIdFallback() {
  // 로그인 안 했으면(혹은 seed 전) 임시
  return "mock-user-0001";
}

function getMyId() {
  return useAuthStore.getState().user?.memberUuid ?? myIdFallback();
}

function featuredKey(role: ProfileRole, id: string) {
  return `${role}:${id}`;
}

function loadFeatured(role: ProfileRole, id: string): string[] {
  const map = lsGet<FeaturedMap>(KEY_FEATURED, {});
  return map[featuredKey(role, id)] ?? [];
}

function saveFeatured(role: ProfileRole, id: string, badgeIds: string[]) {
  const map = lsGet<FeaturedMap>(KEY_FEATURED, {});
  map[featuredKey(role, id)] = badgeIds;
  lsSet(KEY_FEATURED, map);
}

function requireRole(user: StoredUser, role: "USER" | "ARTIST") {
  if (user.role !== role) {
    throw new Error(`${role} profile not found`);
  }
}

export async function getMyProfile(): Promise<ArtistProfile | UserProfile> {
  const my = getMyId();
  const users = lsGet<StoredUser[]>(KEY_USERS, []);
  const u = users.find((x) => x.memberUuid === my);

  if (!u) throw new Error("로그인이 필요합니다.");

  return u.role === "ARTIST" ? getArtistProfile(my) : getUserProfile(my);
}

export async function getArtistProfile(id: string): Promise<ArtistProfile> {
  const users = lsGet<StoredUser[]>(KEY_USERS, []);
  const user = users.find((u) => u.memberUuid === id);
  if (!user) throw new Error("Artist not found");
  requireRole(user, "ARTIST");

  const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
  const me = getMyId();

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
    isFollowing: follows.some((f) => f.from === me && f.to === id),
  };
}

export async function getUserProfile(id: string): Promise<UserProfile> {
  const users = lsGet<StoredUser[]>(KEY_USERS, []);
  const user = users.find((u) => u.memberUuid === id);
  if (!user) throw new Error("User not found");
  requireRole(user, "USER");

  const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
  const me = getMyId();

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
    isFollowing: follows.some((f) => f.from === me && f.to === id),
  };
}

export async function getArtistFeed(
  id: string,
  _cursor?: string | null,
): Promise<PageResult<FeedItem>> {
  const artworks = lsGet<StoredArtwork[]>(KEY_ARTWORKS, []);
  const items: FeedItem[] = artworks
    .filter((a) => a.authorId === id)
    .map((a) => ({
      id: a.id,
      imageUrl: a.imageUrl || "https://picsum.photos/400",
      createdAt: a.createdAt,
    }));
  return { items, nextCursor: null };
}

export async function getUserFeed(
  _id: string,
  _cursor?: string | null,
): Promise<PageResult<FeedItem>> {
  return { items: [], nextCursor: null };
}

// ✅ real API는 toggle이지만 mock에서는 follow/unfollow로 idempotent하게 유지
export async function follow(targetId: string): Promise<void> {
  const me = getMyId();
  const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);

  if (!follows.some((f) => f.from === me && f.to === targetId)) {
    follows.push({ from: me, to: targetId, createdAt: new Date().toISOString() });
    lsSet(KEY_FOLLOWS, follows);
  }
}

export async function unfollow(targetId: string): Promise<void> {
  const me = getMyId();
  const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
  lsSet(
    KEY_FOLLOWS,
    follows.filter((f) => !(f.from === me && f.to === targetId)),
  );
}

export async function updateFeaturedBadges(
  role: ProfileRole,
  profileId: string,
  badgeIds: string[],
): Promise<void> {
  saveFeatured(role, profileId, badgeIds);
}
