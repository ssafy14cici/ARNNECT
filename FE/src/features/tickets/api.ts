// FE/src/features/tickets/api.ts
import { addCollectBookItem } from "../collectbook/storage";

export type FeeType = "free" | "paid";

export type ExhibitionCreateRequest = {
  title: string;
  place: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  feeType: FeeType;
  price?: number;
  durationMinutes?: number;
  posterUrl?: string;
  description?: string;
};

export type ExhibitionCreateResponse = {
  ticket_code: string;
  exhibition_id?: string | number;
};

export type ExhibitionByCodeResponse = {
  ticket_code: string;
  exhibition_id?: string | number;

  title: string;
  place: string;
  startDate: string;
  endDate: string;

  feeType: FeeType;
  price?: number;
  durationMinutes?: number;

  posterUrl?: string;
  description?: string;

  artistName?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type ExhibitionUpdateRequest = Partial<
  Omit<ExhibitionCreateRequest, "title" | "place" | "startDate" | "endDate">
> &
  Partial<Pick<ExhibitionCreateRequest, "title" | "place" | "startDate" | "endDate">>;

export type RedeemTicketRequest = {
  ticket_code: string;
  memo?: string;
  visitedAt?: string; // YYYY-MM-DD
  visibility?: "private" | "public";
};

export type RedeemTicketResponse = {
  collect_book_id?: string | number;
};

// ----------------------------
// REAL API (나중에 붙일 때)
// ----------------------------

// ✅ .env 없어도 안전하게(=undefined.trim 방지)
const ENV = ((import.meta as any).env ?? {}) as Record<string, unknown>;
const RAW_BASE_URL = typeof ENV.VITE_API_BASE_URL === "string" ? (ENV.VITE_API_BASE_URL as string) : "";
const BASE_URL = RAW_BASE_URL.trim();

const RAW_USE_MOCK = typeof ENV.VITE_USE_MOCK === "string" ? (ENV.VITE_USE_MOCK as string) : undefined;

const getOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");
const ORIGIN = getOrigin();

// ✅ baseURL 비었거나, 실수로 프론트 origin 넣었거나, dev면 mock
const USE_MOCK =
  RAW_USE_MOCK === "true" ||
  !BASE_URL ||
  BASE_URL === ORIGIN ||
  BASE_URL.includes("localhost:5173") ||
  // Vite DEV 플래그(타입 미선언 환경에서도 안전하게)
  Boolean((import.meta as any).env?.DEV);

const ENDPOINTS = {
  CREATE_EXHIBITION_TICKET: "/api/v1/exhibitions", // POST
  GET_EXHIBITION_BY_CODE: (code: string) => `/api/v1/exhibitions/by-code/${encodeURIComponent(code)}`, // GET
  UPDATE_EXHIBITION_BY_CODE: (code: string) => `/api/v1/exhibitions/by-code/${encodeURIComponent(code)}`, // PATCH
  DELETE_EXHIBITION_BY_CODE: (code: string) => `/api/v1/exhibitions/by-code/${encodeURIComponent(code)}`, // DELETE
  REDEEM_TICKET: "/api/v1/collectbook", // POST
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API Error: ${res.status}`);
  }
  return (await res.json()) as T;
}

// ----------------------------
// MOCK DB (localStorage)
// ----------------------------
type StoredExhibition = ExhibitionByCodeResponse & { _version: 1 };

const KEY_EXHIBITIONS = "arnnect_mock_exhibitions_v1"; // map
const KEY_ISSUED_ORDER = "arnnect_mock_exhibitions_order_v1"; // ticket_code[]

function nowISO() {
  return new Date().toISOString();
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeTicketCode() {
  return `EXH_${makeId()}`;
}

function readMap(): Record<string, StoredExhibition> {
  const raw = localStorage.getItem(KEY_EXHIBITIONS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Record<string, StoredExhibition>;
    return {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, StoredExhibition>) {
  localStorage.setItem(KEY_EXHIBITIONS, JSON.stringify(map));
}

function readOrder(): string[] {
  const raw = localStorage.getItem(KEY_ISSUED_ORDER);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function writeOrder(list: string[]) {
  localStorage.setItem(KEY_ISSUED_ORDER, JSON.stringify(list));
}

// ----------------------------
// HELPERS (safe normalize)
// ----------------------------
const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const trimOpt = (v: unknown) => {
  const t = trimStr(v);
  return t ? t : undefined;
};
const toFeeType = (v: unknown): FeeType => (v === "paid" ? "paid" : "free");
const toNumber = (v: unknown) => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
};

// ✅ payload가 any로 들어와도 절대 undefined.trim() 안 나게
function normalizePayload(payload: unknown): ExhibitionCreateRequest {
  const p = (payload ?? {}) as Record<string, unknown>;

  // (구버전/다른 호출부 대비) place가 없으면 address로도 받아줌
  const title = trimStr(p.title);
  const place = trimStr(p.place ?? p.address);

  const startDate = trimStr(p.startDate);
  const endDate = trimStr(p.endDate);

  if (!title) throw new Error("전시 제목(title)이 비어있습니다.");
  if (!place) throw new Error("전시 장소(place)가 비어있습니다.");
  if (!startDate || !endDate) throw new Error("전시 기간(startDate/endDate)이 비어있습니다.");

  const feeType = toFeeType(p.feeType);

  const priceNum = toNumber(p.price);
  const price =
    feeType === "paid"
      ? Number.isFinite(priceNum)
        ? priceNum
        : 0
      : undefined;

  const durNum = toNumber(p.durationMinutes);
  const durationMinutes = Number.isFinite(durNum) ? durNum : undefined;

  return {
    title,
    place,
    startDate,
    endDate,
    feeType,
    price,
    durationMinutes,
    posterUrl: trimOpt(p.posterUrl),
    description: trimOpt(p.description),
  };
}

// ----------------------------
// PUBLIC API
// ----------------------------

/** 발급 목록(artist) */
export async function listIssuedExhibitions(): Promise<ExhibitionByCodeResponse[]> {
  if (!USE_MOCK) {
    throw new Error("listIssuedExhibitions: real API 미구현");
  }

  const map = readMap();
  const order = readOrder();

  const seen = new Set<string>();
  const codes: string[] = [];

  for (const c of order) {
    if (map[c]) {
      codes.push(c);
      seen.add(c);
    }
  }
  for (const c of Object.keys(map)) {
    if (!seen.has(c)) codes.push(c);
  }

  return codes
    .map((c) => map[c])
    .filter(Boolean)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** 전시 생성 + ticket_code 발급 */
export async function createExhibitionTicket(payload: ExhibitionCreateRequest) {
  // ✅ 여기서 undefined.trim 방지 + (place/address) 호환
  const normalized = normalizePayload(payload);

  if (!USE_MOCK) {
    return request<ExhibitionCreateResponse>(`${BASE_URL}${ENDPOINTS.CREATE_EXHIBITION_TICKET}`, {
      method: "POST",
      body: JSON.stringify(normalized),
    });
  }

  const ticket_code = makeTicketCode();
  const exhibition_id = makeId();
  const createdAt = nowISO();

  const stored: StoredExhibition = {
    _version: 1,
    ticket_code,
    exhibition_id,

    title: normalized.title,
    place: normalized.place,
    startDate: normalized.startDate,
    endDate: normalized.endDate,

    feeType: normalized.feeType,
    price: normalized.feeType === "paid" ? normalized.price ?? 0 : undefined,
    durationMinutes: normalized.durationMinutes,

    posterUrl: normalized.posterUrl,
    description: normalized.description,

    createdAt,
    updatedAt: createdAt,
  };

  const map = readMap();
  map[ticket_code] = stored;
  writeMap(map);

  const order = readOrder();
  writeOrder([ticket_code, ...order.filter((c) => c !== ticket_code)]);

  return { ticket_code, exhibition_id } satisfies ExhibitionCreateResponse;
}

/** ticket_code로 전시 조회 */
export async function getExhibitionByCode(ticketCode: string) {
  if (!USE_MOCK) {
    return request<ExhibitionByCodeResponse>(
      `${BASE_URL}${ENDPOINTS.GET_EXHIBITION_BY_CODE(ticketCode)}`,
      { method: "GET" },
    );
  }

  const map = readMap();
  const ex = map[ticketCode];
  if (!ex) throw new Error("전시 정보를 찾을 수 없습니다. (mock DB)");
  return ex satisfies ExhibitionByCodeResponse;
}

/** ticket_code는 그대로 두고, 전시 정보만 수정 */
export async function updateExhibitionByCode(ticketCode: string, patch: ExhibitionUpdateRequest) {
  if (!USE_MOCK) {
    return request<ExhibitionByCodeResponse>(
      `${BASE_URL}${ENDPOINTS.UPDATE_EXHIBITION_BY_CODE(ticketCode)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }

  const map = readMap();
  const current = map[ticketCode];
  if (!current) throw new Error("수정할 전시를 찾을 수 없습니다. (mock DB)");

  const merged: ExhibitionByCodeResponse = {
    ...current,
    ...patch,
    ticket_code: current.ticket_code,
    exhibition_id: current.exhibition_id,
    updatedAt: nowISO(),
  };

  const feeType = (merged.feeType ?? "free") as FeeType;
  merged.feeType = feeType;
  if (feeType === "paid") {
    merged.price = typeof merged.price === "number" ? merged.price : Number(merged.price ?? 0);
    if (!Number.isFinite(merged.price)) merged.price = 0;
  } else {
    merged.price = undefined;
  }

  merged.posterUrl = merged.posterUrl?.trim() || undefined;
  merged.description = merged.description?.trim() || undefined;
  merged.title = (merged.title ?? "").trim();
  merged.place = (merged.place ?? "").trim();

  map[ticketCode] = { ...(merged as StoredExhibition), _version: 1 };
  writeMap(map);

  return map[ticketCode] satisfies ExhibitionByCodeResponse;
}

/** 발급 삭제(artist) */
export async function deleteExhibitionByCode(ticketCode: string) {
  if (!USE_MOCK) {
    return request<{ ok: true }>(
      `${BASE_URL}${ENDPOINTS.DELETE_EXHIBITION_BY_CODE(ticketCode)}`,
      { method: "DELETE" },
    );
  }

  const map = readMap();
  if (map[ticketCode]) {
    delete map[ticketCode];
    writeMap(map);
  }

  const order = readOrder().filter((c) => c !== ticketCode);
  writeOrder(order);

  return { ok: true as const };
}

/** 유저 티켓북 등록 */
export async function redeemTicket(payload: RedeemTicketRequest) {
  if (!USE_MOCK) {
    return request<RedeemTicketResponse>(`${BASE_URL}${ENDPOINTS.REDEEM_TICKET}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  const ex = await getExhibitionByCode(payload.ticket_code);

  const item = addCollectBookItem({
    ticketCode: payload.ticket_code,
    exhibition: {
      title: ex.title,
      place: ex.place,
      startDate: ex.startDate,
      endDate: ex.endDate,
      posterUrl: ex.posterUrl,
      description: ex.description,
    },
    memo: payload.memo,
    visitedAt: payload.visitedAt ?? new Date().toISOString().slice(0, 10),
    visibility: payload.visibility ?? "private",
    scannedAt: new Date().toISOString(),
  });

  return { collect_book_id: item.id } satisfies RedeemTicketResponse;
}
