// FE/src/features/collectbook/api/real.ts
import { http } from "../../../shared/api/http";
import type { TicketInfoResponse } from "../../tickets/api/realTickets";

type AnyObj = Record<string, any>;

function unwrap<T>(v: any): T {
  if (v && typeof v === "object") {
    if ("data" in v) return (v as AnyObj).data as T;
    if ("result" in v) return (v as AnyObj).result as T;
  }
  return v as T;
}

/** ✅ 회원 qr등록(스캔) */
export async function apiTicketScan(ticketCode: string) {
  const res = await http.get(`/api/v1/tickets/ticket-scan`, { params: { ticket: ticketCode } });
  return unwrap<any>(res.data);
}

/** ✅ 콜렉트북 리스트 */
export async function apiCollectBookList(memberUuid: string) {
  const res = await http.get(`/api/v1/tickets/list/${encodeURIComponent(memberUuid)}`);
  return unwrap<TicketInfoResponse[]>(res.data);
}
