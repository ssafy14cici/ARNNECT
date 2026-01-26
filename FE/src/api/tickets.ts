// FE/src/api/tickets.ts

export type FeeType = "free" | "paid";

export type ExhibitionCreateRequest = {
  title: string;
  place: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  feeType: FeeType; // ✅ 무료/유료
  price?: number; // ✅ 유료일 때만
  durationMinutes?: number; // ✅ 소요시간(분) 선택
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

export type ExhibitionUpdateRequest = Partial<Omit<ExhibitionCreateRequest, "title" | "place" | "startDate" | "endDate">> &
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
const RAW_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
const BASE_URL = (RAW_BASE_URL ?? "").trim();

// ✅ mock 강제 옵션: .env에 VITE_USE_MOCK=true 넣으면 무조건 로컬 저장
const RAW_USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK as string | undefined;

const getOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");
const ORIGIN = getOrigin();

// ✅ 유저가 실수로 VITE_API_BASE_URL=http://localhost:5173 넣어도 mock로 돌도록 방어
const USE_MOCK =
  RAW_USE_MOCK === "true" ||
  !BASE_URL ||
  BASE_URL === ORIGIN ||
  BASE_URL.includes("localhost:5173");

// ✅ 실제 백엔드 붙으면 여기 엔드포인트만 맞추면 됨
const ENDPOINTS = {
  CREATE_EXHIBITION_TICKET: "/api/v1/exhibitions", // POST
  GET_EXHIBITION_BY_CODE: (code: string) => `/api/v1/exhibitions/by-code/${encodeURIComponent(code)}`, // GET
  UPDATE_EXHIBITION_BY_CODE: (code: string) => `/api/v1/exhibitions/by-code/${encodeURIComponent(code)}`, // PATCH/PUT
  DELETE_EXHIBITION_BY_CODE: (code: string) => `/api/v1/exhibitions/by-code/${encodeURIComponent(code)}`, // DELETE
  REDEEM_TICKET: "/api/v1/collectbook", // POST
};

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
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
type StoredExhibition = ExhibitionByCodeResponse & {
  _version: 1;
};

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

function normalizePayload(payload: ExhibitionCreateRequest): ExhibitionCreateRequest {
  const feeType = payload.feeType ?? "free";
  const price =
    feeType === "paid"
      ? typeof payload.price === "number"
        ? payload.price
        : Number(payload.price ?? 0)
      : undefined;

  return {
    ...payload,
    feeType,
    price: feeType === "paid" ? (Number.isFinite(price) ? price : 0) : undefined,
    durationMinutes:
      typeof payload.durationMinutes === "number"
        ? payload.durationMinutes
        : payload.durationMinutes
        ? Number(payload.durationMinutes)
        : undefined,
    posterUrl: payload.posterUrl?.trim() || undefined,
    description: payload.description?.trim() || undefined,
    title: payload.title.trim(),
    place: payload.place.trim(),
  };
}

// ----------------------------
// PUBLIC API
// ----------------------------

/** 발급 목록(artist) */
export async function listIssuedExhibitions(): Promise<ExhibitionByCodeResponse[]> {
  if (!USE_MOCK) {
    // 백엔드가 리스트 API를 제공하면 여기로 교체
    throw new Error("listIssuedExhibitions: real API 미구현");
  }

  const map = readMap();
  const order = readOrder();

  // order 우선 + 누락된 항목은 뒤에 붙임
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
    return request<ExhibitionByCodeResponse>(`${BASE_URL}${ENDPOINTS.GET_EXHIBITION_BY_CODE(ticketCode)}`, {
      method: "GET",
    });
  }

  const map = readMap();
  const ex = map[ticketCode];
  if (!ex) throw new Error("전시 정보를 찾을 수 없습니다. (mock DB)");
  return ex satisfies ExhibitionByCodeResponse;
}

/** ticket_code는 그대로 두고, 전시 정보만 수정 */
export async function updateExhibitionByCode(ticketCode: string, patch: ExhibitionUpdateRequest) {
  if (!USE_MOCK) {
    return request<ExhibitionByCodeResponse>(`${BASE_URL}${ENDPOINTS.UPDATE_EXHIBITION_BY_CODE(ticketCode)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  const map = readMap();
  const current = map[ticketCode];
  if (!current) throw new Error("수정할 전시를 찾을 수 없습니다. (mock DB)");

  // patch 적용(무료/유료/가격 규칙 포함)
  const merged: ExhibitionByCodeResponse = {
    ...current,
    ...patch,
    ticket_code: current.ticket_code,
    exhibition_id: current.exhibition_id,
    updatedAt: nowISO(),
  };

  // feeType 규칙 보정
  const feeType = (merged.feeType ?? "free") as FeeType;
  merged.feeType = feeType;
  if (feeType === "paid") {
    merged.price = typeof merged.price === "number" ? merged.price : Number(merged.price ?? 0);
    if (!Number.isFinite(merged.price)) merged.price = 0;
  } else {
    merged.price = undefined;
  }

  // 선택 필드 trim
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
    return request<{ ok: true }>(`${BASE_URL}${ENDPOINTS.DELETE_EXHIBITION_BY_CODE(ticketCode)}`, {
      method: "DELETE",
    });
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

/** 유저 티켓북 등록(현재는 mock에서는 통과만) */
export async function redeemTicket(payload: RedeemTicketRequest) {
  if (!USE_MOCK) {
    return request<RedeemTicketResponse>(`${BASE_URL}${ENDPOINTS.REDEEM_TICKET}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // mock: 성공 처리만
  return { collect_book_id: makeId() } satisfies RedeemTicketResponse;
}
