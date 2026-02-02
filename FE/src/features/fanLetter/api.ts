// FE/src/features/fanLetter/api.ts
import { http } from "../../shared/api/http";
import type {
  ApiEnvelope,
  FanLetter,
  FanLetterAnswerRequest,
  FanLetterId,
  FanLetterRaw,
  FanLetterSendInput,
  FanLetterSendPayload,
} from "./types";

// ✅ 레거시 호환: 기존 코드가 FanLetterCreateReq를 import해도 깨지지 않게 alias 제공
export type FanLetterCreateReq = FanLetterSendInput;

const USE_MOCK =
  String((import.meta as any).env?.VITE_USE_MOCK) === "true" || Boolean((import.meta as any).env?.DEV);

const KEY = "arnnect_mock_fanletters_v1";

// ---------- utils ----------
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function toYMD(iso = nowISO()) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------- pubsub (mock 갱신용) ----------
const listeners = new Set<() => void>();

export function subscribeFanLettersUpdated(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach((fn) => fn());
}

// ---------- normalize ----------
function normalizeSendInput(input: FanLetterSendInput): FanLetterSendPayload {
  const artistMemberUuid = (input.artistMemberUuid ?? "").trim();
  if (!artistMemberUuid) throw new Error("artistMemberUuid is required");

  const fromNickname = (input.fromNickname ?? input.senderName ?? "").trim() || "익명";
  const artworkName = (input.artworkName ?? input.artworkTitle ?? "").trim();

  const content = (input.content ?? "").trim();
  if (!content) throw new Error("content is required");

  return {
    artistMemberUuid,
    artworkId: input.artworkId,
    artworkName: artworkName || undefined,
    fromNickname,
    content,
    senderId: input.senderId,
    artistName: input.artistName,
  };
}

// ---------- raw -> view ----------
function toFanLetter(raw: FanLetterRaw): FanLetter {
  return {
    id: raw.fanLetterId,
    fromNickname: raw.nickname,
    question: raw.content,
    createdAt: raw.date,
    artworkId: raw.artworkId,
    artworkName: raw.artworkName,
    isAnswered: raw.answered,
    answer: raw.answer,
  };
}

// ---------- mock store ----------
function loadAll(): FanLetterRaw[] {
  return safeParse<FanLetterRaw[]>(localStorage.getItem(KEY), []);
}
function saveAll(items: FanLetterRaw[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
function nextId(items: FanLetterRaw[]): number {
  const max = items.reduce((acc, cur) => Math.max(acc, cur.fanLetterId), 0);
  return max + 1;
}

// ---------- APIs ----------
/** (artist) 특정 작가의 팬레터 목록 */
export async function listFanLettersForArtist(artistMemberUuid: string): Promise<FanLetter[]> {
  if (USE_MOCK) {
    const all = loadAll();
    return all
      .filter((x) => x.artistMemberUuid === artistMemberUuid)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map(toFanLetter);
  }

  const res = await http.get<ApiEnvelope<FanLetterRaw[]>>(`/fanletters/all`, {
    params: { artist: artistMemberUuid },
  });

  const raws = res?.data?.data ?? [];
  return (raws ?? []).map(toFanLetter);
}

/** (user) 팬레터 발송 */
export async function sendFanLetter(input: FanLetterSendInput): Promise<FanLetterId | void> {
  const payload = normalizeSendInput(input);

  if (USE_MOCK) {
    const all = loadAll();
    const id = nextId(all);

    const raw: FanLetterRaw = {
      fanLetterId: id,
      artworkId: payload.artworkId,
      artworkName: payload.artworkName,
      nickname: payload.fromNickname,
      content: payload.content,
      date: toYMD(nowISO()),
      answered: false,
      answer: undefined,
      artistMemberUuid: payload.artistMemberUuid,
    };

    saveAll([raw, ...all]);
    emit();
    return id;
  }

  await http.post(`/fanletters`, {
    artistMemberUuid: payload.artistMemberUuid,
    artworkId: payload.artworkId,
    artworkName: payload.artworkName,
    nickname: payload.fromNickname,
    content: payload.content,
  });

  return;
}

/** (artist) 팬레터 답변 */
export async function answerFanLetter(fanLetterId: number, req: FanLetterAnswerRequest): Promise<void> {
  const answer = (req.answer ?? "").trim();
  if (!answer) throw new Error("answer is required");

  if (USE_MOCK) {
    const all = loadAll();
    const next = all.map((x) =>
      x.fanLetterId === fanLetterId ? { ...x, answered: true, answer } : x,
    );
    saveAll(next);
    emit();
    return;
  }

  await http.post(`/fanletters/${fanLetterId}/answer`, { answer });
}
