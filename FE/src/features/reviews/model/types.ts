import type { AuthorCtx } from "../../artworks/model/types";

export type ReviewId = string | number;

export type Review = {
  reviewId: ReviewId;
  title?: string;
  content?: string;
  imageUrl?: string;
  tags?: string[];
  createdAt?: string;

  artworkId?: number;
  authorUuid?: string;
  authorName?: string;
};

// 리뷰 등록할 때 프론트가 보내는 입력값
export interface ReviewCreateReq {
  title: string;
  content: string;
  artworkId: number;
  tags: string[];
  imageFile: File;

}

// 공통 응답 봉투

export type ApiEnvelope<T> = {
  // httpStatus: string;
  success: boolean;
  message: string;
  code: number;
  data: T;
};

// 목록 화면에서 필요한 최소한의 정보
export type ReviewSummary = {
  reviewId: ReviewId;
  title?: string;
  imageUrl?: string;
};

// 상세 조회 응답 data 스키마
export type ReviewDeatil = {
  reviewId: ReviewId;
  artworkId: number;
  artworkTitle: string;
  artistUuid?: string;
  artistName?: string;
  imageUrl?: string;
  title?: string;
  content?: string;
  createdAt?: string; // yyyy-MM-dd
  tags?: string[];
  memberUuid?: string;
  nickname?: string;        

};

// 등록 성공 시 data 예시( 명세 Response Example)
// 리뷰 등록 후 서버가 반환하는 데이터 스키마
export type ReviewCreateRes = {
  reviewId: ReviewId;
  imageUrl?: string;
};

// 수정 요청(JSON)
export type ReviewUpdateReq = {
  title: string;
  content: string;
  artworkId: number;
  imageUrl?: string;
  tags: string[];
};