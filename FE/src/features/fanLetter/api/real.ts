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

function unwrapEnvelope<T>(raw: unknown): T {
  // axios res.data가 envelope일 수도, 그냥 데이터일 수도 있음
  if (isObject(raw) && "data" in raw) return (raw as ApiEnvelope<T>).data as T;
  return raw as T;
}

function mapRawToFanLetter(raw: FanLetterRaw): FanLetter {
  return {
    id: raw.fanLetterId,
    fromNickname: raw.nickname,
    question: raw.content,
    createdAt: raw.date,
    artworkId: raw.artworkId,
    artworkName: raw.artworkName,
    isAnswered: Boolean(raw.answered),
    answer: raw.answer,
  };
}

/** ✅ 팬레터 발송 */
export async function sendFanLetter(payload: FanLetterSendPayload): Promise<void> {
  // http baseURL이 /api/v1 포함인 구조를 가정: /fanletters
  await http.post("/fanletters", {
    artistMemberUuid: payload.artistMemberUuid,
    artworkId: payload.artworkId,
    content: payload.content,
  });
}

/** ✅ 작가: 받은 팬레터 전체 조회 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  const res = await http.get("/fanletters/all", { params: { artist: artistMemberUuid } });

  // res.data 가 envelope일 수도/아닐 수도
  const maybe = unwrapEnvelope<unknown>(res?.data);
  const raws = unwrapEnvelope<FanLetterRaw[]>(maybe) ?? [];

  if (!Array.isArray(raws)) return [];
  return raws.map(mapRawToFanLetter);
}

/** ✅ 작가: 답장 등록 */
export async function createFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  await http.post(`/fanletters/${fanLetterId}/answer`, { answer });
}

/** ✅ 작가: 답장 수정 */
export async function updateFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  await http.put(`/fanletters/${fanLetterId}/answer`, { answer });
}

/** ✅ 작가: 답장 삭제 */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  await http.delete(`/fanletters/${fanLetterId}/answer`);
}
