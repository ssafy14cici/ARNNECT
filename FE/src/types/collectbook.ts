export type Visibility = "private" | "public";

export type Exhibition = {
  title?: string;
  place?: string;
  startDate?: string;
  endDate?: string;
  posterUrl?: string;
};

export type CollectBookItem = {
  id: string;            // local id
  ticketCode: string;    // QR에서 읽은 ticket_code
  exhibition: Exhibition;
  memo?: string;
  visitedAt: string;     // YYYY-MM-DD
  visibility: Visibility;

  scannedAt: string;     // ISO string (최근 스캔 순 정렬용)
};
