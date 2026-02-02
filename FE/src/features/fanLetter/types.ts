// FE/src/features/fanLetter/types.ts

export type FanLetterId = number;

export type FanLetterViewMode = "postit" | "list";
export type FanLetterFilter = "all" | "unanswered" | "answered";

/**
 * 화면에서 쓰는 정규화된 FanLetter 모델
 */
export type FanLetter = {
  id: FanLetterId;

  fromNickname: string;
  question: string;
  createdAt: string; // API: yyyy-MM-dd or ISO

  artworkId?: number;
  artworkName?: string;

  isAnswered: boolean;
  answer?: string;
};

/**
 * 백엔드 원본(raw) 형태(명세 기반)
 */
export type FanLetterRaw = {
  fanLetterId: number;
  artworkId?: number;
  artworkName?: string;

  nickname: string; // fromNickname
  content: string;  // question
  date: string;     // yyyy-MM-dd (혹은 ISO가 올 수도 있어서 string 유지)

  answered: boolean;
  answer?: string;

  /**
   * ✅ 목업 저장소에서만 쓰는 확장 필드(백엔드에는 없음)
   * - artist별로 fanletter를 묶어서 조회하려고 필요
   */
  artistMemberUuid?: string;
};

export type FanLetterAnswerRequest = {
  answer: string;
};

// 공통 응답 래핑(프로젝트 대부분이 이 형태)
export type ApiEnvelope<T> = {
  httpStatus?: string;
  isSuccess?: boolean;
  code?: number;
  message?: string;
  data?: T;
};

/**
 * 팬레터 발송 입력(ArtworkDetail에서 사용)
 *
 * ✅ 표준 필드: artistMemberUuid, fromNickname, content, artworkId/artworkName
 * ✅ 레거시 호환: senderName, artworkTitle도 허용(기존 코드 깨지지 않게)
 */
export type FanLetterSendInput = {
  artistMemberUuid: string;

  artworkId?: number;
  artworkName?: string;

  fromNickname?: string;

  // --- 레거시 호환(있으면 normalize에서 흡수) ---
  senderName?: string;     // fromNickname 대체
  artworkTitle?: string;   // artworkName 대체

  content: string;

  // 목업에서만 추가로 저장하고 싶으면 옵션으로 들고 있어도 됨(백엔드에는 안 보냄)
  senderId?: string;
  artistName?: string;
};

/**
 * 내부에서 쓰는 "정규화된" 발송 payload
 * (api/index.ts에서 normalize해서 mock/real로 전달)
 */
export type FanLetterSendPayload = {
  artistMemberUuid: string;
  artworkId?: number;
  artworkName?: string;
  fromNickname: string;
  content: string;

  // mock 저장용 메타(선택)
  senderId?: string;
  artistName?: string;
};
