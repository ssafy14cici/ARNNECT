//FE/src/pages/reviews/ReviewCreate.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./reviewcreate.css";

import { useAuthStore } from "../../features/auth/store";
import { createReview } from "../../features/reviews/api";
import { USE_MOCK } from "../../shared/config/env";

import ReviewForm from "../../features/reviews/ui/ReviewForm";
import type { ReviewCreateReq } from "../../features/reviews/model/types"; // ✅ 타입 추가

export default function ReviewCreate() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const appRole = useAuthStore((s) => s.role);

  const [loading, setLoading] = useState(false);

  // ✅ any -> ReviewCreateReq로 바꿔서 실수를 TS가 잡게 함
  const onSubmit = async (req: ReviewCreateReq) => {
    // ✅ mock 개발 중엔 로그인 없어도 테스트 가능하게
    if (!USE_MOCK && !user?.memberUuid) {
      alert("로그인 후 이용해주세요.");
      return;
    }

    setLoading(true);
    try {
      // ✅ mock 단계에서 author는 일단 빼도 됨(타입/필드명 불일치로 헷갈리는 원인 제거)
      await createReview(req);

      alert("등록되었습니다.");
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-create-page theme-user">
      <div className="pc-container">
        <header className="pc-header">
          <h1 className="pc-title">New Review</h1>
          <button className="pc-close-btn" onClick={() => navigate(-1)} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* ✅ ReviewForm은 그대로. onSubmit에서 createReview 호출 */}
        <ReviewForm submitting={loading} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
