import { CommentItem } from "./CommentItem";

export const CommentList = ({ comments, onDelete, onUpdate, onAddReply, profilePath }: any) => {
  const rootComments = comments.filter((c: any) => c.parentId === null);

  return (
    <ul style={{ listStyle: "none", padding: 0, marginTop: 32 }}>
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
        <div style={{ textAlign: "center", color: "#999", padding: "40px 0", fontSize: "14px" }}>
          첫 번째 댓글을 남겨보세요.
        </div>
      )}
    </ul>
  );
};
