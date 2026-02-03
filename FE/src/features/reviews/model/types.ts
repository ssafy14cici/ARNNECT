// FE/src/features/reviews/model/types.ts

export type ReviewId = string | number;

/**
 * 서버 공통 봉투 (프로젝트에서 success/isSuccess 혼재 가능)
 * - 이 타입은 "서버가 이런 형태로 올 수도 있다" 수준으로만 쓰고
 * - 실제 파싱/추출은 http layer에서 normalize하는 걸 권장
 */
export type ApiEnvelope<T> = {
  success?: boolean;
  isSuccess?: boolean;
  message?: string;
  code?: number;
  data: T;
};

/**
 * 리뷰 목록/카드 등에 쓰는 최소 모델
 * (필드명은 BE/FE 혼재가 많으니 "FE 표준"을 하나 정해두는 게 중요)
 */
export type ReviewSummary = {
  reviewId: ReviewId;
  title?: string;
  imageUrl?: string;
};

/**
 * 리뷰 도메인 모델(범용)
 * - 화면에서 필요하면 Detail/Summary로 더 좁혀서 사용
 */
export type Review = {
  reviewId: ReviewId;
  title?: string;
  content?: string;
  imageUrl?: string;
  tags?: string[];
  createdAt?: string;

  artworkId?: number;

  // 작성자(유저) - 서버 DTO는 memberUuid/nickname로 오는 케이스 많음
  memberUuid?: string;
  nickname?: string;

  // 작품 작가
  artistUuid?: string;
  artistName?: string;
};

/**
 * 리뷰 상세 응답(ReviewDetailResponse 기반)
 * - BE: reviewId, artworkId, artworkTitle, title, content, imageUrl, createdAt,
 *       memberUuid, nickname, artistUuid, artistName, tags
 */
export type ReviewDetail = {
  reviewId: ReviewId;
  artworkId: number;          // detail에서는 거의 항상 필요하니 필수로 두는게 좋음
  artworkTitle: string;

  title: string;
  content: string;

  imageUrl?: string;
  createdAt?: string;         // 서버가 Timestamp/string 혼재하면 string으로 받는게 안전
  tags?: string[];

  memberUuid: string;
  nickname: string;

  artistUuid: string;
  artistName: string;
};

// ✅ 기존 오타 타입명을 쓰는 코드가 있을 수 있으니 호환 alias 유지
export type ReviewDeatil = ReviewDetail;

/**
 * 리뷰 등록 요청
 * - tags/imageFile은 "선택"으로 두는 게 실제 코드/주석과 정합성이 높음
 * - 이미지가 필수라면 UI validate + 타입 둘 다 필수로 고정하면 됨
 */
export interface ReviewCreateReq {
  title: string;
  content: string;
  artworkId?: number;

  tags?: string[];

  // 이미지가 optional이라면
  imageFile?: File | null;
}

/**
 * 리뷰 등록 응답
 */
export type ReviewCreateRes = {
  reviewId: ReviewId;
  imageUrl?: string;
};

/**
 * 리뷰 수정 요청(JSON)
 * - image 변경이 파일 업로드면 FormData 타입 별도 필요
 */
export type ReviewUpdateReq = {
  title: string;
  content: string;
  artworkId?: number;
  imageUrl?: string | null;
  tags?: string[];
};
