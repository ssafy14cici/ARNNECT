// FE/src/features/reviews/api/real.ts
throw new Error("createReviewReal called — mock 모드인데 real이 실행됐습니다. import/분기 확인 필요");

import { http } from "../../../shared/api/http";

// 타입/변환기 내가 보낼 데이터(입력값) 형태 - 데이터를 FormData로 바꾸는 함수 
import type { ReviewCreateReq } from "../model/types";
import { toReviewCreateFormData } from "../model/mappers";

// f로그인이 필요한 기능
import { useAuthStore } from "../../auth/store";

type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function unwrap(res: unknown): unknown {
  if (isObject(res) && "data" in res) return (res as { data: unknown }).data;
  return res;
}

export async function createReviewReal(data: ReviewCreateReq): Promise<unknown> {
  console.log("auth store:", useAuthStore.getState());
  const fd = toReviewCreateFormData(data);
  const res = await http.post("/api/v1/reviews", fd);
  return unwrap(res);
}
