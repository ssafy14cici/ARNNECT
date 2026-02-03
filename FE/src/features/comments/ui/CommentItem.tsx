// FE/src/features/artwork/ui/comments/CommentItem.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { CommentForm } from "./CommentForm";
import { ReplyList } from "./ReplyList";
import type { Comment, CommentHandlers, ProfilePathFn } from "../model/types";

type Props = CommentHandlers & {
  comment: Comment;
  allComments: Comment[];
  profilePath: ProfilePathFn;
  canEdit?: (comment: Comment) => boolean; // 추후 본인 댓글만 편집/삭제용
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
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(comment.content);
  const [isReplyOpen, setIsReplyOpen] = useState(false);

  const isReply = comment.parentId !== null;
  const authorName = comment.authorName ?? "Anonymous";
  const authorId = comment.authorId;

  const editable = canEdit ? canEdit(comment) : true;

  const saveEdit = () => {
    const value = String(editInput ?? "").trim();
    if (!value) return;
    onUpdate(comment.id, value);
    setIsEditing(false);
  };

  return (
    <li className="comment-item-li">
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
            <button className="comment-edit-btn btn-save" onClick={saveEdit}>Save</button>
            <button className="comment-edit-btn btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <div className="comment-content">{comment.content}</div>

            <div className="comment-actions">
              {!isReply && (
                <button className="action-btn" onClick={() => setIsReplyOpen((v) => !v)}>
                  Reply
                </button>
              )}

              {editable && (
                <>
                  <button
                    className="action-btn"
                    onClick={() => {
                      setIsEditing(true);
                      setEditInput(comment.content);
                    }}
                  >
                    Edit
                  </button>
                  <button className="action-btn delete" onClick={() => onDelete(comment.id)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {isReplyOpen && (
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
