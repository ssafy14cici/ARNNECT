export type FanLetterId = number;

export type FanLetterViewMode = "postit" | "list";
export type FanLetterFilter = "all" | "unanswered" | "answered";

export type FanLetter = {
  id: FanLetterId;

  // 질문 메타
  fromNickname: string;
  question: string;
  createdAt: string; // API: "yyyy-MM-dd" (또는 ISO가 올 수도 있으니 string으로 유지)

  // 작품 연결(선택)
  artworkId?: number;
  artworkName?: string;

  // 답변
  isAnswered: boolean;
  answer?: string;
};

// --- API Raw (명세 그대로) ---
export type FanLetterRaw = {
  fanLetterId: number;
  artworkId?: number;
  artworkName?: string;
  nickname: string;
  content: string;
  date: string; // "yyyy-MM-dd"
  answered: boolean;
  answer?: string;
};

export type FanLetterAnswerRequest = {
  answer: string;
};

// 공통 응답(프로젝트 대부분이 이 형태)
export type ApiEnvelope<T> = {
  httpStatus?: string;
  isSuccess?: boolean;
  code?: number;
  message?: string;
  data?: T;
};
