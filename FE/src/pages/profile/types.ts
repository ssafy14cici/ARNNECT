// FE/src/pages/profile/types.ts
export type ProfileRole = "ARTIST" | "USER";

export type Badge = { id: string; label: string };

export type BaseProfile = {
  id: string;
  role: ProfileRole;
  name: string;
  imageUrl?: string;
  bio?: string;
  badges?: Badge[];
  followersCount: number;
  followingsCount: number;
  isFollowing?: boolean;
};

export type ArtistProfile = BaseProfile & {
  role: "ARTIST";
  genre?: string;
  contactEnabled?: boolean;
  contactUrl?: string;
};

export type UserProfile = BaseProfile & {
  role: "USER";
};

export type FeedItem = {
  id: string;
  imageUrl: string;
  title?: string;
  createdAt: string;
};
