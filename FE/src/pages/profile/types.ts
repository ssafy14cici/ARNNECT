// FE/src/pages/profile/types.ts
export type ProfileRole = "USER" | "ARTIST";

export type Badge = {
  id: string;
  label: string;
  description?: string;
};

type ProfileBase = {
  id: string;
  role: ProfileRole;
  name: string;
  imageUrl?: string | null;
  bio?: string | null;

  followersCount: number;
  followingsCount: number;
  isFollowing: boolean;

  /** ✅ 획득한 뱃지 목록 */
  badges?: Badge[];

  /** ✅ 대표 뱃지(최대 3개) - id만 저장 */
  featuredBadgeIds?: string[];
};

export type UserProfile = ProfileBase & {
  role: "USER";
};

export type ArtistProfile = ProfileBase & {
  role: "ARTIST";
  genre?: string;
  contactEnabled?: boolean;
  contactUrl?: string;
};

export type FeedItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
};
