// FE/src/pages/lounge/artist/qr/useIssuedTickets.ts
import { useCallback, useState } from "react";
import { useAuthStore } from "../../../../features/auth/store";
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
  addressDetail: string;

  startDate: string;
  endDate: string;

  startTime: string;
  endTime: string;

  qrImageName?: string;
  ticketImageName?: string;

  ticketDesign: TicketDesign;
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

const toStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export function useIssuedTickets() {
  const [issued, setIssued] = useState<TicketItem[]>([]);
  const me = useAuthStore((s) => s.user);
  const artistUuid = me?.memberUuid ?? "";

  const reloadIssued = useCallback(async () => {
    if (!artistUuid) {
      setIssued([]);
      return;
    }

    const designMap = loadDesignMap();
    const list = await listTicketsByArtist(artistUuid);
    const arr = Array.isArray(list) ? (list as TicketInfoResponse[]) : [];

    const normalized = arr.map((x) => {
      const code = toStr(x.ticketCode);

      const ticketDesign = designMap[code] ?? "BASIC";

      return {
        ticketId: Number(x.ticketId),
        ticketCode: code,
        title: toStr(x.title),
        address: toStr(x.address),
        addressDetail: toStr(x.addressDetail),
        startDate: toStr(x.startDate),
        endDate: toStr(x.endDate),
        startTime: toStr(x.startTime),
        endTime: toStr(x.endTime),
        qrImageName: toStr(x.qrImageName) || undefined,
        ticketImageName: toStr(x.ticketImageName) || undefined,
        ticketDesign,
      } satisfies TicketItem;
    });

    setIssued(normalized);
  }, [artistUuid]);

  const removeIssued = useCallback(
    async (ticketId: number, ticketCode?: string) => {
      await deleteTicket(ticketId);
      if (ticketCode) forgetDesign(ticketCode);
      await reloadIssued();
    },
    [reloadIssued],
  );

  return { issued, reloadIssued, removeIssued };
}
