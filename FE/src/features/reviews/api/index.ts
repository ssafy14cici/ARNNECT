import type { ReviewCreateReq } from "../model/types";
import { createReviewReal } from "./real";

export async function createReview(data: ReviewCreateReq) {
  return createReviewReal(data);
}
