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

/** 백엔드 raw(명세 기반) */
export type FanLetterRaw = {
  fanLetterId: number;

  artworkId?: number;
  artworkName?: string;

  nickname: string;
  content: string;
  date: string;

  answered: boolean;
  answer?: string;
};

export type FanLetterAnswerRequest = {
  answer: string;
};

export type ApiEnvelope<T> = {
  httpStatus?: string;
  isSuccess?: boolean;
  code?: number;
  message?: string;
  data?: T;
};

/**
 * 팬레터 발송 입력
 * - 표준: artistMemberUuid, content, (artworkId optional)
 * - 레거시 호환: artworkTitle, senderName 등은 받아도 내부에서 무시/흡수 가능
 */
export type FanLetterSendInput = {
  artistMemberUuid: string;

  artworkId?: number;

  content: string;

  // --- 레거시/메타 (선택) ---
  artworkTitle?: string;
  senderName?: string;
  senderId?: string;
  artistName?: string;
};

/** 실API로 보낼 payload(최소) */
export type FanLetterSendPayload = {
  artistMemberUuid: string;
  artworkId?: number;
  content: string;
};
