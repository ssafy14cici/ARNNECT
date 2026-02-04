//FE\src\features\fanLetter\types.ts
export type FanLetterId = number;

export type FanLetter = {
  id: FanLetterId;

  fromNickname: string;
  question: string;
  createdAt: string; // yyyy-MM-dd or ISO

  artworkId?: number;
  artworkName?: string;

  isAnswered: boolean;
  answer?: string;
};

/**
 * 백엔드 raw(명세/구현 흔들림 대응)
 * - FanLetterResponse: fanLetterId, artworkId, artworkName, nickname, title, content, createdAt, answer
 * - (레거시) date / answered 등도 들어올 수 있어 흡수
 */
export type FanLetterRaw = {
  fanLetterId?: number;
  id?: number;

  artworkId?: number;
  artworkName?: string;

  nickname?: string;
  title?: string;
  content?: string;

  createdAt?: string;
  date?: string;

  answered?: boolean;
  isAnswered?: boolean;
  answer?: string | null;
};

export type FanLetterAnswerRequest = {
  answer: string;
};

export type ApiEnvelope<T> = {
  httpStatus?: string;
  isSuccess?: boolean;
  success?: boolean;
  code?: number;
  message?: string;
  data?: T;
};

/**
 * 팬레터 발송 입력
 * - 표준: artistMemberUuid, content, (artworkId optional)
 * - 서버 DTO(title 필수 가능성) 때문에 title도 optional로 추가
 */
export type FanLetterSendInput = {
  artistMemberUuid: string;

  artworkId?: number;
  content: string;

  // ✅ 서버 DTO에 title이 있어서 optional로 받되, 없으면 내부에서 기본값 생성
  title?: string;

  // --- 레거시/메타 (선택) ---
  artworkTitle?: string;
  senderName?: string;
  senderId?: string;
  artistName?: string;
};

/** ✅ 실API로 보낼 payload(서버 FanLetterRequest 스키마) */
export type FanLetterSendPayload = {
  memberUuid: string; // 작가 uuid
  title: string;
  content: string;
  artworkId?: number;
};
