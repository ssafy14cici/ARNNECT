import type { ReviewCreateReq } from "../model/types";
import { createReviewReal } from "./real";
export { USE_MOCK } from "../../../shared/config/env";


export async function createReview(data: ReviewCreateReq) {
  return createReviewReal(data);
}
