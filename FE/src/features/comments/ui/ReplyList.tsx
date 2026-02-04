//FE\src\features\comments\ui\ReplyList.tsx

import { CommentItem } from "./CommentItem";
import type { Comment, CommentHandlers, CommentId, ProfilePathFn } from "../model/types";

type Props = CommentHandlers & {
  parentId: CommentId;
  allComments: Comment[];
  profilePath: ProfilePathFn;
  canEdit?: (comment: Comment) => boolean;
};

export const ReplyList = ({
  parentId,
  allComments,
  onDelete,
  onUpdate,
  onAddReply,
  profilePath,
  canEdit,
}: Props) => {
  const replies = allComments.filter((c) => c.parentId === parentId);
  if (replies.length === 0) return null;

  return (
    <ul className="comment-list-ul reply-container">
      {replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          allComments={allComments}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onAddReply={onAddReply}
          profilePath={profilePath}
          canEdit={canEdit}
        />
      ))}
    </ul>
  );
};
