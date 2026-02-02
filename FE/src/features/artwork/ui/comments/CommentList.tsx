import type { Comment, CommentHandlers, ProfilePathFn } from "../../types";
import { CommentItem } from "./CommentItem";

type Props = CommentHandlers & {
  comments: Comment[];
  profilePath: ProfilePathFn;
  canEdit?: (comment: Comment) => boolean;
};

export function CommentList({ comments, onDelete, onUpdate, onAddReply, profilePath, canEdit }: Props) {
  const rootComments = comments.filter((c) => c.parentId === null);

  return (
    <ul className="comment-list-ul">
      {rootComments.length > 0 ? (
        rootComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onAddReply={onAddReply}
            profilePath={profilePath}
            canEdit={canEdit}
          />
        ))
      ) : (
        <div className="comment-empty">Be the first to share your thoughts.</div>
      )}
    </ul>
  );
}
