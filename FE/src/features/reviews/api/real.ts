import { http } from "../../../shared/api/http";
import { useAuthStore } from "../../auth/store";
import type { ReviewCreateReq } from "../model/types";
import { toReviewCreateFormData } from "../model/mappers";

function authHeader() {
  const s = useAuthStore.getState();
  const token = s.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createReviewReal(data: ReviewCreateReq) {
  const fd = toReviewCreateFormData(data);

  const res = await http.post("/api/v1/reviews", fd, {
    headers: {
      ...authHeader(),
    },
    withCredentials: true,
  });

  return res.data;
}
