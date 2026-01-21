// src/pages/posts/PostDetail.tsx
import { useParams } from "react-router-dom";

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();

  // TODO(API 붙일 때):
  // - id로 게시글 조회
  // - 로딩/에러/없음 상태 처리
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px" }}>
      <h2 style={{ margin: 0 }}>Post Detail</h2>
      <p style={{ marginTop: 10, opacity: 0.72 }}>
        postId: <b>{id}</b>
      </p>
      <p style={{ marginTop: 18 }}>
        아직 게시글 상세 API/컴포넌트가 없어서 임시 페이지입니다.
      </p>
    </div>
  );
}
