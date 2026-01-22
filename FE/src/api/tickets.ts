// FE/src/api/tickets.ts
export type ExhibitionCreateRequest = {
  title: string;
  place: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  posterUrl?: string;
  description?: string;
};

export type ExhibitionCreateResponse = {
  ticket_code: string;
  exhibition_id?: string | number;
};

export type ExhibitionByCodeResponse = {
  ticket_code: string;
  title: string;
  place: string;
  startDate: string;
  endDate: string;
  posterUrl?: string;
  description?: string;
  artistName?: string;
};

export type RedeemTicketRequest = {
  ticket_code: string;
  memo?: string;
  visitedAt?: string; // YYYY-MM-DD
  visibility?: "private" | "public";
};

export type RedeemTicketResponse = {
  collect_book_id?: string | number;
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""; // 예: "https://i14e107.p.ssafy.io:8000"

// ✅ 여기 3개만 실제 백엔드 명세에 맞춰 교체
const ENDPOINTS = {
  CREATE_EXHIBITION_TICKET: "/api/v1/exhibitions",            // POST: 전시 생성 + ticket_code 발급
  GET_EXHIBITION_BY_CODE: (code: string) => `/api/v1/exhibitions/by-code/${encodeURIComponent(code)}`, // GET
  REDEEM_TICKET: "/api/v1/collectbook",                       // POST: 유저 티켓북 등록
};

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include", // 프로젝트 인증 정책에 맞게 필요 없으면 제거
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API Error: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function createExhibitionTicket(payload: ExhibitionCreateRequest) {
  return request<ExhibitionCreateResponse>(`${BASE_URL}${ENDPOINTS.CREATE_EXHIBITION_TICKET}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getExhibitionByCode(ticketCode: string) {
  return request<ExhibitionByCodeResponse>(`${BASE_URL}${ENDPOINTS.GET_EXHIBITION_BY_CODE(ticketCode)}`, {
    method: "GET",
  });
}

export async function redeemTicket(payload: RedeemTicketRequest) {
  return request<RedeemTicketResponse>(`${BASE_URL}${ENDPOINTS.REDEEM_TICKET}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
