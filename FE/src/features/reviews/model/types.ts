import type { AuthorCtx } from "../../artworks/model/types";

export type ReviewId = string | number;

export type Review = {
  reviewId: ReviewId;
  title?: string;
  content?: string;
  imageUrl?: string;
  tags?: string[];
  createdAt?: string;

  artworkId?: number;
  authorUuid?: string;
  authorName?: string;
};

export interface ReviewCreateReq {
  title: string;
  content: string;
  artworkId: number;
  tags: string[];
  imageFile: File;

  // legacy/mock 호환용
  author?: AuthorCtx;
}
