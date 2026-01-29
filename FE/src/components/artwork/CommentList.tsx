import { CommentItem } from "./CommentItem";

export const CommentList = ({ comments, onDelete, onUpdate, onAddReply, profilePath }: any) => {
  const rootComments = comments.filter((c: any) => c.parentId === null);

  return (
    <ul className="comment-list-ul">
      {rootComments.length > 0 ? (
        rootComments.map((comment: any) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onAddReply={onAddReply}
            profilePath={profilePath}
          />
        ))
      ) : (
        <div className="comment-empty">
          Be the first to share your thoughts.
        </div>
      )}
    </ul>
  );
};