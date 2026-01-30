//FE/src/pages/artwork/ArtworkDetail.tsx
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
} from "../../features/artwork/helpers";

export const PROFILE_PATH = (authorId: string) => `/profile/${authorId}`;

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ✅ 로그인 유저 정보(진짜 이름/uuid)
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const ARTWORKS = artworks as unknown as readonly ArtworkBase[];

  const baseArtwork = useMemo(
    () => findArtworkById(ARTWORKS, id),
    [ARTWORKS, id],
  );

  const artwork = useMemo(
    () => (baseArtwork ? getMockArtworkData(baseArtwork) : null),
    [baseArtwork],
  );

  const similarArtworks = useMemo(() => {
    if (!artwork) return [];
    return ARTWORKS.filter((item) => item.id !== artwork.id).slice(0, 4);
  }, [ARTWORKS, artwork]);

  const recommendArtworks = useMemo(() => ARTWORKS.slice(0, 4), [ARTWORKS]);

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

    const authorId = user?.memberUuid ?? "me"; // ✅ user 없으면 /profile/me 로
    const authorName = user?.name ?? "나"; // ✅ user 없으면 임시 표시

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
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
      );
    }
  };

  const updateComment = (commentId: string, newContent: string) => {
    const value = newContent.trim();
    if (!value) return; // 빈 값 저장 방지
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: value } : c)),
    );
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
    />
  );
}
