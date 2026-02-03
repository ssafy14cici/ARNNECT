// FE/src/features/artwork/ui/comments/ReplyList.tsx

import { CommentItem } from "./CommentItem";

export const ReplyList = ({ parentId, allComments, onDelete, onUpdate, onAddReply, profilePath }: any) => {
  const replies = allComments.filter((c: any) => c.parentId === parentId);
  if (replies.length === 0) return null;

  return (
    <ul className="comment-list-ul reply-container">
      {replies.map((reply: any) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          allComments={allComments}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onAddReply={onAddReply}
          profilePath={profilePath}
        />
      ))}
    </ul>
  );
};