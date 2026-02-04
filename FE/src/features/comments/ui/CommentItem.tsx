// FE/src/features/comments/ui/CommentItem.tsx
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { CommentForm } from "./CommentForm";
import { ReplyList } from "./ReplyList";
import type { Comment, CommentHandlers, ProfilePathFn } from "../model/types";
import { useAuthStore } from "../../auth/store"; // ✅ 추가 (경로 프로젝트에 맞게)

type Props = CommentHandlers & {
  comment: Comment;
  allComments: Comment[];
  profilePath: ProfilePathFn;
  canEdit?: (comment: Comment) => boolean; // 있으면 이걸 우선 사용
};

export function CommentItem({
  comment,
  allComments,
  onDelete,
  onUpdate,
  onAddReply,
  profilePath,
  canEdit,
}: Props) {
  const me = useAuthStore((s) => s.user?.memberUuid); // ✅ 내 id

  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(comment.content);
  const [isReplyOpen, setIsReplyOpen] = useState(false);

  const isReply = comment.parentId !== null;
  const authorName = comment.authorName ?? "Anonymous";
  const authorId = comment.authorId;

  // ✅ canEdit가 없으면 "내 댓글만" 기본 로직 적용
  const editable = useMemo(() => {
    if (canEdit) return canEdit(comment);
    if (!me) return false;
    if (!authorId) return false; // authorId가 없으면 판단 불가 -> 숨김
    return String(authorId) === String(me);
  }, [canEdit, comment, me, authorId]);

  const saveEdit = () => {
    const value = String(editInput ?? "").trim();
    if (!value) return;
    onUpdate(comment.id, value);
    setIsEditing(false);
  };

  return (
    <li className={`comment-item-li ${isReply ? "is-reply" : ""}`}>
      <div className="comment-box">
        <div className="comment-header">
          {authorId ? (
            <Link to={profilePath(authorId)} className="comment-author">
              {authorName}
            </Link>
          ) : (
            <span className="comment-author">{authorName}</span>
          )}

          <span className="comment-date">
            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
          </span>
        </div>

        {isEditing ? (
          <div className="comment-edit-wrap">
            <input
              className="comment-input"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            />
            <button type="button" className="comment-edit-btn btn-save" onClick={saveEdit}>
              Save
            </button>
            <button
              type="button"
              className="comment-edit-btn btn-cancel"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="comment-content">{comment.content}</div>

            <div className="comment-actions">
              {!isReply && (
                <button type="button" className="action-btn" onClick={() => setIsReplyOpen((v) => !v)}>
                  Reply
                </button>
              )}

              {editable && (
                <>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      setIsEditing(true);
                      setEditInput(comment.content);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="action-btn delete" onClick={() => onDelete(comment.id)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {isReplyOpen && !isReply && (
        <div className="reply-form-wrap">
          <CommentForm
            isReply
            placeholder="Write a reply..."
            onAdd={(text) => {
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
          canEdit={canEdit}
        />
      )}
    </li>
  );
}
