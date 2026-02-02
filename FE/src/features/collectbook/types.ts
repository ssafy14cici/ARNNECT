// FE/src/features/collectbook/types.ts
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
  id: string;
  ownerUuid: string;   // ✅ 추가: 이 콜렉션의 주인
  ticketCode: string;
  exhibition: ExhibitionLite;
  memo?: string;
  visitedAt: string;
  visibility: Visibility;
  scannedAt: string;
};

