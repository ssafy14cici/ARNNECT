// src/features/reviews/api/mock.ts
import type { ReviewCreateReq, ReviewId } from "../model/types";

/**
 * ✅ 진짜 DB 대신 "메모리"에 저장하는 가짜 저장소
 * 페이지 새로고침하면 초기화됨(=mock이니까 괜찮음)
 */
let seq = 1000;

export async function createReviewMock(data: ReviewCreateReq) {
  /**
   * ✅ 서버가 보통 주는 값 흉내:
   * - reviewId: 새로 생성된 리뷰 ID
   * - imageUrl: 업로드된 이미지 URL(여긴 실제 업로드 없으니 objectURL로 대체 가능)
   */
  const reviewId: ReviewId = ++seq;

  // 파일을 화면에서 미리보기 가능한 URL로 만들어줌(브라우저 내부 임시 URL)
  const imageUrl = URL.createObjectURL(data.imageFile);

  // ✅ 서버 공통 응답 봉투 비슷하게 만들어서 리턴(나중에 real로 바꿀 때 UI 변화 최소화)
  return {
    success: true,
    code: "OK",
    message: "mock: 감상평이 등록되었습니다.",
    data: { reviewId, imageUrl },
  };
}
