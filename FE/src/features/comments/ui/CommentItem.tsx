// FE/src/features/comments/ui/CommentItem.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { CommentForm } from "./CommentForm";
import { ReplyList } from "./ReplyList";
import type { Comment, CommentHandlers, ProfilePathFn } from "../model/types";
import { useAuthStore } from "../../auth/store";

type Props = CommentHandlers & {
  comment: Comment;
  allComments: Comment[];
  profilePath: ProfilePathFn;
};

export function CommentItem({
  comment,
  allComments,
  onDelete,
  onUpdate,
  onAddReply,
  profilePath,
}: Props) {
  // ✅ 내 식별자(있는 것만 뽑아 씀)
  const meUuid = useAuthStore((s) => s.user?.memberUuid);
  const meNickname = useAuthStore((s) => {
    const u: any = s.user;
    return (u?.nickname ?? u?.nickName ?? u?.name ?? "") as string;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(comment.content);
  const [isReplyOpen, setIsReplyOpen] = useState(false);

  const isReply = comment.parentId !== null;
  const authorName = comment.authorName ?? "Anonymous";
  const authorId = comment.authorId;

  /**
   * ✅ editable 판정 (현재 BE DTO에 맞춘 임시안)
   * 1) authorId가 있으면 UUID/ID 비교
   * 2) 없으면 nickName(=authorName) vs 내 nickname 비교
   *
   * ⚠️ 정확한 판정 원하면 BE에서 CommentResponse에 memberId/memberUuid/isMine 중 하나를 내려줘야 함.
   */
  const editable = useMemo(() => {
    if (meUuid && authorId) return String(authorId) === String(meUuid);
    if (meNickname && authorName) return String(authorName) === String(meNickname);
    return false;
  }, [meUuid, authorId, meNickname, authorName]);

  const saveEdit = async () => {
    const value = String(editInput ?? "").trim();
    if (!value) return;
    await onUpdate(comment.id, value);
    setIsEditing(false);
  };

  return (
    <li className={`comment-item-li ${isReply ? "is-reply" : ""}`}>
      <div className="comment-box">
        <div className="comment-header">
          {authorId ? (
            <Link to={profilePath(String(authorId))} className="comment-author">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEdit();
                }
              }}
            />
            <button type="button" className="comment-edit-btn btn-save" onClick={saveEdit}>
              Save
            </button>
            <button
              type="button"
              className="comment-edit-btn btn-cancel"
              onClick={() => {
                setIsEditing(false);
                setEditInput(comment.content);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="comment-content">{comment.content}</div>

            <div className="comment-actions">
              {!isReply && (
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setIsReplyOpen((v) => !v)}
                >
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
                  <button
                    type="button"
                    className="action-btn delete"
                    onClick={() => onDelete(comment.id)}
                  >
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
            onAdd={async (text) => {
              await onAddReply(comment.id, text);
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
}
