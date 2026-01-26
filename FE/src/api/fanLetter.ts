import type {
  ApiEnvelope,
  FanLetter,
  FanLetterAnswerRequest,
  FanLetterId,
  FanLetterRaw,
} from "../types/fanLetter";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""; // 예: "https://i14e107.p.ssafy.io:8000"
const PREFIX = "/api/v1/fanletters";

/**
 * Cookie 기반 인증(명세: HttpOnly Cookie) 대응을 위해 기본적으로 credentials 포함
 * 토큰 헤더가 필요하면 init.headers에 추가하면 됨.
 */
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  // 204/빈 바디 방어
  const text = await res.text().catch(() => "");
  if (!text) return undefined as T;

  const json = JSON.parse(text) as unknown;

  // 대부분 { ..., data } 래핑. 래핑 없을 가능성도 고려.
  if (json && typeof json === "object" && "data" in (json as any)) {
    return (json as ApiEnvelope<T>).data as T;
  }
  return json as T;
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

/** 작가가 받은 팬레터 전체 조회 */
export async function fetchArtistFanLetters(artistMemberUuid: string): Promise<FanLetter[]> {
  const data = await apiFetch<FanLetterRaw[]>(`${PREFIX}/all?artist=${encodeURIComponent(artistMemberUuid)}`);
  return (data ?? []).map(mapRawToFanLetter);
}

/** 답장 등록(미답변 → 답변완료) */
export async function createFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  const body: FanLetterAnswerRequest = { answer };
  // 응답에 data 없음(명세) → void 처리
  await apiFetch<void>(`${PREFIX}/${fanLetterId}/answer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** 답장 수정(답변완료 상태) */
export async function updateFanLetterAnswer(fanLetterId: FanLetterId, answer: string): Promise<void> {
  const body: FanLetterAnswerRequest = { answer };
  await apiFetch<void>(`${PREFIX}/${fanLetterId}/answer`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** 답장 삭제(답변완료 → 미답변) */
export async function deleteFanLetterAnswer(fanLetterId: FanLetterId): Promise<void> {
  await apiFetch<void>(`${PREFIX}/${fanLetterId}/answer`, {
    method: "DELETE",
  });
}
