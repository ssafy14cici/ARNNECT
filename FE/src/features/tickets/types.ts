// src\features\tickets\types.ts
export interface TicketDesignProps {
  data: {
    title: string;
    address: string;
    addressDetail?: string; // 상세 주소 추가 대응
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    posterUrl: string;
  };
}