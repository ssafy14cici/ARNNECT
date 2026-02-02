// FE/src/pages/artwork/ArtworkDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { artworks } from "../../features/artwork/data";
import "./artworkDetail.css";

import { useAuthStore } from "../../features/auth/store";
import { ArtworkDetailView } from "./ArtworkDetailView";
import {
  findArtworkById,
  getMockArtworkData,
  type Comment,
  type ArtworkBase,
  toArtworkNumericId,
} from "../../features/artwork/helpers";
import { sendFanLetter } from "../../features/fanLetter/api";

export const PROFILE_PATH = (authorId: string) => `/profile/${authorId}`;

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // ✅ FanLetter 모달 상태 (중복 선언 절대 금지)
  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterSending, setFanLetterSending] = useState(false);

  const ARTWORKS = artworks as unknown as readonly ArtworkBase[];

  const baseArtwork = useMemo(() => findArtworkById(ARTWORKS, id), [ARTWORKS, id]);

  const artwork = useMemo(() => (baseArtwork ? getMockArtworkData(baseArtwork) : null), [baseArtwork]);

  const similarArtworks = useMemo(() => {
    if (!artwork) return [];
    return ARTWORKS.filter((item) => item.id !== artwork.id).slice(0, 4);
  }, [ARTWORKS, artwork]);

  const recommendArtworks = useMemo(() => ARTWORKS.slice(0, 4), [ARTWORKS]);

  // ✅ numeric artwork id (FanLetter payload용) : null이면 undefined로 바꿔서 안전하게
  const numericArtworkId = useMemo(() => {
    const n = toArtworkNumericId(baseArtwork?.id ?? id);
    return n ?? undefined;
  }, [baseArtwork?.id, id]);

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
      const timer = setTimeout(() => navigate("/", { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [artwork, isLoading, navigate]);

  const handleLike = () => {
    setIsLiked((prevLiked) => {
      setLikeCount((prev) => (prevLiked ? prev - 1 : prev + 1));
      return !prevLiked;
    });
  };

  const addComment = (content: string) => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      return;
    }

    const authorId = user?.memberUuid ?? "me";
    const authorName = user?.name ?? "나";

    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        parentId: null,
        content,
        authorId,
        authorName,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const addReply = (parentId: string, content: string) => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      return;
    }

    const authorId = user?.memberUuid ?? "me";
    const authorName = user?.name ?? "나";

    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        parentId,
        content,
        authorId,
        authorName,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const deleteComment = (commentId: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
    }
  };

  const updateComment = (commentId: string, newContent: string) => {
    const value = newContent.trim();
    if (!value) return;
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: value } : c)));
  };

  // ✅ FanLetter 발송
  const onSendFanLetter = async (content: string) => {
    if (!isLoggedIn || !user?.memberUuid) {
      alert("로그인 후 이용해주세요.");
      return;
    }
    if (!artwork) return;

    // ✅ artworkId: number로 보장 (null/undefined면 artwork.id로 fallback)
    const safeArtworkId =
      numericArtworkId ?? (typeof artwork.id === "number" ? artwork.id : Number(artwork.id));

    if (!Number.isFinite(safeArtworkId)) {
      alert("작품 ID를 확인할 수 없습니다.");
      return;
    }

    setFanLetterSending(true);
    try {
      await sendFanLetter({
        artworkId: safeArtworkId,
        artworkTitle: artwork.title,
        artistName: artwork.artist,
        senderId: user.memberUuid,
        senderName: user.name,
        content,
      });

      alert("팬레터가 발송되었습니다.");
      setFanLetterOpen(false);
    } catch (e) {
      console.error(e);
      alert("팬레터 발송에 실패했습니다.");
    } finally {
      setFanLetterSending(false);
    }
  };

  const goHome = () => navigate("/");
  const goArtwork = (artworkId: string) => navigate(`/artworks/${artworkId}`);

  return (
    <ArtworkDetailView
      artwork={artwork}
      similarArtworks={similarArtworks}
      recommendArtworks={recommendArtworks}
      isLoading={isLoading}
      imageError={imageError}
      isFollowing={isFollowing}
      isLiked={isLiked}
      likeCount={likeCount}
      comments={comments}
      setImageError={setImageError}
      onToggleFollow={() => setIsFollowing((prev) => !prev)}
      onLike={handleLike}
      onAddComment={addComment}
      onAddReply={addReply}
      onDeleteComment={deleteComment}
      onUpdateComment={updateComment}
      onGoHome={goHome}
      onNavigateArtwork={goArtwork}
      profilePath={PROFILE_PATH}
      // ✅ FanLetter
      fanLetterOpen={fanLetterOpen}
      fanLetterSending={fanLetterSending}
      onOpenFanLetter={() => {
        if (!isLoggedIn) {
          alert("로그인이 필요합니다.");
          return;
        }
        setFanLetterOpen(true);
      }}
      onCloseFanLetter={() => setFanLetterOpen(false)}
      onSendFanLetter={onSendFanLetter}
    />
  );
}
