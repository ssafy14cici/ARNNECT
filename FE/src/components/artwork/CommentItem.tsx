import { useState } from "react";
import { Link } from "react-router-dom";
import { CommentForm } from "./CommentForm";
import { ReplyList } from "./ReplyList";

export const CommentItem = ({
  comment,
  allComments,
  onDelete,
  onUpdate,
  onAddReply,
  profilePath,
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(comment.content);
  const [isReplyOpen, setIsReplyOpen] = useState(false);

  const isReply = comment.parentId !== null;

  const authorName = comment.authorName ?? "익명";
  const authorId = comment.authorId as string | undefined;

  const saveEdit = () => {
    const value = String(editInput ?? "").trim();
    if (!value) return;
    onUpdate(comment.id, value);
    setIsEditing(false);
  };

  return (
    <li style={{ marginBottom: isReply ? 8 : 24, listStyle: "none" }}>
      <div
        style={{
          background: isReply ? "#f1f1f1" : "#f9f9f9",
          padding: "16px",
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
      >
        {/* 작성자 표시 + 클릭 이동 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            fontSize: 12,
          }}
        >
          {authorId ? (
            <Link
              to={profilePath(authorId)}
              style={{ fontWeight: 700, color: "#333", textDecoration: "none" }}
            >
              {authorName}
            </Link>
          ) : (
            <span style={{ fontWeight: 700, color: "#333" }}>{authorName}</span>
          )}

          {comment.createdAt ? (
            <span style={{ color: "#aaa" }}>{String(comment.createdAt)}</span>
          ) : (
            <span />
          )}
        </div>

        {isEditing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "transparent",
                border: "none",
                outline: "none",
              }}
            />
            <button
              onClick={saveEdit}
              style={{ background: "transparent", border: "none", fontWeight: "600" }}
            >
              저장
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={{ background: "transparent", border: "none", color: "#888" }}
            >
              취소
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>{comment.content}</div>
            <div style={{ display: "flex", gap: 12, fontSize: "12px", color: "#999" }}>
              {!isReply && (
                <span style={{ cursor: "pointer" }} onClick={() => setIsReplyOpen(!isReplyOpen)}>
                  답글
                </span>
              )}
              <span
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setIsEditing(true);
                  setEditInput(comment.content);
                }}
              >
                수정
              </span>
              <span
                style={{ cursor: "pointer", color: "#ff4d4f" }}
                onClick={() => onDelete(comment.id)}
              >
                삭제
              </span>
            </div>
          </>
        )}
      </div>

      {isReplyOpen && (
        <div style={{ marginLeft: 32, marginTop: 8 }}>
          <CommentForm
            isReply
            placeholder="답글을 입력하세요..."
            onAdd={(text: string) => {
              onAddReply(comment.id, text);
              setIsReplyOpen(false);
            }}
          />
        </div>
      )}

      {!isReply && (
        <ReplyList
          parentId={comment.id}
          allComments={allComments}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onAddReply={onAddReply}
          profilePath={profilePath}
        />
      )}
    </li>
  );
};
