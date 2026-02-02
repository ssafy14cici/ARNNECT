export type PostRole = "USER" | "ARTIST";

export type AuthorCtx = {
  id: string;
  name: string;
  role: PostRole;
};

export type MockPost = {
  id: string;
  authorId: string;
  authorName: string;
  role: PostRole;

  title: string;
  content: string;

  imageUrls: string[];
  tags: string[];
  likes: number;
  views: number;

  createdAt: string;
  isDeleted?: boolean;

  meta?: Record<string, unknown>;
};

export interface ReviewCreateReq {
  title: string;
  content: string;
  artworkId: number;
  tags: string[];
  imageFile: File;
  author: AuthorCtx;
}

export interface ArtworkCreateReq {
  title: string;
  description: string;
  field: string;
  genre: string;
  productionDate: number;
  size: string;
  tags: string[];
  imageFile: File;
  author: AuthorCtx;
}
