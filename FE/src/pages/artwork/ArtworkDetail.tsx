import { useParams } from "react-router-dom";
import { useState } from "react";

/**
 * 1) 댓글 타입 (페이지 로컬)
 */
type Comment = {
  id: string;
  parentId: string | null;
  content: string;
};

/**
 * 2) ArtworkDetail
 */
export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();

  /**
   * 3) 댓글 상태
   */
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);

  /**
   * 4) 댓글 추가
   */
  const addComment = () => {
    if (!commentInput.trim()) return;

    setComments(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        parentId: null,
        content: commentInput,
      },
    ]);

    setCommentInput("");
  };

  /**
   * 5) 대댓글 추가
   */
  const addReply = (parentId: string) => {
    if (!replyInput.trim()) return;

    setComments(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        parentId,
        content: replyInput,
      },
    ]);

    setReplyInput("");
    setReplyTargetId(null);
  };

  /**
   * 6) 작품 ID 없을 경우
   */
  if (!id) {
    return <div style={{ padding: 24 }}>잘못된 접근입니다.</div>;
  }

  /**
   * 7) 렌더링
   */
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {/* 작품 이미지 */}
      <img
        src={`/art/${id}.jpg`}
        alt={id}
        style={{
          width: "100%",
          borderRadius: 12,
          marginBottom: 16,
        }}
      />

      {/* 작품 정보 */}
      <h2 style={{ marginBottom: 32 }}>Artwork {id}</h2>

      {/* 댓글 섹션 */}
      <section>
        <h3 style={{ marginBottom: 12 }}>댓글</h3>

        {/* 댓글 입력 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <input
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            placeholder="댓글을 입력하세요"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          />
          <button
            onClick={addComment}
            style={{
              padding: "0 16px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            등록
          </button>
        </div>

        {/* 댓글 목록 */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {comments
            .filter(c => c.parentId === null)
            .map(comment => (
              <li key={comment.id} style={{ marginBottom: 20 }}>
                {/* 댓글 + 답글 버튼 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fafafa",
                    padding: "12px 14px",
                    borderRadius: 8,
                  }}
                >
                  <div>{comment.content}</div>

                  <button
                    onClick={() =>
                      setReplyTargetId(
                        replyTargetId === comment.id ? null : comment.id
                      )
                    }
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 13,
                      color: "#777",
                      cursor: "pointer",
                    }}
                  >
                    답글
                  </button>
                </div>

                {/* 대댓글 입력 */}
                {replyTargetId === comment.id && (
                  <div
                    style={{
                      marginTop: 8,
                      marginLeft: 24,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <input
                      value={replyInput}
                      onChange={e => setReplyInput(e.target.value)}
                      placeholder="답글을 입력하세요"
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                      }}
                    />
                    <button
                      onClick={() => addReply(comment.id)}
                      style={{
                        padding: "0 14px",
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      등록
                    </button>
                  </div>
                )}

                {/* 대댓글 목록 */}
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    marginTop: 8,
                    marginLeft: 24,
                  }}
                >
                  {comments
                    .filter(r => r.parentId === comment.id)
                    .map(reply => (
                      <li
                        key={reply.id}
                        style={{
                          background: "#f3f3f3",
                          padding: "8px 12px",
                          borderRadius: 6,
                          marginBottom: 6,
                          fontSize: 14,
                        }}
                      >
                        {reply.content}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
