// FE/src/features/profile/types.ts
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

  badges?: Badge[];
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

export type ProfileModel = UserProfile | ArtistProfile;

export type FeedItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
};

export type PageResult<T> = { items: T[]; nextCursor?: string | null };
