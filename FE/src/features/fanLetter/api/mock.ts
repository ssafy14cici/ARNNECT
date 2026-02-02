// FE/src/features/fanLetter/api/mock.ts
import type {
  FanLetter,
  FanLetterId,
  FanLetterRaw,
  FanLetterSendPayload,
} from "../types";

const KEY = "arnnect_mock_fanletters_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeAll(list: FanLetterRaw[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function readAll(): FanLetterRaw[] {
  return safeParse<FanLetterRaw[]>(localStorage.getItem(KEY), []);
}

function uidNum(): number {
  // FanLetterId가 number라서 mock은 number로 생성
  return Math.floor(Date.now() + Math.random() * 1000);
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

/** 관람자: 팬레터 발송(로컬 저장) */
export async function sendFanLetter(input: FanLetterSendPayload) {
  const all = readAll();

  const row: FanLetterRaw = {
    fanLetterId: uidNum(),
    artistMemberUuid: input.artistMemberUuid,
    artworkId: input.artworkId,
    artworkName: input.artworkName,
    nickname: input.fromNickname,
    content: input.content,
    date: new Date().toISOString(),
    answered: false,
    answer: undefined,
  };

  writeAll([row, ...all]);
  return { ok: true, id: row.fanLetterId };
}

/** 작가: 받은 팬레터 전체 조회(artist로 필터) */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  const all = readAll();
  return all
    .filter((x) => x.artistMemberUuid === artistMemberUuid)
    .map(mapRawToFanLetter);
}

function updateRow(fanLetterId: FanLetterId, patch: Partial<FanLetterRaw>) {
  const all = readAll();
  const next = all.map((x) =>
    x.fanLetterId === fanLetterId ? { ...x, ...patch } : x,
  );
  writeAll(next);
}

/** 작가: 답장 등록 */
export async function createFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  updateRow(fanLetterId, { answered: true, answer });
}

/** 작가: 답장 수정 */
export async function updateFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  updateRow(fanLetterId, { answered: true, answer });
}

/** 작가: 답장 삭제 */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  updateRow(fanLetterId, { answered: false, answer: undefined });
}
