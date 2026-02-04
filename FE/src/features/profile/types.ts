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

  // 화면 표시용(닉네임/활동명)
  name: string;

  // ✅ 서버에서 내려오는 이미지 경로/URL
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
  email?: string;
  nickname?: string;
  birth?: string; // yyyy-MM-dd
  phone?: string;
  isAgree?: boolean;
};

export type ArtistProfile = ProfileBase & {
  role: "ARTIST";
  email?: string;
  birth?: string; // yyyy-MM-dd
  phone?: string;
  isAgree?: boolean;

  // (있으면 편집 프리필에 유리)
  fieldId?: number;
  genreId?: number;

  document?: string;

  field?: string;
  debutYear?: number;

  genre?: string;

  sns?: string;
  snsPage?: string;

  affiliation?: string;

  isVerified?: boolean;

  introduction?: string;
  artIntroduction?: string;

  contactEnabled?: boolean;
  contactUrl?: string;
};

export type ProfileModel = UserProfile | ArtistProfile;

export type FeedItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
};

export type PageResult<T> = {
  items: T[];
  nextCursor?: string | null;
};
