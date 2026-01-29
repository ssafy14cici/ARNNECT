// FE/src/types/collectbook.ts
export type Visibility = "private" | "public";

export type ExhibitionLite = {
  title?: string;
  place?: string;
  startDate?: string;
  endDate?: string;
  posterUrl?: string;
  description?: string;
};

export type CollectBookItem = {
  id: string;          // local id (BE 붙으면 collect_book_id로 대체될 수 있음)
  ticketCode: string;  // QR에서 읽은 ticket_code
  exhibition: ExhibitionLite;
  memo?: string;
  visitedAt: string;   // YYYY-MM-DD
  visibility: Visibility;
  scannedAt: string;   // ISO string
};
