// FE/src/features/reviews/api/index.ts
import type { ReviewCreateReq, ReviewDeatil, ReviewUpdateReq } from "../model/types";
import { createReviewReal, getReviewDetailReal, updateReviewReal, deleteReviewReal } from "./real";

export { USE_MOCK } from "../../../shared/config/env";

export async function createReview(data: ReviewCreateReq) {
  return createReviewReal(data);
}

export async function getReviewDetail(reviewId: string | number): Promise<ReviewDeatil> {
  return getReviewDetailReal(reviewId);
}

export async function updateReview(reviewId: string | number, data: ReviewUpdateReq) {
  return updateReviewReal(reviewId, data);
}

export async function deleteReview(reviewId: string | number) {
  return deleteReviewReal(reviewId);
}
