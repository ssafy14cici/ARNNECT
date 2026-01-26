// FE/src/utils/ticketMockStorage.ts
import type {
  ExhibitionCreateRequest,
  ExhibitionByCodeResponse,
} from "../api/tickets";

const KEY = "arnnect_mock_exhibitions_v1";

type Stored = ExhibitionCreateRequest & {
  ticket_code: string;
  exhibition_id: string;
  createdAt: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uuid() {
  // modern browsers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function mockCreateExhibition(payload: ExhibitionCreateRequest) {
  const ticket_code = `EXH_${uuid()}`;
  const exhibition_id = `EX_${uuid()}`;

  const record: Stored = {
    ...payload,
    ticket_code,
    exhibition_id,
    createdAt: new Date().toISOString(),
  };

  const map = safeParse<Record<string, Stored>>(localStorage.getItem(KEY), {});
  map[ticket_code] = record;
  localStorage.setItem(KEY, JSON.stringify(map));

  return { ticket_code, exhibition_id };
}

export function mockGetExhibitionByCode(code: string): ExhibitionByCodeResponse {
  const map = safeParse<Record<string, Stored>>(localStorage.getItem(KEY), {});
  const ex = map[code];

  if (!ex) {
    // 스캔한 QR이 "mock 생성"이 아닌 경우도 있으니, 최소 데이터로라도 반환해줌
    return {
      ticket_code: code,
      title: "(로컬) 전시 정보 없음",
      place: "-",
      startDate: "-",
      endDate: "-",
      posterUrl: undefined,
      description: "현재는 백엔드 미연동 상태라 로컬 저장된 전시만 조회됩니다.",
      artistName: undefined,
    };
  }

  return {
    ticket_code: ex.ticket_code,
    title: ex.title,
    place: ex.place,
    startDate: ex.startDate,
    endDate: ex.endDate,
    posterUrl: ex.posterUrl,
    description: ex.description,
    artistName: undefined,
  };
}

export function mockRedeemTicket() {
  // 실제로는 서버가 collect_book_id를 주겠지만, 지금은 로컬 흐름만 살리면 됨
  return { collect_book_id: `CB_${uuid()}` };
}
