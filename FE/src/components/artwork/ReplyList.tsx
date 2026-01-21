import { CommentItem } from "./CommentItem.tsx";

export const ReplyList = ({ parentId, allComments, onDelete, onUpdate, onAddReply }: any) => {
  const replies = allComments.filter((c: any) => c.parentId === parentId);
  if (replies.length === 0) return null;

  return (
    <ul style={{ padding: 0, marginLeft: 32, marginTop: 8 }}>
      {replies.map((reply: any) => (
        <CommentItem 
          key={reply.id} 
          comment={reply} 
          allComments={allComments} 
          onDelete={onDelete} 
          onUpdate={onUpdate}
          onAddReply={onAddReply} 
        />
      ))}
    </ul>
  );
};