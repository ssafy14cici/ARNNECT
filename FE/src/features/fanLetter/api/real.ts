// FE/src/features/fanLetter/api/real.ts
import { http } from "../../../shared/api/http";
import type {
  ApiEnvelope,
  FanLetter,
  FanLetterId,
  FanLetterRaw,
  FanLetterSendPayload,
} from "../types";

type JsonObject = Record<string, unknown>;
const isObject = (v: unknown): v is JsonObject => typeof v === "object" && v !== null;

function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function asNumber(v: unknown, fallback = NaN): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function unwrapEnvelope<T>(raw: unknown): T {
  // axios res.data가 envelope일 수도, 그냥 데이터일 수도 있음
  if (isObject(raw) && "data" in raw) return (raw as ApiEnvelope<T>).data as T;
  return raw as T;
}

/**
 * ✅ baseURL이 /api/v1 포함인지에 따라 경로를 "정확히 한 번만" 붙여줌
 * - baseURL이 .../api/v1 이면: "/fanletters"
 * - baseURL이 origin만이면: "/api/v1/fanletters"
 */
function apiPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;

  const base = (http as any)?.defaults?.baseURL;
  const baseStr = typeof base === "string" ? base : "";

  const baseHasApiV1 = /\/api\/v1\/?$/.test(baseStr);

  if (baseHasApiV1) {
    // baseURL에 /api/v1이 이미 있으니, path에 /api/v1 붙어있으면 제거
    return p.startsWith("/api/v1/") ? p.replace(/^\/api\/v1/, "") : p;
  }
  // baseURL에 /api/v1이 없으면, path에 없을 때만 붙임
  return p.startsWith("/api/v1/") ? p : `/api/v1${p}`;
}

/**
 * 서버가 리스트를 다양한 키로 감싸서 내려주는 케이스 대응
 * - data: FanLetter[]
 * - data: { fanLetters: FanLetter[] }
 * - data: { fanLetterList: FanLetter[] }
 * - data: { content: FanLetter[] } 등
 */
function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;

  if (isObject(raw)) {
    const candidates = [
      "fanLetters",
      "fanletters",
      "fanLetterList",
      "fanletterList",
      "items",
      "list",
      "results",
      "content",
    ];

    for (const k of candidates) {
      const v = get(raw, k);

      // direct list
      if (Array.isArray(v)) return v;

      // pagination wrapper: { content: [...] } or { data: [...] }
      if (isObject(v)) {
        const innerContent = get(v, "content");
        if (Array.isArray(innerContent)) return innerContent;

        const innerList = get(v, "list");
        if (Array.isArray(innerList)) return innerList;

        const innerItems = get(v, "items");
        if (Array.isArray(innerItems)) return innerItems;
      }
    }
  }

  return [];
}

function mapRawToFanLetter(raw: FanLetterRaw | unknown): FanLetter {
  const o: JsonObject = isObject(raw) ? raw : {};

  // ✅ BE 응답: fanLetterId
  const id =
    asNumber(get(o, "fanLetterId")) ||
    asNumber(get(o, "fanletterId")) ||
    asNumber(get(o, "id")) ||
    0;

  // ✅ BE 응답: nickname
  const fromNickname =
    asString(get(o, "fromNickname")) ||
    asString(get(o, "nickname")) ||
    asString(get(o, "from_nickname")) ||
    "User";

  // ✅ BE 응답: content (질문/본문)
  const question =
    asString(get(o, "content")) ||
    asString(get(o, "question")) ||
    asString(get(o, "message")) ||
    "";

  // ✅ createdAt
  const createdAt =
    asString(get(o, "createdAt")) ||
    asString(get(o, "created_at")) ||
    asString(get(o, "date")) ||
    "";

  // ✅ artworkId / artworkName
  const artworkId = (() => {
    const v = get(o, "artworkId");
    const n = asNumber(v, NaN);
    return Number.isFinite(n) ? n : undefined;
  })();

  const artworkName =
    asString(get(o, "artworkName")) ||
    asString(get(o, "artworkTitle")) ||
    asString(get(o, "artwork_name")) ||
    undefined;

  // ✅ answer: string | null
  const answerRaw = get(o, "answer");
  const answer = (() => {
    const s = asString(answerRaw, "").trim();
    return s ? s : undefined;
  })();

  const isAnswered = Boolean(answer);

  return {
    id: Number(id),
    fromNickname,
    question,
    createdAt,
    artworkId,
    artworkName,
    isAnswered,
    answer,
  };
}

/** ✅ 팬레터 발송 */
export async function sendFanLetter(payload: FanLetterSendPayload): Promise<void> {
  await http.post(apiPath("/fanletters"), {
    memberUuid: payload.memberUuid,
    title: payload.title,
    content: payload.content,
    artworkId: payload.artworkId,
  });
}

/**
 * ✅ 작가: 받은 팬레터 전체 조회
 * GET /api/v1/fanletters/all?artist={memberUuid}
 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  const res = await http.get(apiPath("/fanletters/all"), {
    params: { artist: artistMemberUuid },
  });

  // axios면 res.data가 body
  const body = (res as any)?.data ?? res;

  // envelope이면 1번 unwrap
  const unwrapped = unwrapEnvelope<unknown>(body);

  // 배열 추출(직접 배열 or 객체에 감싸진 배열)
  const list = extractArray(unwrapped);

  return list.map(mapRawToFanLetter);
}

/** ✅ 작가: 답장 등록 */
export async function createFanLetterAnswer(
  fanLetterId: FanLetterId,
  answer: string
): Promise<void> {
  await http.post(apiPath(`/fanletters/${fanLetterId}/answer`), { answer });
}

/** ✅ 작가: 답장 수정 */
export async function updateFanLetterAnswer(
  fanLetterId: FanLetterId,
  answer: string
): Promise<void> {
  await http.put(apiPath(`/fanletters/${fanLetterId}/answer`), { answer });
}

/** ✅ 작가: 답장 삭제 */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  await http.delete(apiPath(`/fanletters/${fanLetterId}/answer`));
}
