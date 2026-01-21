import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
// @ts-ignore: 데이터 파일 타입 무시
import { artworks } from "../../data/artworks";

// 분리된 컴포넌트들을 불러옵니다
import { CommentForm } from "../../components/artwork/CommentForm.tsx";
import { CommentList } from "../../components/artwork/CommentList.tsx";

type Comment = {
  id: string;
  parentId: string | null;
  content: string;
};

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /**
   * 보완: 유연한 ID 매칭 로직
   * id가 "1"이든 "a1"이든 데이터 배열에서 정확한 객체를 찾아냅니다.
   */
  const artwork = artworks.find((item: any) => 
    String(item.id) === id || 
    String(item.id) === `a${id}` || 
    `a${item.id}` === id
  ) || artworks[0];

  // 상태 관리 (Mock State)
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);

  // --- 비즈니스 로직 (DOD 충족) ---

  // 댓글 추가: 즉시 리스트 반영
  const addComment = (content: string) => {
    setComments(prev => [...prev, { id: crypto.randomUUID(), parentId: null, content }]);
  };

  // 대댓글 추가
  const addReply = (parentId: string, content: string) => {
    setComments(prev => [...prev, { id: crypto.randomUUID(), parentId, content }]);
  };

  // 삭제 처리: confirm 알럿 사용
  const deleteComment = (commentId: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
    }
  };

  // 수정 처리
  const updateComment = (commentId: string, newContent: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: newContent } : c));
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", fontFamily: "sans-serif" }}>
      
      {/* 1. 작품 이미지: 데이터의 src를 그대로 사용하여 ID 형식에 구애받지 않음 */}
      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <img 
          src={artwork.src} 
          alt={artwork.id} 
          style={{ width: "100%", display: "block" }} 
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", margin: 0 }}>Artwork {artwork.id}</h2>
        <button 
          onClick={() => setIsLiked(!isLiked)}
          style={{ 
            background: "#fff", border: "1px solid #eee", padding: "8px 16px", borderRadius: 20, cursor: "pointer",
            color: isLiked ? "#ff4d4f" : "#888", fontWeight: "600", boxShadow: "0 2px 5px rgba(0,0,0,0.03)"
          }}
        >
          좋아요 {isLiked ? 121 : 120}
        </button>
      </div>

      {/* 2. 댓글 섹션: 컴포넌트 분리 과제 반영 */}
      <section>
        <h3 style={{ marginBottom: 16, fontSize: "18px", fontWeight: "700" }}>댓글 {comments.length}</h3>
        
        {/* 댓글 작성 폼 */}
        <CommentForm placeholder="따뜻한 댓글을 남겨주세요" onAdd={addComment} />
        
        {/* 댓글 리스트: 분리된 컴포넌트에 로직 주입 */}
        <CommentList 
          comments={comments} 
          onDelete={deleteComment} 
          onUpdate={updateComment} 
          onAddReply={addReply} 
        />
      </section>

      {/* 3. 유사 작품 섹션 */}
      <section style={{ marginTop: 80, borderTop: "1px solid #eee", paddingTop: 40 }}>
        <h3 style={{ marginBottom: 24, fontSize: "18px", fontWeight: "700" }}>유사한 작품</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {artworks
            .filter((item: any) => item.id !== artwork.id)
            .slice(0, 4)
            .map((item: any) => (
              <div 
                key={item.id} 
                onClick={() => { navigate(`/artworks/${item.id}`); window.scrollTo(0,0); }} 
                style={{ cursor: "pointer" }}
              >
                <img 
                  src={item.src} 
                  alt={item.id} 
                  style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 12, marginBottom: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }} 
                />
                <div style={{ fontWeight: "600", fontSize: "14px" }}>Artwork {item.id}</div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}