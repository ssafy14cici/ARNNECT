// src/features/feed/types.ts (중복 타입 제거)

export type FeedAuthorRole = "ARTIST" | "USER";

export type FeedItem = {
  id: string;
  authorRole: FeedAuthorRole;
  title: string;
  excerpt?: string;
  authorName: string;
  authorId: string;
  createdAt: string;     // ISO
  imageUrl?: string;
  likes: number;
  views: number;
};

export type FeedFilterKey = "ALL" | "ARTIST" | "USER";
export type ViewMode = "GRID" | "LIST";
