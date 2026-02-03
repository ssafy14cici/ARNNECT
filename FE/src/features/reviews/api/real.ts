// FE/src/features/reviews/api/real.ts
import { http } from "../../../shared/api/http";
import type { ReviewCreateReq, ReviewDeatil, ReviewUpdateReq, ApiEnvelope } from "../model/types";
import { toReviewCreateFormData } from "../model/mappers";

type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
function pickEnvelopeData<T>(raw: unknown): T {
  // 서버가 { data: ... } envelope이면 data만 추출
  if (isObject(raw) && "data" in raw) return (raw as ApiEnvelope<T>).data;
  // http wrapper가 이미 data만 주는 경우도 있어서 그대로 캐스팅
  return raw as T;
}

// ✅ 여기 중요: /detail 절대 붙이지 않음
const REVIEW_PATH = "/api/v1/reviews";

export async function createReviewReal(data: ReviewCreateReq) {
  const fd = toReviewCreateFormData(data);
  const res = await http.post(REVIEW_PATH, fd);
  return pickEnvelopeData(res?.data ?? res);
}

// ✅ ReviewDetailResponse = ReviewDeatil 타입으로 받는다고 가정
export async function getReviewDetailReal(reviewId: string | number): Promise<ReviewDeatil> {
  const res = await http.get(`${REVIEW_PATH}/${reviewId}`);
  return pickEnvelopeData<ReviewDeatil>(res?.data ?? res);
}

export async function updateReviewReal(reviewId: string | number, body: ReviewUpdateReq) {
  // 보통 수정은 JSON PUT
  const res = await http.put(`${REVIEW_PATH}/${reviewId}`, body);
  return pickEnvelopeData(res?.data ?? res);
}

export async function deleteReviewReal(reviewId: string | number) {
  const res = await http.delete(`${REVIEW_PATH}/${reviewId}`);
  return pickEnvelopeData(res?.data ?? res);
}
