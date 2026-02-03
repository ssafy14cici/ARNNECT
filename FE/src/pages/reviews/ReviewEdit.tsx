import { useNavigate, useParams } from "react-router-dom";

export default function ReviewEdit() {
  const navigate = useNavigate();
  const { reviewId = "" } = useParams<{ reviewId: string }>();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px" }}>
      <h2 style={{ margin: 0 }}>Review Edit</h2>
      <p style={{ marginTop: 10, opacity: 0.72 }}>
        reviewId: <b>{reviewId}</b>
      </p>

      <p style={{ marginTop: 18 }}>
        아직 리뷰 수정/삭제 API가 확정되지 않아 임시 페이지입니다.
      </p>

      <button type="button" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
        뒤로
      </button>
    </div>
  );
}
