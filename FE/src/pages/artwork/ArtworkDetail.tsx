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

// Mock 데이터 구조
const getMockArtworkData = (baseArtwork: any) => {
  const artworkNumber = baseArtwork.id.replace('a', '');
  return {
    ...baseArtwork,
    title: baseArtwork.title || `Garsington Opera Pavilion #${artworkNumber}`,
    artist: baseArtwork.artist || `ARTIST ${artworkNumber}`,
    description: baseArtwork.description || `이 작품은 현대 건축과 자연의 조화를 담아낸 독특한 시리즈입니다. 빛과 그림자의 대비, 공간의 흐름을 통해 관람객에게 새로운 시각적 경험을 선사합니다. 작가는 이 작품을 통해 인간과 환경의 관계를 탐구하며, 건축물이 단순한 구조물을 넘어 예술적 표현의 매개체가 될 수 있음을 보여줍니다.`,
    tags: baseArtwork.tags || ['건축', '현대미술', '공간디자인', '빛과그림자']
  };
};

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // artwork 찾기
  const baseArtwork = artworks.find((item: any) => {
    const itemId = String(item.id);
    const urlId = String(id);
    
    if (itemId === urlId || itemId === `a${urlId}` || itemId.replace('a', '') === urlId.replace('a', '')) {
      return true;
    }
    
    const numericUrlId = parseInt(urlId.replace('a', ''), 10);
    const numericItemId = parseInt(itemId.replace('a', ''), 10);
    
    if (numericUrlId >= 1000) {
      const expectedItemId = numericUrlId - 999;
      return numericItemId === expectedItemId;
    }
    
    return false;
  });

  const artwork = baseArtwork ? getMockArtworkData(baseArtwork) : null;

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!isLoading && !artwork) {
      const timer = setTimeout(() => navigate('/', { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [artwork, isLoading, navigate]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

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

  // 로딩 상태
  if (isLoading) {
    return (
      <div style={{ 
        maxWidth: 720, 
        margin: "0 auto", 
        padding: "100px 24px", 
        fontFamily: "sans-serif",
        textAlign: "center" 
      }}>
        <div style={{ fontSize: "18px", color: "#666", marginBottom: "20px" }}>
          작품을 불러오는 중...
        </div>
        <div style={{
          width: "40px", height: "40px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #333",
          borderRadius: "50%",
          margin: "0 auto",
          animation: "spin 1s linear infinite"
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // NotFound 상태
  if (!artwork) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "100px 24px", fontFamily: "sans-serif", textAlign: "center" }}>
        <div style={{ marginBottom: "24px" }}>
          <img 
            src="/NotFound.png" 
            alt="작품을 찾을 수 없음" 
            style={{ maxWidth: "200px", opacity: 0.6, margin: "0 auto" }} 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "16px" }}>작품을 찾을 수 없습니다</h2>
        <p style={{ color: "#666", marginBottom: "32px" }}>요청하신 작품이 존재하지 않거나 삭제되었습니다.</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: "12px 24px", fontSize: "16px", fontWeight: "600",
            color: "#fff", background: "#333", border: "none", borderRadius: 8, cursor: "pointer"
          }}
        >
          홈으로 돌아가기
        </button>
        <p style={{ color: "#999", marginTop: "16px", fontSize: "14px" }}>2초 후 자동으로 홈으로 이동합니다...</p>
      </div>
    );
  }

  // 정상 상태: 작품 상세 페이지
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "sans-serif" }}>

      {/* 1. 메인 작품 이미지 */}
      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 32, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        {imageError ? (
          <div style={{
            width: "100%", aspectRatio: "16/9", background: "#f5f5f5",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px"
          }}>
            <img 
              src="/NotFound.png" 
              alt="이미지를 불러올 수 없음" 
              style={{ maxWidth: "120px", opacity: 0.4 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <p style={{ color: "#999", fontSize: "14px" }}>이미지를 불러올 수 없습니다</p>
          </div>
        ) : (
          <img 
            src={artwork.src} 
            alt={artwork.title} 
            style={{ width: "100%", display: "block" }}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* 2. 제목 영역 */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 16px 0", lineHeight: 1.3 }}>
          {artwork.title}
        </h1>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px", color: "#666" }}>{artwork.artist}</span>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            style={{
              padding: "8px 20px",
              background: isFollowing ? "#f7cc70" : "#d4b87a",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              if (!isFollowing) e.currentTarget.style.background = "#d4b87a";
            }}
            onMouseOut={(e) => {
              if (!isFollowing) e.currentTarget.style.background = "#beab82";
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      {/* 3. 반응 영역 (좋아요, 팬레터) */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        gap: "12px", 
        paddingBottom: "32px",
        borderBottom: "1px solid #eee",
        marginBottom: "40px"
      }}>
        <button
          onClick={handleLike}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 24px",
            background: isLiked ? "#ff4d4f" : "#fff",
            color: isLiked ? "#fff" : "#333",
            border: "1px solid #e0e0e0",
            borderRadius: 24,
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}
          onMouseOver={(e) => {
            if (!isLiked) {
              e.currentTarget.style.background = "#fafafa";
              e.currentTarget.style.borderColor = "#d0d0d0";
            }
          }}
          onMouseOut={(e) => {
            if (!isLiked) {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#e0e0e0";
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "#fff" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {likeCount}
        </button>

        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 24px",
            background: "#fff",
            color: "#333",
            border: "1px solid #e0e0e0",
            borderRadius: 24,
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#fafafa";
            e.currentTarget.style.borderColor = "#d0d0d0";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.borderColor = "#e0e0e0";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Send fan letter
        </button>
      </div>

      {/* 4. 작품 설명 */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", textAlign: "center" }}>
          Artwork Description
        </h2>
        <p style={{ 
          fontSize: "15px", 
          lineHeight: 1.8, 
          color: "#555",
          textAlign: "center",
          margin: "0 auto",
          maxWidth: "600px"
        }}>
          {artwork.description}
        </p>
      </section>

      {/* 5. 태그 */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
        {artwork.tags.map((tag: string, index: number) => (
          <span
            key={index}
            style={{
              padding: "6px 14px",
              background: "#f5f5f5",
              borderRadius: 20,
              fontSize: "13px",
              color: "#666",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "#e8e8e8"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* 6. 댓글 섹션 */}
      <section style={{ marginBottom: 60 }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center",
          gap: "8px",
          marginBottom: 20 
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "#666" }}>
            Comments
          </h3>
          <span style={{ fontSize: "14px", color: "#999", fontWeight: "500" }}>
            ({comments.length})
          </span>
        </div>
        <CommentForm placeholder="Add your comment..." onAdd={addComment} />
        <CommentList
          comments={comments}
          onDelete={deleteComment}
          onUpdate={updateComment}
          onAddReply={addReply}
        />
      </section>

      {/* 7. 유사 작품 섹션 */}
      <section style={{ borderTop: "1px solid #eee", paddingTop: 40, marginBottom: 60 }}>
        <h3 style={{ marginBottom: 24, fontSize: "20px", fontWeight: "700" }}>유사한 작품</h3>

        <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "space-between" }}>
          {artworks
            .filter((item: any) => item.id !== artwork.id)
            .slice(0, 4)
            .map((item: any, index: number) => (
              <div
                key={`similar-${item.id}-${index}`}
                onClick={() => navigate(`/artworks/${item.id}`)}
                style={{
                  flex: 1, aspectRatio: "1/1", position: "relative", cursor: "pointer",
                  borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  transition: "transform 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  const img = e.currentTarget.querySelector('img');
                  const overlay = e.currentTarget.querySelector('div');
                  if (img) (img as HTMLElement).style.filter = "grayscale(0)";
                  if (overlay) (overlay as HTMLElement).style.opacity = "1";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  const img = e.currentTarget.querySelector('img');
                  const overlay = e.currentTarget.querySelector('div');
                  if (img) (img as HTMLElement).style.filter = "grayscale(1)";
                  if (overlay) (overlay as HTMLElement).style.opacity = "0";
                }}
              >
                <img
                  src={item.src}
                  alt={item.id}
                  style={{ 
                    width: "100%", height: "100%", objectFit: "cover", display: "block",
                    filter: "grayscale(1)", transition: "filter 0.3s ease"
                  }}
                />
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0, 0, 0, 0.3)", display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center", color: "#fff",
                  textAlign: "center", padding: "10px", opacity: 0, transition: "opacity 0.3s ease"
                }}>
                  <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "4px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    Garsington Opera Pavilion #{item.id.replace('a', '')}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.9, letterSpacing: "0.5px" }}>
                    ARTIST {item.id.replace('a', '')}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 8. 추천 작품 섹션 */}
      <section style={{ borderTop: "1px solid #eee", paddingTop: 40 }}>
        <h3 style={{ marginBottom: 24, fontSize: "20px", fontWeight: "700" }}>추천 작품</h3>

        <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "space-between" }}>
          {artworks.slice(0, 4).map((item: any, index: number) => (
            <div
              key={`recommend-${item.id}-${index}`}
              onClick={() => navigate(`/artworks/${item.id}`)}
              style={{
                flex: 1, aspectRatio: "1/1", position: "relative", cursor: "pointer",
                borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition: "transform 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                const img = e.currentTarget.querySelector('img');
                const overlay = e.currentTarget.querySelector('div');
                if (img) (img as HTMLElement).style.filter = "grayscale(0)";
                if (overlay) (overlay as HTMLElement).style.opacity = "1";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                const img = e.currentTarget.querySelector('img');
                const overlay = e.currentTarget.querySelector('div');
                if (img) (img as HTMLElement).style.filter = "grayscale(1)";
                if (overlay) (overlay as HTMLElement).style.opacity = "0";
              }}
            >
              <img
                src={item.src}
                alt={item.id}
                style={{ 
                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                  filter: "grayscale(1)", transition: "filter 0.3s ease"
                }}
              />
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0, 0, 0, 0.3)", display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center", color: "#fff",
                textAlign: "center", padding: "10px", opacity: 0, transition: "opacity 0.3s ease"
              }}>
                <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "4px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  Garsington Opera Pavilion #{item.id.replace('a', '')}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.9, letterSpacing: "0.5px" }}>
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