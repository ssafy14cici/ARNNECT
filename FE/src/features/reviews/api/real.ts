// FE/src/features/reviews/api/real.ts
import { http } from "../../../shared/api/http";
import type { ReviewCreateReq } from "../model/types";
import { toReviewCreateFormData } from "../model/mappers";

type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function unwrap(res: unknown): unknown {
  if (isObject(res) && "data" in res) return (res as { data: unknown }).data;
  return res;
}

export async function createReviewReal(data: ReviewCreateReq): Promise<unknown> {
  const fd = toReviewCreateFormData(data);
  const res = await http.post("/api/v1/reviews", fd);
  return unwrap(res);
}
