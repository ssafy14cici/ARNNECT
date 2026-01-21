import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
// @ts-ignore: 데이터 파일 타입 무시
import { artworks } from "../../data/artworks";

// 분리된 컴포넌트 임포트
import { CommentForm } from "../../components/artwork/CommentForm";
import { CommentList } from "../../components/artwork/CommentList";

type Comment = {
  id: string;
  parentId: string | null;
  content: string;
};

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);

  // artwork 찾기
  const artwork = artworks.find((item: any) => {
    const itemId = String(item.id);
    const urlId = String(id);
    
    // 1. 직접 매칭: 'a1' === 'a1' 또는 '1' === '1'
    if (itemId === urlId || itemId === `a${urlId}` || itemId.replace('a', '') === urlId.replace('a', '')) {
      return true;
    }
    
    // 2. 순서 기반 매칭: URL 1000 → a1, 1001 → a2, 1002 → a3
    const numericUrlId = parseInt(urlId.replace('a', ''), 10);
    const numericItemId = parseInt(itemId.replace('a', ''), 10);
    
    // 1000번대 URL은 순서대로 매칭 (1000 → 1, 1001 → 2, ...)
    if (numericUrlId >= 1000) {
      const expectedItemId = numericUrlId - 999; // 1000 → 1, 1001 → 2
      return numericItemId === expectedItemId;
    }
    
    return false;
  });

  // 404 처리: 작품을 찾지 못하면 홈으로 리다이렉트
  useEffect(() => {
    if (!artwork) {
      navigate('/', { replace: true });
    }
  }, [artwork, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // artwork가 없으면 렌더링하지 않음
  if (!artwork) return null;

  const addComment = (content: string) => {
    setComments(prev => [...prev, { id: crypto.randomUUID(), parentId: null, content }]);
  };

  const addReply = (parentId: string, content: string) => {
    setComments(prev => [...prev, { id: crypto.randomUUID(), parentId, content }]);
  };

  const deleteComment = (commentId: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
    }
  };

  const updateComment = (commentId: string, newContent: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: newContent } : c));
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", fontFamily: "sans-serif" }}>

      {/* 1. 메인 작품 이미지 */}
      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <img src={artwork.src} alt={artwork.id} style={{ width: "100%", display: "block" }} />
      </div>

      {/* 2. 작품 정보 및 좋아요 (0부터 시작) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", margin: 0 }}>Artwork {artwork.id}</h2>
        <button
          onClick={() => setIsLiked(!isLiked)}
          style={{
            background: isLiked ? "#ff4d4f" : "#fff",
            color: isLiked ? "#fff" : "#888",
            border: "1px solid #eee", padding: "10px 20px", borderRadius: 24, cursor: "pointer",
            fontWeight: "600", transition: "all 0.2s", boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}
        >
          ❤️ 좋아요 {isLiked ? 1 : 0}
        </button>
      </div>

      {/* 3. 댓글 섹션 */}
      <section style={{ marginBottom: 60 }}>
        <h3 style={{ marginBottom: 20, fontSize: "18px", fontWeight: "700" }}>댓글 {comments.length}</h3>
        <CommentForm placeholder="따뜻한 댓글을 남겨주세요" onAdd={addComment} />
        <CommentList
          comments={comments}
          onDelete={deleteComment}
          onUpdate={updateComment}
          onAddReply={addReply}
        />
      </section>

      {/* 4. 유사 작품 섹션 (피드 디자인 스타일 적용) */}
      <section style={{ borderTop: "1px solid #eee", paddingTop: 40, marginBottom: 60 }}>
        <h3 style={{ marginBottom: 24, fontSize: "20px", fontWeight: "700" }}>유사한 작품</h3>

        <div style={{
          display: "flex",
          gap: "12px",
          width: "100%",
          justifyContent: "space-between"
        }}>
          {artworks
            .filter((item: any) => item.id !== artwork.id)
            .slice(0, 4)
            .map((item: any, index: number) => (
              <div
                key={`similar-${item.id}-${index}`}
                onClick={() => navigate(`/artworks/${item.id}`)}
                style={{
                  flex: 1,
                  aspectRatio: "1/1",
                  position: "relative",
                  cursor: "pointer",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  transition: "transform 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  const img = e.currentTarget.querySelector('img');
                  const overlay = e.currentTarget.querySelector('div');
                  if (img) img.style.filter = "grayscale(0)";
                  if (overlay) overlay.style.opacity = "1";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  const img = e.currentTarget.querySelector('img');
                  const overlay = e.currentTarget.querySelector('div');
                  if (img) img.style.filter = "grayscale(1)";
                  if (overlay) overlay.style.opacity = "0";
                }}
              >
                {/* 카드 배경 이미지 */}
                <img
                  src={item.src}
                  alt={item.id}
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover", 
                    display: "block",
                    filter: "grayscale(1)",
                    transition: "filter 0.3s ease"
                  }}
                />

                {/* 이미지 위 어두운 오버레이: 텍스트 가독성을 위함 */}
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#fff",
                  textAlign: "center",
                  padding: "10px",
                  opacity: 0,
                  transition: "opacity 0.3s ease"
                }}>
                  <div style={{
                    fontWeight: "700",
                    fontSize: "13px",
                    marginBottom: "4px",
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)"
                  }}>
                    Garsington Opera Pavilion #{item.id.replace('a', '')}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    opacity: 0.9,
                    letterSpacing: "0.5px"
                  }}>
                    ARTIST {item.id.replace('a', '')}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 5. 추천 작품 섹션 (더미 데이터) */}
      <section style={{ borderTop: "1px solid #eee", paddingTop: 40 }}>
        <h3 style={{ marginBottom: 24, fontSize: "20px", fontWeight: "700" }}>추천 작품</h3>

        <div style={{
          display: "flex",
          gap: "12px",
          width: "100%",
          justifyContent: "space-between"
        }}>
          {artworks
            .slice(0, 4)
            .map((item: any, index: number) => (
              <div
                key={`recommend-${item.id}-${index}`}
                onClick={() => navigate(`/artworks/${item.id}`)}
                style={{
                  flex: 1,
                  aspectRatio: "1/1",
                  position: "relative",
                  cursor: "pointer",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  transition: "transform 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  const img = e.currentTarget.querySelector('img');
                  const overlay = e.currentTarget.querySelector('div');
                  if (img) img.style.filter = "grayscale(0)";
                  if (overlay) overlay.style.opacity = "1";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  const img = e.currentTarget.querySelector('img');
                  const overlay = e.currentTarget.querySelector('div');
                  if (img) img.style.filter = "grayscale(1)";
                  if (overlay) overlay.style.opacity = "0";
                }}
              >
                {/* 카드 배경 이미지 */}
                <img
                  src={item.src}
                  alt={item.id}
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover", 
                    display: "block",
                    filter: "grayscale(1)",
                    transition: "filter 0.3s ease"
                  }}
                />

                {/* 이미지 위 어두운 오버레이: 텍스트 가독성을 위함 */}
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#fff",
                  textAlign: "center",
                  padding: "10px",
                  opacity: 0,
                  transition: "opacity 0.3s ease"
                }}>
                  <div style={{
                    fontWeight: "700",
                    fontSize: "13px",
                    marginBottom: "4px",
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)"
                  }}>
                    Garsington Opera Pavilion #{item.id.replace('a', '')}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    opacity: 0.9,
                    letterSpacing: "0.5px"
                  }}>
                    ARTIST {item.id.replace('a', '')}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}