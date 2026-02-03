import type { ReviewCreateReq } from "../model/types";
import { createReviewReal } from "./real";
import { createReviewMock } from "./mock";

export const USE_MOCK = true;

export async function createReview(data: ReviewCreateReq) {
  console.log("[reviews/api] USE_MOCK =", USE_MOCK);

  if (USE_MOCK) {
    console.log("[reviews/api] calling MOCK");
    return createReviewMock(data);
  }

  console.log("[reviews/api] calling REAL");
  return createReviewReal(data);
}
