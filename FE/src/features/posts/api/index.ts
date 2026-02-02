import { USE_MOCK } from "../../../shared/config/env";
import type { ArtworkCreateReq, ReviewCreateReq } from "../types";
import { createArtworkReal, createReviewReal } from "./real";
import {
  createArtworkMock,
  createReviewMock,
  listPostsMock,
  listPostsByAuthorMock,
  subscribePostsUpdated,
} from "./mock";

export async function createReview(data: ReviewCreateReq) {
  return USE_MOCK ? createReviewMock(data) : createReviewReal(data);
}

export async function createArtwork(data: ArtworkCreateReq) {
  return USE_MOCK ? createArtworkMock(data) : createArtworkReal(data);
}

// 조회도 통일(FeedTab/Feed에서 사용)
export function listPosts() {
  return USE_MOCK ? listPostsMock() : []; // real은 추후 API 붙이기
}

export function listPostsByAuthor(authorId: string, role?: "USER" | "ARTIST") {
  return USE_MOCK ? listPostsByAuthorMock(authorId, role) : [];
}

export { subscribePostsUpdated };
