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
  const authorName = comment.authorName ?? "Anonymous";
  const authorId = comment.authorId as string | undefined;

  const saveEdit = () => {
    const value = String(editInput ?? "").trim();
    if (!value) return;
    onUpdate(comment.id, value);
    setIsEditing(false);
  };

  return (
    <li className="comment-item-li">
      <div className="comment-box">
        {/* Header: 작성자 & 날짜 */}
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

        {/* Content or Edit Mode */}
        {isEditing ? (
          <div className="comment-edit-wrap">
            <input
              className="comment-input"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
              }}
            />
            <button className="comment-edit-btn btn-save" onClick={saveEdit}>Save</button>
            <button className="comment-edit-btn btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <div className="comment-content">{comment.content}</div>
            
            {/* Action Buttons */}
            <div className="comment-actions">
              {!isReply && (
                <button className="action-btn" onClick={() => setIsReplyOpen(!isReplyOpen)}>
                  Reply
                </button>
              )}
              {/* 본인 댓글일 경우만 보이게 처리하려면 조건 추가 필요 */}
              <button 
                className="action-btn" 
                onClick={() => {
                  setIsEditing(true);
                  setEditInput(comment.content);
                }}
              >
                Edit
              </button>
              <button 
                className="action-btn delete" 
                onClick={() => onDelete(comment.id)}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Reply Form (Toggle) */}
      {isReplyOpen && (
        <div className="reply-form-wrap">
          <CommentForm
            isReply
            placeholder="Write a reply..."
            onAdd={(text: string) => {
              onAddReply(comment.id, text);
              setIsReplyOpen(false);
            }}
          />
        </div>
      )}

      {/* Nested Replies */}
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