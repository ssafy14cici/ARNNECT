// FE/src/features/favorites/api.ts
import { http } from "../../shared/api/http";

type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}
function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
  }
  return fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export type FavoriteToggleReq = {
  artworkId: number;
};

export type FavoriteToggleResult = {
  // 서버가 내려주면 사용 (키가 다를 수 있어서 아래에서 흡수)
  isFavorited?: boolean;
  favoriteCount?: number;
};

/**
 * POST /api/v1/favorites  (toggle)
 * Body: { artworkId: number }
 *
 * 응답은 백엔드 구현마다 다를 수 있어서 최대한 폭넓게 파싱.
 */
export async function toggleFavorite(artworkId: number): Promise<FavoriteToggleResult> {
  const res = await http.post("/api/v1/favorites", { artworkId } satisfies FavoriteToggleReq);

  const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
  const body = pickEnvelopeData(payload);

  // 응답이 단순 boolean/number일 수도 있어 방어
  if (!isObject(body)) return {};

  // 가능한 키들 전부 흡수
  const isFavorited =
    asBool(get(body, "isFavorited"), asBool(get(body, "favorited"), asBool(get(body, "isFavorite"), undefined as any)));

  const favoriteCount =
    asNumber(get(body, "favoriteCount"), asNumber(get(body, "likeCount"), asNumber(get(body, "count"), undefined as any)));

  // undefined 처리: 파싱 실패하면 필드 자체를 빼서 호출부가 옵티미스틱 유지하도록
  const out: FavoriteToggleResult = {};
  if (typeof isFavorited === "boolean") out.isFavorited = isFavorited;
  if (Number.isFinite(favoriteCount)) out.favoriteCount = favoriteCount;

  return out;
}

/**
 * (선택) 초기 상태/카운트 조회용.
 * 백엔드에 GET 스펙이 확정되면 이 함수만 맞춰 바꾸면 됨.
 *
 * 예시 후보:
 * - GET /api/v1/favorites/count?artworkId=1
 * - GET /api/v1/favorites?artworkId=1  (내가 좋아요 눌렀는지)
 */
export async function getFavoriteCountMaybe(artworkId: number): Promise<number | null> {
  try {
    const res = await http.get(`/api/v1/favorites/count?artworkId=${encodeURIComponent(String(artworkId))}`);
    const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
    const body = pickEnvelopeData(payload);
    if (typeof body === "number") return body;
    if (isObject(body)) {
      const n = asNumber(get(body, "count"), asNumber(get(body, "favoriteCount"), NaN));
      if (Number.isFinite(n)) return n;
    }
    return null;
  } catch {
    return null;
  }
}
