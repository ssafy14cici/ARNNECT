// FE/src/pages/artworks/ArtworkDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../features/auth/store";
import { http } from "../../shared/api/http"; 
import { sendFanLetter } from "../../features/fanLetter/api";
import "./artworkDetail.css"; // 스타일 파일 임포트 유지

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

type ArtworkDetailData = {
  id: string | number;
  src: string;
  title: string;
  artist: string;
  description: string;
  tags: string[];
  artistMemberUuid?: string;
  artistId?: string;
  artistName?: string;
};

/* Helper Functions */
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

const ARTWORK_DETAIL_PATH = "/api/v1/artworks";

function mapArtworkDetail(payload: unknown): ArtworkDetailData | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  const idRaw = get(body, "artworkId") ?? get(body, "id");
  const idStr = asString(idRaw, "");
  const idNum = typeof idRaw === "number" ? idRaw : asNumber(idRaw, NaN);
  const id: string | number = Number.isFinite(idNum) ? idNum : idStr;

  const title = asString(get(body, "title"), "Untitled");
  const description =
    asString(get(body, "description"), "") || asString(get(body, "content"), "");

  const src =
    asString(get(body, "imageUrl"), "") ||
    asString(get(body, "thumbnailUrl"), "") ||
    asString(get(body, "src"), "");

  const tags =
    asStringArray(get(body, "tags")) || asStringArray(get(body, "tagList")) || [];

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
  
  // Input State (View에서 가져옴)
  const [commentText, setCommentText] = useState("");
  const [fanLetterText, setFanLetterText] = useState("");

  // Modal State
  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterSending, setFanLetterSending] = useState(false);

  // Mock Data
  const similarArtworks = useMemo(() => [], []);
  const recommendArtworks = useMemo(() => [], []);

  // 2. Computations
  const numericArtworkId = useMemo(() => {
    const n = parseInt(String(normalizedArtworkId), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [normalizedArtworkId]);

  // 댓글 계층 구조 계산
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
        setArtwork(null);
        if (!normalizedArtworkId) throw new Error("작품 ID가 없습니다.");

        const res = await http.get(`${ARTWORK_DETAIL_PATH}/${normalizedArtworkId}`);
        const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);
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
    return () => { cancelled = true; };
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
    if (!Number.isFinite(safeId)) return alert("작품 ID 오류");
    
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

  // 5. Render (UI)
  if (isLoading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>Loading...</h2>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>작품을 찾을 수 없습니다.</h2>
        <button style={{ marginTop: 16 }} onClick={goHome} type="button">
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "110px 24px 60px" }}>
      {/* 상단 */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>{artwork.title}</h2>
          <div style={{ marginTop: 6, opacity: 0.72 }}>{artwork.artist}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={handleLike}>
            {isLiked ? "♥" : "♡"} {likeCount}
          </button>
          <button type="button" onClick={() => setIsFollowing(!isFollowing)}>
            {isFollowing ? "Following" : "Follow"}
          </button>
          <button type="button" onClick={() => {
             if (!isLoggedIn) return alert("로그인이 필요합니다.");
             setFanLetterOpen(true);
          }}>
            FanLetter
          </button>
        </div>
      </div>

      {/* 메인 이미지 */}
      <div style={{ marginTop: 22 }}>
        {imageError ? (
          <div style={{ width: "100%", height: 420, background: "#eee", display: "grid", placeItems: "center" }}>
            이미지 로드 실패
          </div>
        ) : (
          <img
            src={artwork.src}
            alt={artwork.title}
            style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 12 }}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* 설명/태그 */}
      <div style={{ marginTop: 18, lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>{artwork.description}</p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {artwork.tags.map((t) => (
            <span key={t} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* 비슷한 작품 */}
      <section style={{ marginTop: 30 }}>
        <h3 style={{ margin: "0 0 12px" }}>Similar</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {similarArtworks.map((a: any) => (
            <button
              key={String(a.id)}
              type="button"
              onClick={() => goArtwork(String(a.id))}
              style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ width: "100%", height: 120, background: "#eee", borderRadius: 10 }}>
                {/* 썸네일 */}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{a.title ?? "Untitled"}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 추천 작품 */}
      <section style={{ marginTop: 26 }}>
        <h3 style={{ margin: "0 0 12px" }}>Recommend</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {recommendArtworks.map((a: any) => (
            <button
              key={String(a.id)}
              type="button"
              onClick={() => goArtwork(String(a.id))}
              style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ width: "100%", height: 120, background: "#eee", borderRadius: 10 }}>
                {/* 썸네일 */}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{a.title ?? "Untitled"}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 댓글 */}
      <section style={{ marginTop: 34 }}>
        <h3 style={{ margin: "0 0 10px" }}>Comments</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요"
            style={{ flex: 1, padding: "10px 12px" }}
          />
          <button
            type="button"
            onClick={() => {
              const v = commentText.trim();
              if (!v) return;
              addComment(v);
              setCommentText("");
            }}
          >
            등록
          </button>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {rootComments.map((c) => (
            <div key={c.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.72 }}>
                {c.authorName ?? "unknown"} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
              </div>
              <div style={{ marginTop: 6 }}>{c.content}</div>

              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const next = prompt("수정 내용");
                    if (!next) return;
                    updateComment(c.id, next);
                  }}
                >
                  수정
                </button>
                <button type="button" onClick={() => deleteComment(c.id)}>
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reply = prompt("답글 내용");
                    if (!reply) return;
                    addReply(c.id, reply);
                  }}
                >
                  답글
                </button>
              </div>

              {(repliesByParent.get(c.id) ?? []).length > 0 && (
                <div style={{ marginTop: 10, paddingLeft: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {(repliesByParent.get(c.id) ?? []).map((r) => (
                    <div key={r.id} style={{ borderLeft: "2px solid #eee", paddingLeft: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.72 }}>
                        {r.authorName ?? "unknown"} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                      </div>
                      <div style={{ marginTop: 4 }}>{r.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 팬레터 모달 */}
      {fanLetterOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 1000,
          }}
          onClick={() => setFanLetterOpen(false)}
        >
          <div
            style={{ width: "min(520px, 100%)", background: "#fff", borderRadius: 14, padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Send FanLetter</h3>
              <button type="button" onClick={() => setFanLetterOpen(false)}>
                X
              </button>
            </div>

            <textarea
              value={fanLetterText}
              onChange={(e) => setFanLetterText(e.target.value)}
              rows={6}
              placeholder="내용을 입력하세요"
              style={{ width: "100%", marginTop: 12, padding: 12, resize: "vertical" }}
            />

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setFanLetterOpen(false)}>
                취소
              </button>
              <button
                type="button"
                disabled={fanLetterSending}
                onClick={() => {
                    const v = fanLetterText.trim();
                    if (!v) return alert("내용을 입력해주세요.");
                    onSendFanLetter(v);
                }}
              >
                {fanLetterSending ? "Sending..." : "발송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}