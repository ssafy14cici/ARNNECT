import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./postCreate.css";

import { useAuthStore } from "../../features/auth/store";
import { createReview } from "../../features/reviews/api";
import ReviewForm from "../../features/reviews/ui/ReviewForm";

export default function ReviewCreate() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const appRole = useAuthStore((s) => s.role);

  const [loading, setLoading] = useState(false);

  const onSubmit = async (req: any) => {
    if (!user?.memberUuid) {
      alert("로그인 후 이용해주세요.");
      return;
    }

    setLoading(true);
    try {
      const author = {
        id: user.memberUuid,
        name: user.name,
        role: appRole === "artist" ? "ARTIST" : "USER",
      } as const;

      await createReview({
        ...req,
        author,
      });

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
