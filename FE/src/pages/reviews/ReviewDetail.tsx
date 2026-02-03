// FE/src/pages/reviews/ReviewDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../features/auth/store";
import { getReviewDetail } from "../../features/reviews/api";
import { sendFanLetter } from "../../features/fanLetter/api";

export const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

export type LocalComment = {
  id: string;
  parentId: string | null;
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
};

type ReviewDetailData = {
  reviewId: number;
  artworkId?: number;
  artworkTitle: string;
  artistUuid?: string;
  artistName?: string;
  imageUrl?: string;
  title?: string;
  content?: string;
  createdAt?: string;
  tags?: string[];
  memberUuid?: string;
  nickname?: string;
};

function normalizeId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^review-/, "").replace(/^artwork-/, "");
}

export default function ReviewDetail() {
  const { reviewId = "" } = useParams<{ reviewId: string }>();
  const nav = useNavigate();

  const normalizedReviewId = useMemo(() => normalizeId(reviewId), [reviewId]);

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [review, setReview] = useState<ReviewDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterText, setFanLetterText] = useState("");
  const [fanLetterSending, setFanLetterSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        if (!normalizedReviewId) throw new Error("리뷰 ID가 없습니다.");

        // ✅ /api/v1/reviews/{id} 로 호출 (절대 /detail 붙이지 않음)
        const data = await getReviewDetail(normalizedReviewId);

        if (cancelled) return;
        setReview(data as ReviewDetailData);
      } catch (e) {
        console.error(e);
        if (!cancelled) setReview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedReviewId]);

  useEffect(() => {
    if (!loading && !review) {
      const t = setTimeout(() => nav("/", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, review, nav]);

  const onSendFanLetter = async (content: string) => {
    if (!isLoggedIn || !user?.memberUuid) return alert("로그인 후 이용해주세요.");
    if (!review) return;

    const artworkId = review.artworkId;
    const artistMemberUuid = review.artistUuid;

    if (!artworkId || !artistMemberUuid) return alert("팬레터에 필요한 정보가 없습니다.");

    setFanLetterSending(true);
    try {
      await sendFanLetter({
        artistMemberUuid,
        artworkId,
        artworkTitle: review.artworkTitle,
        artistName: review.artistName ?? "",
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

  if (loading) {
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
        <button style={{ marginTop: 16 }} onClick={() => nav("/")} type="button">
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "110px 24px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>{review.title ?? "Untitled"}</h2>
          <div style={{ marginTop: 6, opacity: 0.72 }}>
            {review.nickname ?? "—"} · {review.createdAt ? new Date(review.createdAt).toLocaleString() : ""}
          </div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            {review.artworkTitle} · {review.artistName ?? "Unknown Artist"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setIsLiked((prev) => {
                setLikeCount((cnt) => (prev ? cnt - 1 : cnt + 1));
                return !prev;
              });
            }}
          >
            {isLiked ? "♥" : "♡"} {likeCount}
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
            alt={review.title ?? "review"}
            style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 12 }}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      <div style={{ marginTop: 18, lineHeight: 1.7 }}>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{review.content ?? ""}</p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(review.tags ?? []).map((t) => (
            <span key={t} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
              #{t}
            </span>
          ))}
        </div>
      </div>

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
