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

// ✅ canonical로 통일
export const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

export default function ArtworkDetail() {
  // ✅ routes.tsx: /artworks/:artworkId 이므로 artworkId로 받아야 함
  const { artworkId = "" } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();

  // ✅ 혹시 legacy로 /artworks/artwork-a1 같이 들어오면 정리
  const normalizedArtworkId = useMemo(
    () => artworkId.replace(/^artwork-/, ""),
    [artworkId],
  );

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // ✅ FanLetter 모달 상태
  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterSending, setFanLetterSending] = useState(false);

  const ARTWORKS = artworks as unknown as readonly ArtworkBase[];

  // ✅ id로 작품 찾기 (normalizedArtworkId 사용)
  const baseArtwork = useMemo(
    () => findArtworkById(ARTWORKS, normalizedArtworkId),
    [ARTWORKS, normalizedArtworkId],
  );

  const artwork = useMemo(
    () => (baseArtwork ? getMockArtworkData(baseArtwork) : null),
    [baseArtwork],
  );

  const similarArtworks = useMemo(() => {
    if (!baseArtwork) return [];
    return ARTWORKS.filter((item) => String(item.id) !== String(baseArtwork.id)).slice(0, 4);
  }, [ARTWORKS, baseArtwork]);

  const recommendArtworks = useMemo(() => ARTWORKS.slice(0, 4), [ARTWORKS]);

  // ✅ numeric artwork id (FanLetter payload용)
  const numericArtworkId = useMemo(() => {
    const n = toArtworkNumericId(baseArtwork?.id ?? normalizedArtworkId);
    return n ?? undefined;
  }, [baseArtwork?.id, normalizedArtworkId]);

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [normalizedArtworkId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [normalizedArtworkId]);

  // ✅ 작품 없으면 홈으로 (지금 UI에서 Not Found를 보여주고 있으니 이건 취향)
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
    if (!artwork || !baseArtwork) return;

    // ✅ artworkId: number로 보장
    const safeArtworkId =
      numericArtworkId ?? (typeof artwork.id === "number" ? artwork.id : Number(artwork.id));

    if (!Number.isFinite(safeArtworkId)) {
      alert("작품 ID를 확인할 수 없습니다.");
      return;
    }

    // ✅ FanLetterSendInput 필수 필드: artistMemberUuid
    // data.ts에 추가했지만, ArtworkBase 타입에 없을 수 있어서 any로 안전 접근
    const artistMemberUuid =
      (baseArtwork as any)?.artistMemberUuid ?? (baseArtwork as any)?.artistId ?? "";

    if (!artistMemberUuid) {
      alert("작가 정보를 확인할 수 없습니다.");
      return;
    }

    setFanLetterSending(true);
    try {
      await sendFanLetter({
        artistMemberUuid,            // ✅ 추가 (타입 에러 해결)
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
  const goArtwork = (nextArtworkId: string) => navigate(`/artworks/${nextArtworkId}`);

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
