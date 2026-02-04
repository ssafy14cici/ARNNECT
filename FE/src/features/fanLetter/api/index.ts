import type {
  FanLetter,
  FanLetterId,
  FanLetterSendInput,
  FanLetterSendPayload,
} from "../types";

import * as real from "./real";

/** 레거시 입력까지 받아서 최소 payload로 정규화 */
function normalizeSendInput(input: FanLetterSendInput): FanLetterSendPayload {
  const artistMemberUuid = String(input.artistMemberUuid ?? "").trim();
  if (!artistMemberUuid) throw new Error("artistMemberUuid is required");

  const content = String(input.content ?? "").trim();
  if (!content) throw new Error("content is required");

  return {
    artistMemberUuid,
    artworkId: input.artworkId,
    content,
  };
}

/** ✅ 팬레터 발송(관람자) */
export async function sendFanLetter(input: FanLetterSendInput): Promise<void> {
  const payload = normalizeSendInput(input);
  return real.sendFanLetter(payload);
}

/** ✅ 작가: 받은 팬레터 전체 조회 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  return real.fetchArtistFanLetters(artistMemberUuid);
}

/** ✅ 작가: 답장 등록 */
export async function createFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  return real.createFanLetterAnswer(fanLetterId, answer);
}

/** ✅ 작가: 답장 수정 */
export async function updateFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  return real.updateFanLetterAnswer(fanLetterId, answer);
}

/** ✅ 작가: 답장 삭제 */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  return real.deleteFanLetterAnswer(fanLetterId);
}
