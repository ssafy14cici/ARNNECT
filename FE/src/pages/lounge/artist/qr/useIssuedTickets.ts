// FE/src/pages/lounge/artist/qr/useIssuedTickets.ts
import { useCallback, useState } from "react";
import { deleteTicket, listTicketsByArtist, type TicketInfoResponse } from "../../../../features/tickets/api/realTickets";

export type TicketDesign = "BASIC" | "MODERN" | "MINIMAL" | "HOLO_ABSTRACT" | "SIMPLE" | "PURPLE" | "PINK" | "RED";

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

const hhmm = (t?: string) => (t ? String(t).slice(0, 5) : "");

function pickString(obj: any, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v) return v;
  }
  return fallback;
}

// ✅ artistUuid를 optional로 받고, 없으면 절대 크래시 안 나게 가드
export function useIssuedTickets(artistUuid?: string) {
  const [issued, setIssued] = useState<TicketItem[]>([]);

  const reloadIssued = useCallback(async () => {
    if (!artistUuid) {
      // artistUuid 없으면 그냥 빈 배열로
      setIssued([]);
      return;
    }

    const designMap = loadDesignMap();

    const list = await listTicketsByArtist(artistUuid);
    const arr = Array.isArray(list) ? (list as TicketInfoResponse[]) : [];

    const normalized = arr
      .slice()
      .sort((a, b) => Number((b as any).ticketId) - Number((a as any).ticketId))
      .map((x: any) => {
        const ticketCode = pickString(x, ["ticketCode", "code"], "");
        const ticketDesign = designMap[ticketCode] ?? "BASIC";

        return {
          ticketId: Number(x.ticketId),
          ticketCode,
          title: pickString(x, ["title"], ""),
          address: pickString(x, ["address"], ""),
          addressDetail: pickString(x, ["addressDetail"], ""),

          startDate: pickString(x, ["startDate"], ""),
          endDate: pickString(x, ["endDate"], ""),
          startTime: hhmm(pickString(x, ["startTime"], "")),
          endTime: hhmm(pickString(x, ["endTime"], "")),

          // ✅ BE 필드명이 다른 경우도 대비(없으면 "")
          qrImageName: pickString(x, ["qrImageName", "qrImgName", "qrImage"], ""),
          ticketImageName: pickString(x, ["ticketImageName", "ticketImgName", "ticketImage"], ""),

          ticketDesign,
        } satisfies TicketItem;
      });

    setIssued(normalized);
  }, [artistUuid]);

  const removeIssued = useCallback(
    async (t: TicketItem) => {
      await deleteTicket(t.ticketId);
      forgetDesign(t.ticketCode);
      await reloadIssued();
    },
    [reloadIssued],
  );

  return { issued, reloadIssued, removeIssued };
}
