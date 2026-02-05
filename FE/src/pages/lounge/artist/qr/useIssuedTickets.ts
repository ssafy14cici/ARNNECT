// FE/src/pages/lounge/artist/qr/useIssuedTickets.ts
import { useCallback, useState } from "react";
import {
  deleteTicket,
  listTicketsByArtist,
  type TicketInfoResponse,
} from "../../../../features/tickets/api/realTickets";

export type TicketDesign = "BASIC" | "MODERN" | "MINIMAL";

export type TicketItem = {
  ticketId: number;
  ticketCode: string;

  title: string;
  address: string;
  addressDetail?: string;

  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;

  qrImageName: string;
  ticketImageName: string;

  ticketDesign: TicketDesign; // 서버 미지원이면 로컬 유지
};

const KEY_DESIGN_MAP = "arnnect_ticket_design_v1";
type DesignMap = Record<string, TicketDesign>;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function loadDesignMap(): DesignMap {
  return safeParse<DesignMap>(localStorage.getItem(KEY_DESIGN_MAP), {});
}
function saveDesignMap(map: DesignMap) {
  localStorage.setItem(KEY_DESIGN_MAP, JSON.stringify(map));
}

export function rememberDesign(code: string, design: TicketDesign) {
  if (!code) return;
  const map = loadDesignMap();
  map[code] = design;
  saveDesignMap(map);
}
export function forgetDesign(code: string) {
  if (!code) return;
  const map = loadDesignMap();
  if (!(code in map)) return;
  delete map[code];
  saveDesignMap(map);
}

const hhmm = (t?: string) => (t ? String(t).slice(0, 5) : "");

/**
 * removeIssued 오버로드:
 * - removeIssued(ticketItem)
 * - removeIssued(ticketId)
 * - removeIssued(ticketId, ticketCode)
 */
type RemoveIssuedFn = {
  (t: TicketItem): Promise<void>;
  (ticketId: number, ticketCode?: string): Promise<void>;
};

export function useIssuedTickets(artistUuid: string) {
  const [issued, setIssued] = useState<TicketItem[]>([]);

  const reloadIssued = useCallback(async () => {
    // ✅ artistUuid 없으면 호출 스킵(로그인 전/하이드레이션 전)
    if (!artistUuid) {
      setIssued([]);
      return;
    }

    const designMap = loadDesignMap();
    const list = await listTicketsByArtist(artistUuid);
    const arr = Array.isArray(list) ? (list as TicketInfoResponse[]) : [];

    const normalized = arr
      .slice()
      .sort((a, b) => Number(b.ticketId) - Number(a.ticketId))
      .map((x) => {
        const ticketDesign = designMap[x.ticketCode] ?? "BASIC";
        return {
          ticketId: x.ticketId,
          ticketCode: x.ticketCode,
          title: x.title,
          address: x.address,
          addressDetail: x.addressDetail,
          startDate: x.startDate,
          endDate: x.endDate,
          startTime: hhmm(x.startTime),
          endTime: hhmm(x.endTime),
          qrImageName: x.qrImageName,
          ticketImageName: x.ticketImageName,
          ticketDesign,
        } satisfies TicketItem;
      });

    setIssued(normalized);
  }, [artistUuid]);

  const removeIssued = useCallback(
    (async (arg1: TicketItem | number, arg2?: string) => {
      // ✅ artistUuid 없으면 삭제도 막는게 안전
      if (!artistUuid) return;

      let ticketId: number;
      let ticketCode = "";

      if (typeof arg1 === "number") {
        ticketId = arg1;
        ticketCode = arg2 ?? issued.find((it) => it.ticketId === ticketId)?.ticketCode ?? "";
      } else {
        ticketId = arg1.ticketId;
        ticketCode = arg1.ticketCode;
      }

      await deleteTicket(ticketId);

      if (ticketCode) forgetDesign(ticketCode);

      await reloadIssued();
    }) as RemoveIssuedFn,
    [artistUuid, issued, reloadIssued],
  );

  return { issued, reloadIssued, removeIssued };
}
