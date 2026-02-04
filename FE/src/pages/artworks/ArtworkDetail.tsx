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
 * - BE가 https://domain/artwork/uuid (절대 URL)로 주면 그대로 사용
 * - 혹시 /artwork/uuid 또는 artwork/uuid 같은 상대경로가 섞여도 안전하게 보정
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

// ------------------- Mapper -------------------
type ArtworkDetailData = {
  id: string | number;
  src: string; // ✅ 항상 "최종 사용 가능한" URL(또는 경로)
  title: string;
  artist: string;
  description: string;
  tags: string[];
  artistMemberUuid?: string;
  artistId?: string;
  artistName?: string;
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

  // ✅ BE가 https://domain/artwork/uuid 로 주는 케이스면 그대로 유지됨
  const src = resolveMediaUrl(rawSrc);

  const tags = asStringArray(get(body, "tags")) || asStringArray(get(body, "tagList")) || [];

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

  const artist = artistName || (artistMemberUuid ? `ARTIST ${artistMemberUuid.slice(0, 4)}` : "Unknown");

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
  };
}

// ------------------- [Main Component] -------------------
export default function ArtworkDetail() {
  // 1. Hooks & State
  const { artworkId = "" } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();

  const normalizedArtworkId = useMemo(() => normalizeArtworkId(artworkId), [artworkId]);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // Data State
  const [artwork, setArtwork] = useState<ArtworkDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Mock Data (비슷한 작품 & 추천 작품)
  const similarArtworks = useMemo(
    () => [
      { id: 101, title: "Abstract Blue", src: "https://via.placeholder.com/300x400/111/555" },
      { id: 102, title: "Golden Age", src: "https://via.placeholder.com/300x400/222/666" },
      { id: 103, title: "Silence", src: "https://via.placeholder.com/300x400/333/777" },
      { id: 104, title: "Void", src: "https://via.placeholder.com/300x400/444/888" },
    ],
    [],
  );

  const recommendArtworks = useMemo(
    () => [
      { id: 201, title: "Red Dot", src: "https://via.placeholder.com/300x400/555/999" },
      { id: 202, title: "Lines", src: "https://via.placeholder.com/300x400/666/aaa" },
      { id: 203, title: "Chaos", src: "https://via.placeholder.com/300x400/777/bbb" },
      { id: 204, title: "Order", src: "https://via.placeholder.com/300x400/888/ccc" },
    ],
    [],
  );

  // 2. Computations
  const numericArtworkId = useMemo(() => {
    const n = parseInt(String(normalizedArtworkId), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [normalizedArtworkId]);

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

  // 3. Effects
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [normalizedArtworkId]);

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

        // ✅ 기본은 BE가 준 절대 URL을 그대로 표시
        if (mapped?.src) setDisplayImgSrc(mapped.src);
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

  // 4. Handlers
  const handleLike = () => {
    setIsLiked((prev) => {
      setLikeCount((cnt) => (prev ? cnt - 1 : cnt + 1));
      return !prev;
    });
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

  const goHome = () => navigate("/");
  const goArtwork = (id: string) => navigate(`/artworks/${id}`);

  /**
   * ✅ 이미지 로딩 실패 시 fallback:
   * - 첫 실패: (인증 필요할 수 있으니) 토큰 포함 fetch로 blob 받아 objectURL 적용 시도
   * - 두 번째 실패: 최종 imageError 처리
   */
  const handleImageError = async () => {
    if (imageError) return;

    // 이미 blob fallback 시도했으면 종료
    if (triedAuthBlob) {
      setImageError(true);
      return;
    }

    setTriedAuthBlob(true);

    // artwork/src 없으면 실패 처리
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

    // 이전 blob URL 정리
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

  // 5. Render
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

        {/* Scroll Indicator */}
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
            <div className="action-left">{/* 필요 시 여기에 추가 정보 배치 */}</div>
            <div className="action-right">
              <button className={`btn-icon ${isLiked ? "active" : ""}`} onClick={handleLike}>
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
          </section>

          {/* Similar Artworks */}
          <section className="discovery-section">
            <h3 className="section-title">Similar Works</h3>
            <div className="artwork-grid">
              {similarArtworks.map((a: any) => (
                <button key={a.id} type="button" className="grid-card" onClick={() => goArtwork(String(a.id))}>
                  <div className="card-thumb">
                    <img src={a.src || artwork.src} alt={a.title} />
                  </div>
                  <div className="card-info">{a.title ?? "Untitled"}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Recommended Artworks */}
          <section className="discovery-section">
            <h3 className="section-title">You may also like</h3>
            <div className="artwork-grid">
              {recommendArtworks.map((a: any) => (
                <button key={a.id} type="button" className="grid-card" onClick={() => goArtwork(String(a.id))}>
                  <div className="card-thumb">
                    <img src={a.src || artwork.src} alt={a.title} />
                  </div>
                  <div className="card-info">{a.title ?? "Untitled"}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Comments Section */}
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
