// FE/src/features/tickets/api/realTickets.ts
import { http } from "../../../shared/api/http";

export type CollectBookResponse = {
  artistUuid: string;
  ticketCode: string;
  collectRank: number;
  title: string;
  address: string;
  addressDetail?: string;

  // JSON 직렬화 결과는 보통 string으로 옴
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
  createdAt: string; // ISO or "YYYY-MM-DDTHH:mm:ss..."

  qrImageUrl: string;     // ✅ URL
  ticketImageUrl: string; // ✅ URL
};


export type TicketInfoResponse = {
  ticketId: number;
  ticketCode: string;
  title: string;
  address: string;
  addressDetail?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  startTime: string; // HH:mm:ss or HH:mm
  endTime: string; // HH:mm:ss or HH:mm
  qrImageName: string;
  ticketImageName: string;
};

// 서버가 Envelope({success, data})로 감싸는 경우까지 대응
function unwrap<T>(x: any): T {
  if (x && typeof x === "object" && "data" in x) return x.data as T;
  if (x && typeof x === "object" && "result" in x) return x.result as T;
  return x as T;
}

export async function createTicket(fd: FormData) {
  const res = await http.post("/api/v1/tickets", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap<TicketInfoResponse>(res.data);
}

export async function updateTicket(ticketId: number, fd: FormData) {
  const res = await http.put(`/api/v1/tickets/${ticketId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap<TicketInfoResponse>(res.data);
}

export async function deleteTicket(ticketId: number) {
  const res = await http.delete(`/api/v1/tickets/${ticketId}`);
  return unwrap<any>(res.data);
}

export async function listTicketsByArtist(artistUuid: string) {
  const res = await http.get(`/api/v1/tickets`, { params: { artist: artistUuid } });
  return unwrap<TicketInfoResponse[]>(res.data);
}

/** ✅ (추가) QR 스캔 등록: GET /api/v1/tickets/ticket-scan?ticket=... */
export async function scanTicket(ticketCode: string) {
  const res = await http.get(`/api/v1/tickets/ticket-scan`, { params: { ticket: ticketCode } });
  return unwrap<any>(res.data);
}

export async function listCollectBook(memberUuid: string) {
  const res = await http.get(`/api/v1/tickets/list/${encodeURIComponent(memberUuid)}`);
  return unwrap<CollectBookResponse[]>(res.data);
}

/** ✅ (추가) 티켓 수: GET /api/v1/tickets/{memberUuid}/count */
export async function countTickets(memberUuid: string) {
  const res = await http.get(`/api/v1/tickets/${encodeURIComponent(memberUuid)}/count`);
  return unwrap<number>(res.data);
}

/**
 * ✅ (선택) 티켓 코드로 조회가 BE에 있으면 사용
 * - 없으면 호출부에서 try/catch로 무시하면 됨
 */
export async function getTicketByCode(ticketCode: string) {
  const res = await http.get(`/api/v1/tickets/${encodeURIComponent(ticketCode)}`);
  return unwrap<TicketInfoResponse>(res.data);
}
