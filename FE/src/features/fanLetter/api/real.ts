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

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "y", "yes"].includes(s)) return true;
    if (["false", "0", "n", "no"].includes(s)) return false;
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
 * - data: { items: FanLetter[] } 등
 */
function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;

  if (isObject(raw)) {
    const candidates = ["fanLetters", "fanletters", "items", "list", "content", "results"];
    for (const k of candidates) {
      const v = get(raw, k);
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function mapRawToFanLetter(raw: FanLetterRaw | unknown): FanLetter {
  const o: JsonObject = isObject(raw) ? raw : {};

  // id
  const id =
    asNumber(get(o, "fanLetterId")) ||
    asNumber(get(o, "fanletterId")) ||
    asNumber(get(o, "id")) ||
    0;

  // from nickname (BE/FE 흔들림 대응)
  const fromNickname =
    asString(get(o, "fromNickname")) ||
    asString(get(o, "nickname")) ||
    asString(get(o, "from_nickname")) ||
    "User";

  // question/content
  const question =
    asString(get(o, "question")) ||
    asString(get(o, "content")) ||
    asString(get(o, "message")) ||
    "";

  // createdAt/date
  const createdAt =
    asString(get(o, "createdAt")) ||
    asString(get(o, "created_at")) ||
    asString(get(o, "date")) ||
    "";

  // artwork
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

  // answer / answered
  const answerRaw = get(o, "answer") ?? get(o, "reply") ?? get(o, "response");
  const answer = (() => {
    const s = asString(answerRaw, "").trim();
    return s ? s : undefined;
  })();

  // ✅ FIX: "??" 와 "||"를 한 표현식에서 섞지 않도록 분리
  const answeredV = get(o, "answered");
  const isAnsweredV = get(o, "isAnswered");

  const answeredBool =
    (typeof answeredV === "boolean" ? answeredV : undefined) ??
    (typeof isAnsweredV === "boolean" ? isAnsweredV : undefined) ??
    asBool(get(o, "is_answered"), false);

  const isAnswered = answeredBool || Boolean(answer);

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

/** ✅ 팬레터 발송 (BE: FanLetterRequest) */
export async function sendFanLetter(payload: FanLetterSendPayload): Promise<void> {
  await http.post(apiPath("/fanletters"), {
    memberUuid: payload.memberUuid, // ✅ BE 키
    title: payload.title, // ✅ BE 키
    content: payload.content,
    artworkId: payload.artworkId,
  });
}

/**
 * ✅ 작가: 받은 팬레터 전체 조회
 * GET /api/v1/fanletters/all?artist={memberId}
 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  const res = await http.get(apiPath("/fanletters/all"), {
    params: { artist: artistMemberUuid },
  });

  // axios면 res.data가 body
  const body = (res as any)?.data ?? res;

  // envelope이면 1번만 unwrap
  const unwrapped = unwrapEnvelope<unknown>(body);

  // 배열이거나, 객체 안에 배열이 들어있거나 케이스 모두 커버
  const list = extractArray(unwrapped);

  return list.map(mapRawToFanLetter);
}

/** ✅ 작가: 답장 등록 */
export async function createFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  await http.post(apiPath(`/fanletters/${fanLetterId}/answer`), { answer });
}

/** ✅ 작가: 답장 수정 */
export async function updateFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  await http.put(apiPath(`/fanletters/${fanLetterId}/answer`), { answer });
}

/** ✅ 작가: 답장 삭제 */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  await http.delete(apiPath(`/fanletters/${fanLetterId}/answer`));
}
