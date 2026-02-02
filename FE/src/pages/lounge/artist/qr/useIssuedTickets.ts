//FE\src\pages\lounge\artist\qr\useIssuedTickets.ts

import { useCallback, useState } from "react";
import {
  deleteExhibitionByCode,
  listIssuedExhibitions,
  type ExhibitionByCodeResponse,
} from "../../../../features/tickets/api";

export type TicketDesign = "BASIC" | "MODERN" | "MINIMAL";

export type TicketItem = {
  title: string;
  address: string;        // = place
  addressDetail: string;  // mock에 저장된 경우만 표시

  startDate: string;
  endDate: string;

  startTime: string; // mock에 저장된 경우만 표시
  endTime: string;

  ticketCode: string;

  posterUrl?: string;
  description?: string;

  image?: string;

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

export function normalizeImageToSrc(image?: string | null) {
  if (!image) return "";
  if (image.startsWith("data:image/")) return image;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("PHN2Zy")) return `data:image/svg+xml;base64,${image}`;
  return `data:image/png;base64,${image}`;
}

const toStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export function useIssuedTickets() {
  const [issued, setIssued] = useState<TicketItem[]>([]);

  const reloadIssued = useCallback(async () => {
    const designMap = loadDesignMap();

    const list = await listIssuedExhibitions();
    const arr = Array.isArray(list) ? (list as ExhibitionByCodeResponse[]) : [];

    const normalized = arr.map((x) => {
      const anyX = x as any; // mock에 추가 필드 들어올 수 있어서 허용

      const code = toStr(anyX.ticket_code ?? anyX.ticketCode);
      const address = toStr(anyX.place ?? anyX.address);
      const addressDetail = toStr(anyX.addressDetail ?? anyX.address_detail);

      const startTime = toStr(anyX.startTime);
      const endTime = toStr(anyX.endTime);

      const image = anyX.image ? toStr(anyX.image) : undefined;

      const ticketDesign =
        (anyX.ticketDesign as TicketDesign | undefined) ??
        (anyX.ticket_design as TicketDesign | undefined) ??
        designMap[code] ??
        "BASIC";

      return {
        title: toStr(anyX.title),
        address,
        addressDetail,
        startDate: toStr(anyX.startDate),
        endDate: toStr(anyX.endDate),
        startTime,
        endTime,
        ticketCode: code,
        posterUrl: typeof anyX.posterUrl === "string" ? anyX.posterUrl : undefined,
        description: typeof anyX.description === "string" ? anyX.description : undefined,
        image,
        ticketDesign,
      } satisfies TicketItem;
    });

    setIssued(normalized);
  }, []);

  const removeIssued = useCallback(
    async (code: string) => {
      await deleteExhibitionByCode(code);
      forgetDesign(code);
      await reloadIssued();
    },
    [reloadIssued]
  );

  return { issued, reloadIssued, removeIssued };
}
