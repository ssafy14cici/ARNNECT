// FE/src/pages/artwork/ArtworkDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthStore } from "../../features/auth/store";
import { http } from "../../shared/api/http";
import { sendFanLetter } from "../../features/fanLetter/api";
import "./artworkDetail.css";

// ------------------- [Types & Helpers] -------------------
export const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

export type LocalComment = {
  id: string;
  parentId: string | null;
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
};

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
function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
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
 * ✅ 이미지 URL 정규화
 * - BE가 https://domain/... (절대 URL)로 주면 그대로 사용
 * - /review/xxx, review/xxx 같은 상대경로가 섞여도 origin 붙여서 보정
 *
 * NOTE:
 * - 이미지 경로가 API_BASE(/api/v1)랑 다를 수 있어서 origin만 사용
 */
function resolveMediaUrl(input?: string | null): string {
  const u = String(input ?? "").trim();
  if (!u || u === "null" || u === "undefined") return "";

  // 이미 완성된 URL이면 그대로
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) return u;

  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  let origin = "";
  try {
    if (apiBase) origin = new URL(apiBase).origin;
  } catch {
    origin = "";
  }

  const path = u.startsWith("/") ? u : `/${u}`;
  return origin ? `${origin}${path}` : path;
}

/** Authorization 토큰 추출 (store 구조가 token/accessToken 둘 다 가능) */
type AuthStateLike = {
  token?: string | null;
  accessToken?: string | null;
};
function getAccessTokenFromStore(): string | null {
  const s = useAuthStore.getState() as unknown as AuthStateLike;
  return (s.token ?? s.accessToken ?? null) || null;
}

/**
 * <img>는 Authorization 헤더를 못 붙이니까,
 * 이미지 엔드포인트가 인증 필요(401/403)면 깨짐.
 * 그때 fetch + Authorization으로 blob 받아서 objectURL로 표시하는 fallback.
 */
async function fetchImageAsObjectUrl(imageUrl: string): Promise<string | null> {
  const url = resolveMediaUrl(imageUrl);
  if (!url) return null;

  const token = getAccessTokenFromStore();

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return null;

    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;

    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

const ARTWORK_DETAIL_PATH = "/api/v1/artworks";
const REVIEWS_BY_ARTWORK_PATH = "/api/v1/reviews";
const FAVORITES_TOGGLE_PATH = "/api/v1/favorites";

// ------------------- Artwork Mapper -------------------
type ArtworkDetailData = {
  id: string | number;
  src: string;
  title: string;
  artist: string;
  description: string;
  tags: string[];

  // ✅ 오너 판별에 쓰는 값: "작품의 작가 member uuid"
  artistMemberUuid?: string;
  artistId?: string;
  artistName?: string;

  // ✅ 좋아요 초기값(서버가 내려주면 사용)
  favoriteCount?: number;
  isFavorited?: boolean;
};

function mapArtworkDetail(payload: unknown): ArtworkDetailData | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  const idRaw = get(body, "artworkId") ?? get(body, "id");
  const idStr = asString(idRaw, "");
  const idNum = typeof idRaw === "number" ? idRaw : asNumber(idRaw, NaN);
  const id: string | number = Number.isFinite(idNum) ? idNum : idStr;

  const title = asString(get(body, "title"), "Untitled");
  const description = asString(get(body, "description"), "") || asString(get(body, "content"), "");

  const rawSrc =
    asString(get(body, "imageUrl"), "") ||
    asString(get(body, "thumbnailUrl"), "") ||
    asString(get(body, "src"), "");

  const src = resolveMediaUrl(rawSrc);

  const tags = asStringArray(get(body, "tags")) || asStringArray(get(body, "tagList")) || [];

  const artistMemberUuid =
    asString(get(body, "artistMemberUuid"), "") ||
    asString(get(body, "artistUuid"), "") ||
    asString(get(body, "artistId"), "") ||
    asString(get(body, "memberUuid"), "") ||
    "";

  const artistName =
    asString(get(body, "artistName"), "") ||
    asString(get(body, "artist"), "") ||
    asString(get(body, "nickname"), "") ||
    "";

  const artist = artistName || (artistMemberUuid ? `ARTIST ${artistMemberUuid.slice(0, 4)}` : "Unknown");

  // ✅ 좋아요 값(있으면)
  const favoriteCount =
    asNumber(get(body, "favoriteCount"), asNumber(get(body, "likeCount"), asNumber(get(body, "count"), NaN)));
  const isFavorited =
    asBool(get(body, "isFavorited"), asBool(get(body, "favorited"), asBool(get(body, "isFavorite"), false)));

  if (!id || !src) return null;

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
    favoriteCount: Number.isFinite(favoriteCount) ? favoriteCount : undefined,
    isFavorited: typeof isFavorited === "boolean" ? isFavorited : undefined,
  };
}

// ------------------- Reviews List Mapper -------------------
type ReviewSummary = {
  reviewId: string | number;
  title: string;
  imageUrl?: string;
};

function mapReviewSummary(v: unknown): ReviewSummary | null {
  if (!isObject(v)) return null;

  const reviewIdRaw = get(v, "reviewId") ?? get(v, "id");
  const reviewId = typeof reviewIdRaw === "number" ? reviewIdRaw : asString(reviewIdRaw, "").trim();
  if (!reviewId && reviewId !== 0) return null;

  const title = asString(get(v, "title"), "Untitled");
  const imageUrl = asString(get(v, "imageUrl"), "").trim();

  return {
    reviewId,
    title,
    imageUrl: imageUrl || undefined,
  };
}

function mapReviewList(payload: unknown): ReviewSummary[] {
  const body = pickEnvelopeData(payload);

  if (Array.isArray(body)) {
    return body.map(mapReviewSummary).filter(Boolean) as ReviewSummary[];
  }

  if (isObject(body)) {
    const arr = get(body, "items") ?? get(body, "reviews") ?? get(body, "content") ?? get(body, "list");
    if (Array.isArray(arr)) {
      return arr.map(mapReviewSummary).filter(Boolean) as ReviewSummary[];
    }
  }

  return [];
}

// ------------------- Favorites(Toggle) -------------------
type FavoriteToggleResult = {
  isFavorited?: boolean;
  favoriteCount?: number;
};

function parseFavoriteToggleResult(payload: unknown): FavoriteToggleResult {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return {};

  const isFavorited =
    asBool(get(body, "isFavorited"), asBool(get(body, "favorited"), asBool(get(body, "isFavorite"), undefined as any)));

  const favoriteCount =
    asNumber(get(body, "favoriteCount"), asNumber(get(body, "likeCount"), asNumber(get(body, "count"), undefined as any)));

  const out: FavoriteToggleResult = {};
  if (typeof isFavorited === "boolean") out.isFavorited = isFavorited;
  if (typeof favoriteCount === "number" && Number.isFinite(favoriteCount)) out.favoriteCount = favoriteCount;
  return out;
}

async function toggleFavoriteOnServer(artworkId: number): Promise<FavoriteToggleResult> {
  const res = await http.post(FAVORITES_TOGGLE_PATH, { artworkId });
  const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);
  return parseFavoriteToggleResult(payload);
}

// ------------------- [Main Component] -------------------
export default function ArtworkDetail() {
  const { artworkId = "" } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();

  const normalizedArtworkId = useMemo(() => normalizeArtworkId(artworkId), [artworkId]);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // Data State
  const [artwork, setArtwork] = useState<ArtworkDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reviews
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // UI State
  const [imageError, setImageError] = useState(false);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Input State
  const [commentText, setCommentText] = useState("");
  const [fanLetterText, setFanLetterText] = useState("");

  // Modal State
  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterSending, setFanLetterSending] = useState(false);

  // ✅ img src 표시용 (원본 URL 또는 blob objectURL)
  const [displayImgSrc, setDisplayImgSrc] = useState<string>("");
  const blobUrlRef = useRef<string | null>(null);
  const [triedAuthBlob, setTriedAuthBlob] = useState(false);

  const numericArtworkId = useMemo(() => {
    const n = parseInt(String(normalizedArtworkId), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [normalizedArtworkId]);

  // ✅ 내 작품 판별: "현재 로그인 user.memberUuid" === "작품의 artistMemberUuid"
  const isOwner = useMemo(() => {
    const me = String(user?.memberUuid ?? "").trim();
    const owner = String(artwork?.artistMemberUuid ?? artwork?.artistId ?? "").trim();
    return !!me && !!owner && me === owner;
  }, [user?.memberUuid, artwork?.artistMemberUuid, artwork?.artistId]);

  const rootComments = useMemo(() => comments.filter((c) => c.parentId == null), [comments]);

  const repliesByParent = useMemo(() => {
    const m = new Map<string, LocalComment[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      const list = m.get(c.parentId) ?? [];
      list.push(c);
      m.set(c.parentId, list);
    }
    return m;
  }, [comments]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [normalizedArtworkId]);

  // ✅ 작품 상세
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setImageError(false);
        setTriedAuthBlob(false);
        setArtwork(null);

        // 이전 blob URL 정리
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setDisplayImgSrc("");

        if (!normalizedArtworkId) throw new Error("작품 ID가 없습니다.");

        const res = await http.get(`${ARTWORK_DETAIL_PATH}/${normalizedArtworkId}`);
        const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);
        const mapped = mapArtworkDetail(payload);

        if (cancelled) return;

        setArtwork(mapped);

        // ✅ 기본은 BE가 준 URL을 그대로 표시
        if (mapped?.src) setDisplayImgSrc(mapped.src);

        // ✅ 좋아요 초기값(서버가 주면 동기화)
        if (typeof mapped?.isFavorited === "boolean") setIsLiked(mapped.isFavorited);
        if (typeof mapped?.favoriteCount === "number" && Number.isFinite(mapped.favoriteCount)) {
          setLikeCount(mapped.favoriteCount);
        }
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

  // ✅ 작품 감상평 리스트
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const safeId = numericArtworkId ?? (typeof artwork?.id === "number" ? artwork.id : Number(artwork?.id));
      if (!safeId || !Number.isFinite(safeId)) return;

      try {
        setReviewsLoading(true);
        setReviewsError(null);

        const res = await http.get(`${REVIEWS_BY_ARTWORK_PATH}?artworkId=${encodeURIComponent(String(safeId))}`);
        const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);

        const list = mapReviewList(payload);

        if (cancelled) return;
        setReviews(list);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setReviews([]);
        setReviewsError("감상평을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [numericArtworkId, artwork?.id]);

  useEffect(() => {
    if (!isLoading && !artwork) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 1200);
      return () => clearTimeout(timer);
    }
  }, [artwork, isLoading, navigate]);

  // ------------------- Handlers -------------------
  const handleToggleFavorite = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const safeId =
      numericArtworkId ?? (typeof artwork?.id === "number" ? artwork.id : Number(artwork?.id));
    if (!safeId || !Number.isFinite(safeId)) return;

    // ✅ 옵티미스틱 업데이트
    const prevLiked = isLiked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;
    setIsLiked(nextLiked);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

    try {
      const result = await toggleFavoriteOnServer(safeId);

      // ✅ 서버가 최종값 내려주면 동기화
      if (typeof result.isFavorited === "boolean") setIsLiked(result.isFavorited);
      if (typeof result.favoriteCount === "number" && Number.isFinite(result.favoriteCount)) {
        setLikeCount(result.favoriteCount);
      }
    } catch (e) {
      console.error(e);
      // ❌ 실패 시 롤백
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      alert("좋아요 처리 실패");
    }
  };

  const addComment = (content: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    const authorId = user?.memberUuid ?? "me";
    const authorName = user?.name ?? "나";
    setComments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), parentId: null, content, authorId, authorName, createdAt: new Date().toISOString() },
    ]);
  };

  const addReply = (parentId: string, content: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    const authorId = user?.memberUuid ?? "me";
    const authorName = user?.name ?? "나";
    setComments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), parentId, content, authorId, authorName, createdAt: new Date().toISOString() },
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

    const safeId = numericArtworkId ?? (typeof artwork.id === "number" ? artwork.id : Number(artwork.id));

    setFanLetterSending(true);
    try {
      await sendFanLetter({
        artistMemberUuid: artwork.artistMemberUuid ?? "",
        artworkId: safeId,
        artworkTitle: artwork.title,
        artistName: artwork.artist,
        senderId: user.memberUuid,
        senderName: user.name,
        content,
      });

      alert("팬레터가 발송되었습니다.");
      setFanLetterOpen(false);
      setFanLetterText("");
    } catch (e) {
      console.error(e);
      alert("팬레터 발송 실패");
    } finally {
      setFanLetterSending(false);
    }
  };

  const onDeleteArtwork = async () => {
    if (!artwork) return;
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!isOwner) return alert("본인 작품만 삭제할 수 있습니다.");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const id = normalizedArtworkId || String(artwork.id);
      await http.delete(`${ARTWORK_DETAIL_PATH}/${id}`);
      alert("삭제되었습니다.");
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const goHome = () => navigate("/");
  const goReview = (id: string | number) => navigate(`/reviews/${id}`);

  // ✅ 유저가 말한 edit 이동 경로: /artworks/:artworkId
  const goEditArtwork = () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!isOwner) return alert("본인 작품만 수정할 수 있습니다.");
    navigate(`/artworks/${normalizedArtworkId}`);
  };

  /**
   * ✅ hero 이미지 로딩 실패 시 fallback:
   * - 첫 실패: 토큰 포함 fetch로 blob 받아 objectURL 적용 시도
   * - 두 번째 실패: 최종 imageError 처리
   */
  const handleImageError = async () => {
    if (imageError) return;

    if (triedAuthBlob) {
      setImageError(true);
      return;
    }

    setTriedAuthBlob(true);

    const raw = artwork?.src ?? "";
    if (!raw) {
      setImageError(true);
      return;
    }

    const objUrl = await fetchImageAsObjectUrl(raw);
    if (!objUrl) {
      setImageError(true);
      return;
    }

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = objUrl;

    setImageError(false);
    setDisplayImgSrc(objUrl);
  };

  // unmount 시 blob URL 정리
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    };
  }, []);

  // ------------------- Render -------------------
  if (isLoading) {
    return (
      <div className="artwork-detail-page" style={{ display: "grid", placeItems: "center" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="artwork-detail-page" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h2>작품을 찾을 수 없습니다.</h2>
          <button className="btn-icon" onClick={goHome} style={{ marginTop: 20 }}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="artwork-detail-page">
      {/* --- 1. Hero Section (Sticky Parallax) --- */}
      <section className="artwork-hero">
        <div className="hero-content">
          <h1 className="hero-title">{artwork.title}</h1>
          <div className="hero-artist">by {artwork.artist}</div>

          <div className="hero-frame">
            {imageError ? (
              <div style={{ width: 400, height: 500, background: "#222", display: "grid", placeItems: "center" }}>
                Image Error
              </div>
            ) : (
              <img
                src={displayImgSrc || artwork.src}
                alt={artwork.title}
                className="hero-img"
                onError={handleImageError}
              />
            )}
          </div>
        </div>

        <div className="scroll-indicator">
          <span>Scroll</span>
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* --- 2. Body Content (Scrolls Over Hero) --- */}
      <div className="artwork-body">
        <div className="content-wrapper">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="action-left" />

            <div className="action-right">
              {/* ✅ 좋아요: 서버 토글로 교체 */}
              <button className={`btn-icon ${isLiked ? "active" : ""}`} onClick={handleToggleFavorite}>
                {isLiked ? "♥" : "♡"} {likeCount}
              </button>

              <button className="btn-icon" onClick={() => setIsFollowing(!isFollowing)}>
                {isFollowing ? "Following" : "Follow"}
              </button>

              <button
                className="btn-icon gold"
                onClick={() => {
                  if (!isLoggedIn) return alert("로그인이 필요합니다.");
                  setFanLetterOpen(true);
                }}
              >
                ✉ FanLetter
              </button>

              {/* ✅ 내 작품이면 수정/삭제 노출 */}
              {isOwner && (
                <>
                  <button className="btn-icon" type="button" onClick={goEditArtwork}>
                    Edit
                  </button>
                  <button className="btn-icon" type="button" onClick={onDeleteArtwork}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info Section */}
          <section className="info-section">
            <p className="description">{artwork.description}</p>
            <div className="tags-row">
              {artwork.tags.map((t) => (
                <span key={t} className="tag-pill">
                  #{t}
                </span>
              ))}
            </div>

            {/* 디버깅 필요하면 잠깐 켜기
            <pre style={{ fontSize: 12, opacity: 0.7 }}>
              me: {String(user?.memberUuid ?? "")} / owner: {String(artwork.artistMemberUuid ?? "")}
            </pre>
            */}
          </section>

          {/* ✅ 작품의 감상평 리스트 */}
          <section className="discovery-section">
            <h3 className="section-title">Reviews</h3>

            {reviewsLoading ? (
              <div style={{ opacity: 0.7 }}>Loading reviews...</div>
            ) : reviewsError ? (
              <div style={{ opacity: 0.7 }}>{reviewsError}</div>
            ) : reviews.length === 0 ? (
              <div style={{ opacity: 0.7 }}>등록된 감상평이 없습니다.</div>
            ) : (
              <div className="artwork-grid">
                {reviews.map((r) => (
                  <button
                    key={String(r.reviewId)}
                    type="button"
                    className="grid-card"
                    onClick={() => goReview(r.reviewId)}
                  >
                    <div className="card-thumb">
                      {r.imageUrl ? (
                        <img
                          src={resolveMediaUrl(r.imageUrl)}
                          alt={r.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: 180, background: "#111", opacity: 0.15 }} />
                      )}
                    </div>

                    <div className="card-info" style={{ display: "grid", gap: 4 }}>
                      <div>{r.title ?? "Untitled"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Comments Section (아직 로컬 state) */}
          <section className="comments-container">
            <h3 className="section-title" style={{ fontSize: "1.5rem", marginBottom: 20 }}>
              Comments ({comments.length})
            </h3>

            <div className="comment-input-wrap">
              <input
                className="input-minimal"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts..."
              />
              <button
                type="button"
                className="btn-submit"
                onClick={() => {
                  const v = commentText.trim();
                  if (!v) return;
                  addComment(v);
                  setCommentText("");
                }}
              >
                Post
              </button>
            </div>

            <div className="comment-list">
              {rootComments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-meta">
                    <strong>{c.authorName ?? "User"}</strong>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                  </div>
                  <div className="comment-text">{c.content}</div>

                  <div className="comment-actions">
                    <button
                      className="text-btn"
                      onClick={() => {
                        const next = prompt("수정 내용", c.content);
                        if (next) updateComment(c.id, next);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-btn" onClick={() => deleteComment(c.id)}>
                      Delete
                    </button>
                    <button
                      className="text-btn"
                      onClick={() => {
                        const reply = prompt("답글 내용");
                        if (reply) addReply(c.id, reply);
                      }}
                    >
                      Reply
                    </button>
                  </div>

                  {(repliesByParent.get(c.id) ?? []).length > 0 && (
                    <div className="replies">
                      {(repliesByParent.get(c.id) ?? []).map((r) => (
                        <div key={r.id} className="reply-item">
                          <div className="comment-meta">
                            <strong>{r.authorName ?? "User"}</strong>
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                          </div>
                          <div className="comment-text">{r.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* FanLetter Modal */}
      {fanLetterOpen && (
        <div className="modal-overlay" onClick={() => setFanLetterOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Send FanLetter</h3>
              <button
                type="button"
                onClick={() => setFanLetterOpen(false)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <textarea
              className="modal-textarea"
              rows={6}
              value={fanLetterText}
              onChange={(e) => setFanLetterText(e.target.value)}
              placeholder="Artist에게 응원의 메시지를 보내세요."
            />

            <div className="modal-actions">
              <button className="btn-icon" onClick={() => setFanLetterOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-icon gold"
                disabled={fanLetterSending}
                onClick={() => {
                  const v = fanLetterText.trim();
                  if (!v) return alert("내용을 입력해주세요.");
                  onSendFanLetter(v);
                }}
              >
                {fanLetterSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
