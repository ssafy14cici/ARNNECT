import { http } from "../../../shared/api/http";
import { useAuthStore } from "../../auth/store";
import type { ReviewCreateReq } from "../model/types";
import { toReviewCreateFormData } from "../model/mappers";


export async function createReviewReal(data: ReviewCreateReq) {
  console.log("[createReviewReal] http baseURL:", http.defaults.baseURL);

  const fd = toReviewCreateFormData(data);

  const res = await http.post("/api/v1/reviews", fd,);
  return res.data;
}
