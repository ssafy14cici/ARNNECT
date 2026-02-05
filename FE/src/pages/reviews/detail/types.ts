// FE/src/pages/reviews/detail/types.ts
import type { LocalComment } from "./mappers";

export const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

export type ReviewId = string | number;

export type ReviewDetailData = {
  reviewId: ReviewId;

  artworkId: number;
  artworkTitle: string;

  title: string;
  content: string;

  imageUrl?: string;
  createdAt?: string;
  tags?: string[];

  memberUuid: string; // 리뷰 작성자 uuid
  nickname: string; // 리뷰 작성자 닉네임

  artistUuid: string; // 작품 작가 uuid(서버가 주면)
  artistName: string;
};

export type UiComment = LocalComment & { authorId?: string; isMine?: boolean };
