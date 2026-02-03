// FE/src/pages/reviews/ReviewDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../features/auth/store";
import { http } from "../../shared/api/http";
import { sendFanLetter } from "../../features/fanLetter/api";

import "../artworks/artworkDetail.css"; // 일단 기존 스타일 재사용 (원하면 reviewDetail.css로 분리)

export const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

// ------------------- [Types] -------------------
export type LocalComment = {
  id: string;
  parentId: string | null;
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
};

type ReviewDetailData = {
  reviewId: number;       // ✅ reviewId는 필수
  artworkId: number;      // ✅ 팬레터/연관작품 이동에 필요
  artworkTitle: string;

  title: string;
  content: string;

  imageUrl?: string;      // ✅ 리뷰는 이미지가 null일 수 있음
  createdAtIso: string;

  // 리뷰 작성자(유저)
  memberUuid: string;
  nickname: string;

  // 연관 작품의 작가
  artistUuid: string;
  artistName: string;

  tags: string[];
};

// ------------------- [Helpers] -------------------
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
  // "a,b,c" 형태 방어
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
function pickEnvelopeData(raw: unknown): unknown {
  // { data: ... } envelope면 data만 사용
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}
function toIso(v: unknown): string {
  // Timestamp가 string(ISO)로 오거나 number(ms)로 올 수 있어서 방어
  const s = asString(v, "").trim();
  if (s) {
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    const n = Number(s);
    if (Number.isFinite(n)) return new Date(n).toISOString();
  }
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  return new Date().toISOString();
}
function normalizeId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^review-/, "").replace(/^artwork-/, "");
}

// ------------------- [API PATH] -------------------
const REVIEW_DETAIL_PATH = "/api/v1/reviews"; // ✅ 실제가 /reviews/{id}/detail 이면 아래 get에서 /detail 붙임

function mapReviewDetail(payload: unknown): ReviewDetailData | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  const reviewId = asNumber(get(body, "reviewId"), NaN);
  const artworkId = asNumber(get(body, "artworkId"), NaN);

  // 최소 식별자 검증
  if (!Number.isFinite(reviewId) || !Number.isFinite(artworkId)) return null;

  const title = asString(get(body, "title"), "Untitled");
  const content = asString(get(body, "content"), "") || "내용이 없습니다.";

  const artworkTitle = asString(get(body, "artworkTitle"), "Untitled Artwork");

  const imageUrl = asString(get(body, "imageUrl"), "").trim();
  const createdAtIso = toIso(get(body, "createdAt"));

  const memberUuid = asString(get(body, "memberUuid"), "").trim();
  const nickname = asString(get(body, "nickname"), "").trim() || "—";

  const artistUuid = asString(get(body, "artistUuid"), "").trim();
  const artistName = asString(get(body, "artistName"), "").trim() || "Unknown Artist";

  const tags = asStringArray(get(body, "tags"));
  const safeTags = tags.length ? tags : ["리뷰"];

  return {
    reviewId,
    artworkId,
    artworkTitle,
    title,
    content,
    imageUrl: imageUrl || undefined,
    createdAtIso,
    memberUuid,
    nickname,
    artistUuid,
    artistName,
    tags: safeTags,
  };
}

// ------------------- [Main Component] -------------------
export default function ReviewDetail() {
  const { reviewId = "" } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();

  const normalizedReviewId = useMemo(() => normalizeId(reviewId), [reviewId]);

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [review, setReview] = useState<ReviewDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI states
  const [imageError, setImageError] = useState(false);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [fanLetterText, setFanLetterText] = useState("");

  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterSending, setFanLetterSending] = useState(false);

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [normalizedReviewId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setImageError(false);
        setReview(null);

        if (!normalizedReviewId) throw new Error("리뷰 ID가 없습니다.");

        // ✅ 명세가 /reviews/{id}/detail 인 경우
        const res = await http.get(`${REVIEW_DETAIL_PATH}/${normalizedReviewId}/detail`);

        const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);
        const mapped = mapReviewDetail(payload);

        if (cancelled) return;
        setReview(mapped);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setReview(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedReviewId]);

  useEffect(() => {
    if (!isLoading && !review) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 1200);
      return () => clearTimeout(timer);
    }
  }, [review, isLoading, navigate]);

  // ------------------- [Handlers] -------------------
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
    if (!review) return;

    setFanLetterSending(true);
    try {
      await sendFanLetter({
        artistMemberUuid: review.artistUuid, // ✅ ReviewDetailResponse의 artistUuid 사용
        artworkId: review.artworkId,
        artworkTitle: review.artworkTitle,
        artistName: review.artistName,
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
  const goArtwork = (id: number) => navigate(`/artworks/${id}`);
  const goReviewerProfile = (memberUuid: string) => navigate(PROFILE_PATH(memberUuid));
  const goArtistProfile = (artistUuid: string) => navigate(PROFILE_PATH(artistUuid));

  // ------------------- [Render] -------------------
  if (isLoading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>Loading...</h2>
      </div>
    );
  }

  if (!review) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>리뷰를 찾을 수 없습니다.</h2>
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
          <h2 style={{ margin: 0 }}>{review.title}</h2>

          {/* 리뷰 작성자 + 작성일 */}
          <div style={{ marginTop: 6, opacity: 0.72, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => goReviewerProfile(review.memberUuid)}
              role="button"
              tabIndex={0}
            >
              {review.nickname}
            </span>
            <span>·</span>
            <span>{new Date(review.createdAtIso).toLocaleString()}</span>
          </div>

          {/* 연관 작품/작가 */}
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            <span
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => goArtwork(review.artworkId)}
              role="button"
              tabIndex={0}
            >
              {review.artworkTitle}
            </span>
            <span style={{ margin: "0 8px" }}>·</span>
            <span
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => goArtistProfile(review.artistUuid)}
              role="button"
              tabIndex={0}
            >
              {review.artistName}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={handleLike}>
            {isLiked ? "♥" : "♡"} {likeCount}
          </button>

          {/* 팔로우: 리뷰 작성자 or 작가 중 무엇을 팔로우할지 정책 필요.
              일단 "작가 팔로우"로 가정해서 텍스트만 유지 */}
          <button type="button" onClick={() => setIsFollowing(!isFollowing)}>
            {isFollowing ? "Following" : "Follow"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) return alert("로그인이 필요합니다.");
              setFanLetterOpen(true);
            }}
          >
            FanLetter
          </button>
        </div>
      </div>

      {/* 리뷰 이미지(있을 때만) */}
      <div style={{ marginTop: 22 }}>
        {!review.imageUrl ? (
          <div style={{ width: "100%", height: 240, background: "#f5f5f5", display: "grid", placeItems: "center" }}>
            이미지가 없습니다.
          </div>
        ) : imageError ? (
          <div style={{ width: "100%", height: 240, background: "#eee", display: "grid", placeItems: "center" }}>
            이미지 로드 실패
          </div>
        ) : (
          <img
            src={review.imageUrl}
            alt={review.title}
            style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 12 }}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* 내용/태그 */}
      <div style={{ marginTop: 18, lineHeight: 1.7 }}>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{review.content}</p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {review.tags.map((t) => (
            <span key={t} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* 댓글 (로컬) */}
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

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
              To. {review.artistName} ({review.artworkTitle})
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
