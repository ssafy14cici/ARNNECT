import type { ReviewCreateReq, ReviewId, Review } from "../model/types";
import { createReviewReal } from "./real";
import {
  createReviewMock,
  listReviewsByArtworkMock,
  getReviewDetailMock,
  updateReviewMock,
  deleteReviewMock,
} from "./mock";

// true/false 만 바꾸면 됨
const USE_MOCK = true;
export async function createReview(data: ReviewCreateReq) {
  return USE_MOCK ? createReviewMock(data) : createReviewReal(data);
}

// 아래는 지금 UI에서 필요해질 것들(미리 export)
export async function listReviewsByArtwork(artworkId: number) {
  return USE_MOCK ? listReviewsByArtworkMock(artworkId) : Promise.reject(new Error("real not wired yet"));
}

export async function getReviewDetail(reviewId: ReviewId) {
  return USE_MOCK ? getReviewDetailMock(reviewId) : Promise.reject(new Error("real not wired yet"));
}

export async function updateReview(reviewId: ReviewId, patch: Partial<Review>) {
  return USE_MOCK ? updateReviewMock(reviewId, patch) : Promise.reject(new Error("real not wired yet"));
}

export async function deleteReview(reviewId: ReviewId) {
  return USE_MOCK ? deleteReviewMock(reviewId) : Promise.reject(new Error("real not wired yet"));
}

//나중에 real로 붙일 때는 어디만 바꾸면 되냐

// real.ts에 목록/상세/수정/삭제 함수 추가

// index.ts에서 Promise.reject(...) 되어 있는 부분을 real 함수로 연결

// USE_MOCK=false