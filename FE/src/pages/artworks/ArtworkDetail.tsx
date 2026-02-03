// FE/src/pages/artworks/ArtworkDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../features/auth/store";
import { http } from "../../shared/api/http"; // ✅ 실서버 호출용
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

type ArtworkDetailData = {
  id: string | number;
  src: string;

  title: string;
  artist: string;
  description: string;
  tags: string[];

  // 팬레터/프로필 이동용(서버 응답에 맞춰 채움)
  artistMemberUuid?: string;
  artistId?: string;
  artistName?: string;
};

/* ---------------- helpers (no any) ---------------- */
type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : isObject(x) ? asString(get(x, "name"), "") : ""))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
function pickEnvelopeData(raw: unknown): unknown {
  // 공통 envelope: { isSuccess, data, ... }면 data만
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

function normalizeArtworkId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^artwork-/, "").replace(/^review-/, "");
}

/**
 * ⚠️ http baseURL이 "/api/v1" 포함이면 "/artworks"로 바꿔.
 */
const ARTWORK_DETAIL_PATH = "/api/v1/artworks";

function mapArtworkDetail(payload: unknown): ArtworkDetailData | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  // id
  const idRaw = get(body, "artworkId") ?? get(body, "id");
  const idStr = asString(idRaw, "");
  const idNum = typeof idRaw === "number" ? idRaw : asNumber(idRaw, NaN);
  const id: string | number = Number.isFinite(idNum) ? idNum : idStr;

  // title/desc
  const title = asString(get(body, "title"), "Untitled");
  const description =
    asString(get(body, "description"), "") || asString(get(body, "content"), "");

  // image
  const src =
    asString(get(body, "imageUrl"), "") ||
    asString(get(body, "thumbnailUrl"), "") ||
    asString(get(body, "src"), "");

  // tags
  const tags =
    asStringArray(get(body, "tags")) ||
    asStringArray(get(body, "tagList")) ||
    [];

  // artist info (서버 필드명 여러 케이스 방어)
  const artistMemberUuid =
    asString(get(body, "artistMemberUuid"), "") ||
    asString(get(body, "artistUuid"), "") ||
    asString(get(body, "artistId"), "") ||
    "";

  const artistName =
    asString(get(body, "artistName"), "") ||
    asString(get(body, "artist"), "") ||
    asString(get(body, "nickname"), "") ||
    "";

  // 화면에 보여줄 artist 문자열
  const artist = artistName || (artistMemberUuid ? `ARTIST ${artistMemberUuid.slice(0, 4)}` : "Unknown");

  if (!id || !src) {
    // 상세에서 이미지가 필수인 UI면 null 처리(원하면 src 없어도 허용하도록 바꿔도 됨)
    return null;
  }

  return {
    id,
    src,
    title,
    artist,
    description: description || "설명이 없습니다.",
    tags: tags.length ? tags : ["현대미술"],
    artistMemberUuid: artistMemberUuid || undefined,
    artistId: artistMemberUuid || undefined,
    artistName: artistName || undefined,
  };
}

export default function ArtworkDetail() {
  const { artworkId = "" } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();

  const normalizedArtworkId = useMemo(() => normalizeArtworkId(artworkId), [artworkId]);

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

  const [artwork, setArtwork] = useState<ArtworkDetailData | null>(null);

  // ✅ 목데이터가 없으니 일단 빈 배열
  const similarArtworks = useMemo(() => [], []);
  const recommendArtworks = useMemo(() => [], []);

  const numericArtworkId = useMemo(() => {
    const n = parseInt(String(normalizedArtworkId), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [normalizedArtworkId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [normalizedArtworkId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setImageError(false);
        setArtwork(null);

        if (!normalizedArtworkId) throw new Error("작품 ID가 없습니다.");

        const res = await http.get(`${ARTWORK_DETAIL_PATH}/${normalizedArtworkId}`);

        // axios 스타일({ data }) or 래퍼가 data만 리턴 둘 다 대응
        const payload =
          isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);

        const mapped = mapArtworkDetail(payload);

        if (cancelled) return;
        setArtwork(mapped);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setArtwork(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
    if (!artwork) return;

    const safeArtworkId =
      numericArtworkId ??
      (typeof artwork.id === "number" ? artwork.id : Number(artwork.id));

    if (!Number.isFinite(safeArtworkId)) return alert("작품 ID를 확인할 수 없습니다.");

    const artistMemberUuid = artwork.artistMemberUuid ?? "";
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
