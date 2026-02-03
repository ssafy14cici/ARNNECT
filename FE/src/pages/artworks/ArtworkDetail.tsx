import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../features/auth/store";
import { artworks } from "../../features/artworks/data"; // 기존 유지
import "./artworkDetail.css";

import ArtworkDetailView from "./ArtworkDetailView";
import { sendFanLetter } from "../../features/fanLetter/api";

/** ✅ canonical */
export const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

/** 기존 로컬 댓글 타입(그대로 유지) */
export type LocalComment = {
  id: string;
  parentId: string | null;
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
};

type ArtworkBase = {
  readonly id: string | number;
  readonly src: string;

  readonly title?: string;
  readonly artist?: string;
  readonly artistName?: string;

  readonly artistId?: string;
  readonly artistMemberUuid?: string;

  readonly description?: string;
  readonly tags?: readonly string[];

  readonly [key: string]: any;
};

type ArtworkDetailData = ArtworkBase & {
  title: string;
  artist: string;
  description: string;
  tags: string[];
};

function normalizeArtworkId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^artwork-/, "").replace(/^review-/, "");
}

function toArtworkNumericId(id: unknown): number | null {
  const normalizedRaw = normalizeArtworkId(id);

  if (typeof id === "number" && Number.isFinite(id)) return id;

  const s = normalizedRaw;
  if (!s) return null;

  const normalized = s.startsWith("a") ? s.slice(1) : s;
  const n = parseInt(normalized, 10);
  if (Number.isNaN(n)) return null;

  if (n >= 1000) return n - 999;
  return n;
}

function findArtworkById(list: readonly ArtworkBase[], id?: string) {
  const normalized = normalizeArtworkId(id);
  if (!normalized) return null;

  const urlId = String(normalized);

  return (
    list.find((item) => {
      const itemId = String(normalizeArtworkId(item.id));

      if (
        itemId === urlId ||
        itemId === `a${urlId}` ||
        itemId.replace(/^a/, "") === urlId.replace(/^a/, "")
      ) {
        return true;
      }

      const numericUrlId = parseInt(urlId.replace(/^a/, ""), 10);
      const numericItemId = parseInt(itemId.replace(/^a/, ""), 10);

      if (Number.isNaN(numericUrlId) || Number.isNaN(numericItemId)) return false;

      if (numericUrlId >= 1000) {
        const expectedItemId = numericUrlId - 999;
        return numericItemId === expectedItemId;
      }
      return false;
    }) || null
  );
}

function getMockArtworkData(baseArtwork: ArtworkBase): ArtworkDetailData {
  const rawId = normalizeArtworkId(baseArtwork.id);
  const artworkNumber = String(rawId).replace(/^a/, "");

  const title = baseArtwork.title || `Artwork #${artworkNumber}`;
  const artist = baseArtwork.artist || baseArtwork.artistName || `ARTIST ${artworkNumber}`;

  const description =
    baseArtwork.description ||
    `이 작품은 현대적 감각의 시리즈로, 빛과 공간의 대비를 통해 새로운 시각적 경험을 제공합니다.`;

  const tags = baseArtwork.tags ? [...baseArtwork.tags] : ["현대미술", "시리즈", "공간", "빛"];

  return {
    ...baseArtwork,
    title,
    artist,
    description,
    tags,
  };
}

export default function ArtworkDetail() {
  const { artworkId = "" } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();

  const normalizedArtworkId = useMemo(
    () => artworkId.replace(/^artwork-/, ""),
    [artworkId],
  );

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [comments, setComments] = useState<LocalComment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterSending, setFanLetterSending] = useState(false);

  const ARTWORKS = artworks as unknown as readonly ArtworkBase[];

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

  useEffect(() => {
    if (!isLoading && !artwork) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 1200);
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
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

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
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

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
    if (!window.confirm("삭제하시겠습니까?")) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
  };

  const updateComment = (commentId: string, newContent: string) => {
    const value = newContent.trim();
    if (!value) return;
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: value } : c)));
  };

  const onSendFanLetter = async (content: string) => {
    if (!isLoggedIn || !user?.memberUuid) return alert("로그인 후 이용해주세요.");
    if (!artwork || !baseArtwork) return;

    const safeArtworkId =
      numericArtworkId ?? (typeof artwork.id === "number" ? artwork.id : Number(artwork.id));

    if (!Number.isFinite(safeArtworkId)) return alert("작품 ID를 확인할 수 없습니다.");

    const artistMemberUuid =
      (baseArtwork as any)?.artistMemberUuid ?? (baseArtwork as any)?.artistId ?? "";

    if (!artistMemberUuid) return alert("작가 정보를 확인할 수 없습니다.");

    setFanLetterSending(true);
    try {
      await sendFanLetter({
        artistMemberUuid,
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
      fanLetterOpen={fanLetterOpen}
      fanLetterSending={fanLetterSending}
      onOpenFanLetter={() => {
        if (!isLoggedIn) return alert("로그인이 필요합니다.");
        setFanLetterOpen(true);
      }}
      onCloseFanLetter={() => setFanLetterOpen(false)}
      onSendFanLetter={onSendFanLetter}
    />
  );
}
