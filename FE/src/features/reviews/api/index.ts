import { USE_MOCK } from "../../../shared/config/env";
import type { ReviewCreateReq } from "../model/types";
import { createReviewReal } from "./real";

export async function createReview(data: ReviewCreateReq) {
  if (USE_MOCK) {
    throw new Error("[reviews] USE_MOCK=true 환경에서는 createReview를 지원하지 않습니다.");
  }
  return createReviewReal(data);
}
