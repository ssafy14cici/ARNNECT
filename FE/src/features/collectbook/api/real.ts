// FE/src/features/collectbook/api/real.ts
import { http } from "../../../shared/api/http";
import type { CollectBookResponse } from "../../tickets/api/realTickets";

type AnyObj = Record<string, any>;

function unwrap<T>(v: any): T {
  if (v && typeof v === "object") {
    if ("data" in v) return (v as AnyObj).data as T;
    if ("result" in v) return (v as AnyObj).result as T;
  }
  return v as T;
}

/** ✅ 회원 qr등록(스캔) */
export async function apiTicketScan(ticketCode: string): Promise<void> {
  // BE: ResponseEntity<Void>
  await http.get(`/api/v1/tickets/ticket-scan`, { params: { ticket: ticketCode } });
}

/** ✅ 콜렉트북 리스트 (BE: List<CollectBookResponse>) */
export async function apiCollectBookList(memberUuid: string): Promise<CollectBookResponse[]> {
  const res = await http.get(`/api/v1/tickets/list/${encodeURIComponent(memberUuid)}`);
  return unwrap<CollectBookResponse[]>(res.data);
}
