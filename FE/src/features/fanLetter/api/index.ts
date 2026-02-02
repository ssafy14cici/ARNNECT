// FE/src/features/fanLetter/api/index.ts
import type {
  FanLetter,
  FanLetterId,
  FanLetterSendInput,
  FanLetterSendPayload,
} from "../types";

import * as mock from "./mock";
import * as real from "./real";

// feed/posts랑 동일한 정책으로 맞춤
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.DEV;

/** 레거시 필드명까지 받아서 표준 payload로 정규화 */
function normalizeSendInput(input: FanLetterSendInput): FanLetterSendPayload {
  const fromNickname =
    (input.fromNickname ?? "").trim() ||
    (input.senderName ?? "").trim() ||
    "익명";

  const artworkName =
    (input.artworkName ?? "").trim() ||
    (input.artworkTitle ?? "").trim() ||
    undefined;

  return {
    artistMemberUuid: input.artistMemberUuid,
    artworkId: input.artworkId,
    artworkName,
    fromNickname,
    content: input.content,
    senderId: input.senderId,
    artistName: input.artistName,
  };
}

/** ✅ 팬레터 발송(관람자) */
export async function sendFanLetter(input: FanLetterSendInput) {
  const payload = normalizeSendInput(input);
  return USE_MOCK ? mock.sendFanLetter(payload) : real.sendFanLetter(payload);
}

/** ✅ 작가: 받은 팬레터 전체 조회 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  return USE_MOCK
    ? mock.fetchArtistFanLetters(artistMemberUuid)
    : real.fetchArtistFanLetters(artistMemberUuid);
}

/** ✅ 작가: 답장 등록 */
export async function createFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  return USE_MOCK
    ? mock.createFanLetterAnswer(fanLetterId, answer)
    : real.createFanLetterAnswer(fanLetterId, answer);
}

/** ✅ 작가: 답장 수정 */
export async function updateFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  return USE_MOCK
    ? mock.updateFanLetterAnswer(fanLetterId, answer)
    : real.updateFanLetterAnswer(fanLetterId, answer);
}

/** ✅ 작가: 답장 삭제 */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  return USE_MOCK
    ? mock.deleteFanLetterAnswer(fanLetterId)
    : real.deleteFanLetterAnswer(fanLetterId);
}
