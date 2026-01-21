import { CommentItem } from "./CommentItem";

/**
 * CommentList: 전체 댓글 데이터를 받아 최상위 댓글들만 필터링하여 렌더링합니다.
 */
export const CommentList = ({ comments, onDelete, onUpdate, onAddReply }: any) => {
  // 1. 전체 댓글 중 부모가 없는(최상위) 댓글만 골라냅니다.
  const rootComments = comments.filter((c: any) => c.parentId === null);

  return (
    <ul style={{ listStyle: "none", padding: 0, marginTop: 32 }}>
      {rootComments.length > 0 ? (
        rootComments.map((comment: any) => (
          // 2. 각 댓글을 CommentItem으로 넘겨주며, 필요한 로직 함수들을 Props로 전달합니다.
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            allComments={comments} 
            onDelete={onDelete} 
            onUpdate={onUpdate} 
            onAddReply={onAddReply} 
          />
        ))
      ) : (
        // 댓글이 없을 때 보여줄 안내 문구 (선택 사항)
        <div style={{ textAlign: "center", color: "#999", padding: "40px 0", fontSize: "14px" }}>
          첫 번째 댓글을 남겨보세요.
        </div>
      )}
    </ul>
  );
};