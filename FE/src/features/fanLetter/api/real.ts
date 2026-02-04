//FE\src\features\fanLetter\api\real.ts
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

function mapRawToFanLetter(raw: FanLetterRaw): FanLetter {
  const id = Number.isFinite(raw.fanLetterId as number)
    ? (raw.fanLetterId as number)
    : (raw.id as number);

  const nickname = asString(raw.nickname, "User");
  const content = asString(raw.content, "");

  const createdAt = asString(raw.createdAt, "") || asString(raw.date, "");
  const answer = raw.answer ?? undefined;

  const answered =
    typeof raw.answered === "boolean"
      ? raw.answered
      : typeof raw.isAnswered === "boolean"
        ? raw.isAnswered
        : Boolean(answer && String(answer).trim().length > 0);

  return {
    id: Number(id),
    fromNickname: nickname,
    question: content,
    createdAt,
    artworkId: raw.artworkId,
    artworkName: raw.artworkName,
    isAnswered: answered,
    answer: answer ? String(answer) : undefined,
  };
}

/** ✅ 팬레터 발송 (BE: FanLetterRequest) */
export async function sendFanLetter(payload: FanLetterSendPayload): Promise<void> {
  await http.post(apiPath("/fanletters"), {
    memberUuid: payload.memberUuid, // ✅ BE 키
    title: payload.title,           // ✅ BE 키
    content: payload.content,
    artworkId: payload.artworkId,
  });
}

/** ✅ 작가: 받은 팬레터 전체 조회 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  const res = await http.get(apiPath("/fanletters/all"), { params: { artist: artistMemberUuid } });

  // axios면 res.data가 실제 body
  const body = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;

  const maybe = unwrapEnvelope<unknown>(body);
  const raws = unwrapEnvelope<FanLetterRaw[]>(maybe) ?? [];

  if (!Array.isArray(raws)) return [];
  return raws.map(mapRawToFanLetter);
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
