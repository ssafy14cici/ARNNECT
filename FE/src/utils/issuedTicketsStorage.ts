// FE/src/utils/issuedTicketsStorage.ts
export type IssuedTicket = {
  id: string;              // 내부 식별자
  ticketCode: string;      // EXH_...
  createdAt: string;       // ISO
  exhibition: {
    title: string;
    place: string;
    startDate: string;
    endDate: string;
    posterUrl?: string;
    description?: string;

    feeType?: "free" | "paid";
    price?: number;
    durationMinutes?: number;
  };
};

const KEY = "comet_mock_issued_tickets_v1";

function safeRead(): IssuedTicket[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IssuedTicket[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(items: IssuedTicket[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getIssuedTickets(): IssuedTicket[] {
  return safeRead().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addIssuedTicket(item: Omit<IssuedTicket, "id" | "createdAt">): IssuedTicket {
  const now = new Date().toISOString();
  const saved: IssuedTicket = {
    id: crypto?.randomUUID?.() ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    ...item,
  };

  const list = safeRead();
  // ticketCode 중복 저장 방지(원하면 제거 가능)
  const filtered = list.filter((x) => x.ticketCode !== saved.ticketCode);
  safeWrite([saved, ...filtered]);
  return saved;
}

export function removeIssuedTicket(id: string) {
  const list = safeRead();
  safeWrite(list.filter((x) => x.id !== id));
}

export function clearIssuedTickets() {
  safeWrite([]);
}
