// FE/src/pages/reviews/ReviewCreate.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./reviewcreate.css";

import { useAuthStore } from "../../features/auth/store";
import { createReview } from "../../features/reviews/api";
import { USE_MOCK } from "../../shared/config/env";

// ✅ 중요: origin 말고 실제 ReviewForm 사용
import ReviewForm from "../../features/reviews/ui/ReviewForm";
import type { ReviewCreateReq } from "../../features/reviews/model/types";

export default function ReviewCreate() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(false);

  const onSubmit = async (req: ReviewCreateReq) => {
    if (!USE_MOCK && !user?.memberUuid) {
      alert("로그인 후 이용해주세요.");
      return;
    }

    setLoading(true);
    try {
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

        <ReviewForm submitting={loading} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
