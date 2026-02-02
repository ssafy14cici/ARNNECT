export type FeedAuthorRole = "ARTIST" | "USER";
export type FeedFilterKey = "ALL" | "ARTIST" | "USER";
export type ViewMode = "GRID" | "LIST";

export type FeedItem = {
  id: string;               // "artwork-12" | "review-5" | "img-1" 등
  authorRole: FeedAuthorRole;

  title: string;
  excerpt?: string;

  authorName: string;
  authorId: string;

  createdAt: string;        // ISO
  imageUrl?: string;

  category?: string;
  likes: number;
  views: number;
};
