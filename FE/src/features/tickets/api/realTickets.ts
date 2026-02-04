// FE/src/features/tickets/api/realTickets.ts
import { http } from "../../../shared/api/http";

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
