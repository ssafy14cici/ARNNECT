// FE/src/features/fanLetter/api/real.ts
import { http } from "../../../shared/api/http";
import type {
  ApiEnvelope,
  FanLetter,
  FanLetterAnswerRequest,
  FanLetterId,
  FanLetterRaw,
  FanLetterSendPayload,
} from "../types";

const PREFIX = "/api/v1/fanletters";

// axios 응답 body가 { data } envelope일 수도/아닐 수도 있어서 처리
function unwrap<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in (body as any)) {
    return ((body as ApiEnvelope<T>).data ?? body) as T;
  }
  return body as T;
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

/**
 * 관람자: 팬레터 발송
 * ⚠️ 바디 필드는 BE랑 최종 확인 필요(명세 표에 request body가 없어서)
 * 현재는 "합리적 추정"으로 작성:
 * { artistMemberUuid, artworkId, artworkName, nickname, content }
 */
export async function sendFanLetter(input: FanLetterSendPayload) {
  const body = {
    artistMemberUuid: input.artistMemberUuid,
    artworkId: input.artworkId,
    artworkName: input.artworkName,
    nickname: input.fromNickname,
    content: input.content,
  };

  const res = await http.post(PREFIX, body, { withCredentials: true });
  return unwrap(res.data);
}

/** 작가: 받은 팬레터 전체 조회 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  const res = await http.get(`${PREFIX}/all`, {
    params: { artist: artistMemberUuid },
    withCredentials: true,
  });

  const rawList = unwrap<FanLetterRaw[]>(res.data) ?? [];
  return rawList.map(mapRawToFanLetter);
}

/** 작가: 답장 등록 */
export async function createFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  const body: FanLetterAnswerRequest = { answer };
  await http.post(`${PREFIX}/${fanLetterId}/answer`, body, { withCredentials: true });
}

/** 작가: 답장 수정 */
export async function updateFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  const body: FanLetterAnswerRequest = { answer };
  await http.put(`${PREFIX}/${fanLetterId}/answer`, body, { withCredentials: true });
}

/** 작가: 답장 삭제 */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  await http.delete(`${PREFIX}/${fanLetterId}/answer`, { withCredentials: true });
}
