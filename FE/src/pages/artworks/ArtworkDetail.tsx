// FE/src/pages/artworks/ArtworkDetail.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../features/auth/store";
import { http } from "../../shared/api/http";
import { sendFanLetter } from "../../features/fanLetter/api";

import "./artworkDetail.css";

import ArtworkDetailView from "./ArtworkDetailView";
import { fetchImageAsObjectUrl, normalizeArtworkId, safeToInt } from "./detail/utils";
import type { ArtworkDetailData, LocalComment, ReviewSummary } from "./detail/mappers";
import {
  createCommentOnServer,
  deleteCommentOnServer,
  fetchArtworkComments,
  fetchArtworkDetail,
  fetchReviewsByArtworkId,
  toggleFavoriteOnServer,
  updateCommentOnServer,
} from "./detail/api";

// ✅ LocalComment에 authorId/authorName이 없을 수 있어서 UiComment로 확장
type UiComment = LocalComment & {
  authorId?: string;
  authorName?: string;
  isMine?: boolean;
};

export default function ArtworkDetail() {
  const params = useParams() as Record<string, string | undefined>;
  const rawParamId = params.artworkId ?? params.id ?? "";
  const normalizedArtworkId = useMemo(() => normalizeArtworkId(rawParamId), [rawParamId]);

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const meUuid = useMemo(() => String(user?.memberUuid ?? "").trim(), [user?.memberUuid]);

  // ✅ 프로필 경로 통일
  const profilePath = (uuid: string) => `/members/${encodeURIComponent(uuid)}`;

  // Data
  const [artwork, setArtwork] = useState<ArtworkDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reviews
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Comments
  const [comments, setComments] = useState<UiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // UI
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Inputs
  const [commentText, setCommentText] = useState("");
  const [fanLetterText, setFanLetterText] = useState("");

  // Inline edit/reply
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [replyingParentId, setReplyingParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Modal
  const [fanLetterOpen, setFanLetterOpen] = useState(false);
  const [fanLetterSending, setFanLetterSending] = useState(false);

  // hero image fallback
  const [displayImgSrc, setDisplayImgSrc] = useState("");
  const blobUrlRef = useRef<string | null>(null);
  const [triedAuthBlob, setTriedAuthBlob] = useState(false);

  const numericArtworkId = useMemo(() => {
    const n = parseInt(String(normalizedArtworkId), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [normalizedArtworkId]);

  const isOwner = useMemo(() => {
    const me = String(user?.memberUuid ?? "").trim();
    const owner = String((artwork as any)?.artistMemberUuid ?? (artwork as any)?.artistId ?? "").trim();
    return !!me && !!owner && me === owner;
  }, [user?.memberUuid, artwork]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [normalizedArtworkId]);

  // ✅ LocalComment에 authorId가 없을 수 있으므로 any로 읽고 UiComment로 확장
  const withMine = (list: LocalComment[]): UiComment[] => {
    const me = meUuid;

    return list.map((c) => {
      const rawAuthorId = String((c as any).authorId ?? (c as any).memberUuid ?? "").trim();
      const rawAuthorName = String((c as any).authorName ?? (c as any).nickname ?? "").trim();

      return {
        ...(c as any),
        authorId: rawAuthorId || undefined,
        authorName: rawAuthorName || undefined,
        isMine: !!me && !!rawAuthorId && rawAuthorId === me,
      };
    });
  };

  // 상세
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setImageError(false);
        setTriedAuthBlob(false);
        setArtwork(null);

        // 인라인 상태 초기화
        setEditingId(null);
        setEditingText("");
        setReplyingParentId(null);
        setReplyText("");

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setDisplayImgSrc("");

        if (!normalizedArtworkId) throw new Error("작품 ID가 없습니다.");

        const mapped = await fetchArtworkDetail(normalizedArtworkId);
        if (cancelled) return;

        setArtwork(mapped);

        if ((mapped as any)?.src) setDisplayImgSrc((mapped as any).src);
        if (typeof (mapped as any)?.isFavorited === "boolean") setIsLiked((mapped as any).isFavorited);
        if (typeof (mapped as any)?.likeCount === "number" && Number.isFinite((mapped as any).likeCount)) {
          setLikeCount((mapped as any).likeCount);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setArtwork(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedArtworkId]);

  // 리뷰
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const safeId = numericArtworkId ?? (typeof (artwork as any)?.id === "number" ? (artwork as any).id : Number((artwork as any)?.id));
      if (!safeId || !Number.isFinite(safeId)) return;

      try {
        setReviewsLoading(true);
        setReviewsError(null);

        const list = await fetchReviewsByArtworkId(safeId);
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
  }, [numericArtworkId, artwork]);

  // 댓글
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const safeId = numericArtworkId ?? (typeof (artwork as any)?.id === "number" ? (artwork as any).id : Number((artwork as any)?.id));
      if (!safeId || !Number.isFinite(safeId)) return;

      try {
        setCommentsLoading(true);
        setCommentsError(null);

        const list = await fetchArtworkComments(safeId);
        if (cancelled) return;

        setComments(withMine(list));
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setComments([]);
        setCommentsError("댓글을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [numericArtworkId, artwork, meUuid]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !artwork) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 1200);
      return () => clearTimeout(timer);
    }
  }, [artwork, isLoading, navigate]);

  // handlers
  const onToggleFavorite = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const safeId = numericArtworkId ?? (typeof (artwork as any)?.id === "number" ? (artwork as any).id : Number((artwork as any)?.id));
    if (!safeId || !Number.isFinite(safeId)) return;

    const prevLiked = isLiked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;
    setIsLiked(nextLiked);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

    try {
      const result = await toggleFavoriteOnServer(safeId);
      if (typeof (result as any).isFavorited === "boolean") setIsLiked((result as any).isFavorited);
      if (typeof (result as any).likeCount === "number" && Number.isFinite((result as any).likeCount)) {
        setLikeCount((result as any).likeCount);
      }
    } catch (e) {
      console.error(e);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      alert("좋아요 처리 실패");
    }
  };

  const refetchComments = async () => {
    const safeId = numericArtworkId ?? (typeof (artwork as any)?.id === "number" ? (artwork as any).id : Number((artwork as any)?.id));
    if (!safeId || !Number.isFinite(safeId)) return;

    setCommentsLoading(true);
    try {
      const list = await fetchArtworkComments(safeId);
      setComments(withMine(list));
    } catch (e) {
      console.error(e);
      setComments([]);
      setCommentsError("댓글을 불러오지 못했습니다.");
    } finally {
      setCommentsLoading(false);
    }
  };

  const onSubmitComment = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const safeId = numericArtworkId ?? (typeof (artwork as any)?.id === "number" ? (artwork as any).id : Number((artwork as any)?.id));
    if (!safeId || !Number.isFinite(safeId)) return;

    const trimmed = commentText.trim();
    if (!trimmed) return;

    const tempId = `temp-${crypto.randomUUID()}`;

    setComments((prev) => [
      ...prev,
      {
        id: tempId,
        parentId: null,
        content: trimmed,
        authorId: meUuid || undefined,
        authorName: user?.name ?? "나",
        isMine: true,
      } as UiComment,
    ]);
    setCommentText("");

    try {
      const created = await createCommentOnServer({ artworkId: safeId, content: trimmed, parentCommentId: null });
      if (created) {
        setComments((prev) => prev.map((c) => (c.id === tempId ? { ...(created as any), isMine: true } : c)));
      } else {
        await refetchComments();
      }
    } catch (e) {
      console.error(e);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      alert("댓글 작성 실패");
    }
  };

  const onStartEdit = (id: string, current: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    setReplyingParentId(null);
    setReplyText("");
    setEditingId(id);
    setEditingText(current);
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const onSaveEdit = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!editingId) return;

    const value = editingText.trim();
    if (!value) return alert("내용을 입력해주세요.");

    const id = editingId;
    const prev = comments;

    setComments((cur) => cur.map((c) => (c.id === id ? { ...c, content: value } : c)));
    setEditingId(null);
    setEditingText("");

    try {
      await updateCommentOnServer(id, value);
    } catch (e) {
      console.error(e);
      setComments(prev);
      alert("댓글 수정 실패");
    }
  };

  const onStartReply = (parentId: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    setEditingId(null);
    setEditingText("");
    setReplyingParentId(parentId);
    setReplyText("");
  };

  const onCancelReply = () => {
    setReplyingParentId(null);
    setReplyText("");
  };

  const onSubmitReply = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const safeId = numericArtworkId ?? (typeof (artwork as any)?.id === "number" ? (artwork as any).id : Number((artwork as any)?.id));
    if (!safeId || !Number.isFinite(safeId)) return;

    if (!replyingParentId) return;

    const trimmed = replyText.trim();
    if (!trimmed) return alert("내용을 입력해주세요.");

    const parentNum = safeToInt(replyingParentId);
    if (parentNum == null) return alert("부모 댓글 ID 파싱 실패");

    const tempId = `temp-${crypto.randomUUID()}`;

    setComments((prev) => [
      ...prev,
      {
        id: tempId,
        parentId: replyingParentId,
        content: trimmed,
        authorId: meUuid || undefined,
        authorName: user?.name ?? "나",
        isMine: true,
      } as UiComment,
    ]);

    setReplyText("");
    setReplyingParentId(null);

    try {
      const created = await createCommentOnServer({
        artworkId: safeId,
        content: trimmed,
        parentCommentId: parentNum,
      });

      if (created) {
        setComments((prev) => prev.map((c) => (c.id === tempId ? { ...(created as any), isMine: true } : c)));
      } else {
        await refetchComments();
      }
    } catch (e) {
      console.error(e);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      alert("답글 작성 실패");
    }
  };

  const onDeleteComment = async (id: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const target = comments.find((c) => c.id === id);
    const canDelete = target?.isMine === true || isOwner === true;
    if (!canDelete) return alert("삭제 권한이 없습니다.");

    if (!window.confirm("삭제하시겠습니까?")) return;

    const prev = comments;
    setComments((cur) => cur.filter((c) => c.id !== id && (c as any).parentId !== id));

    try {
      await deleteCommentOnServer(id);
    } catch (e) {
      console.error(e);
      setComments(prev);
      alert("댓글 삭제 실패");
    }
  };

  const onHeroImgError = async () => {
    if (imageError) return;

    if (triedAuthBlob) {
      setImageError(true);
      return;
    }

    setTriedAuthBlob(true);

    const raw = (artwork as any)?.src ?? "";
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

  const onDeleteArtwork = async () => {
    if (!artwork) return;
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!isOwner) return alert("본인 작품만 삭제할 수 있습니다.");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const id = normalizedArtworkId || String((artwork as any).id);
      await http.delete(`/api/v1/artworks/${id}`);
      alert("삭제되었습니다.");
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const onGoEdit = () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!isOwner) return alert("본인 작품만 수정할 수 있습니다.");
    navigate(`/artworks/${normalizedArtworkId}/edit`);
  };

  const onOpenFanLetter = () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    setFanLetterOpen(true);
  };

  const onSendFanLetter = async (content: string) => {
    if (!isLoggedIn || !user?.memberUuid) return alert("로그인 후 이용해주세요.");
    if (!artwork) return;

    const safeId = numericArtworkId ?? (typeof (artwork as any).id === "number" ? (artwork as any).id : Number((artwork as any).id));

    setFanLetterSending(true);
    try {
      await sendFanLetter({
        artistMemberUuid: (artwork as any).artistMemberUuid ?? "",
        artworkId: safeId,
        artworkTitle: (artwork as any).title,
        artistName: (artwork as any).artist,
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
          <button className="btn-icon" onClick={() => navigate("/")} style={{ marginTop: 20 }}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ArtworkDetailView
        artwork={artwork}
        isOwner={isOwner}
        displayImgSrc={displayImgSrc}
        imageError={imageError}
        onHeroImgError={onHeroImgError}
        isLiked={isLiked}
        likeCount={likeCount}
        isFollowing={isFollowing}
        onToggleFavorite={onToggleFavorite}
        onToggleFollow={() => setIsFollowing((v) => !v)}
        onOpenFanLetter={onOpenFanLetter}
        onGoEdit={onGoEdit}
        onDeleteArtwork={onDeleteArtwork}
        onGoHome={() => navigate("/")}
        onGoReview={(id) => navigate(`/reviews/${id}`)}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        reviewsError={reviewsError}
        comments={comments}
        commentsLoading={commentsLoading}
        commentsError={commentsError}
        commentText={commentText}
        onChangeCommentText={setCommentText}
        onSubmitComment={onSubmitComment}
        onDeleteComment={onDeleteComment}
        // 타입 호환용(사용 안 하면 빈 함수 유지)
        onEditComment={() => {}}
        onReplyComment={() => {}}
        artistProfilePath={artwork && (artwork as any).artistMemberUuid ? profilePath((artwork as any).artistMemberUuid) : undefined}
        commentAuthorProfilePath={(authorId) => profilePath(authorId)}
        // ✅ 인라인 편집/답글 props
        editingId={editingId}
        editingText={editingText}
        onStartEdit={onStartEdit}
        onChangeEditingText={setEditingText}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
        replyingParentId={replyingParentId}
        replyText={replyText}
        onStartReply={onStartReply}
        onChangeReplyText={setReplyText}
        onCancelReply={onCancelReply}
        onSubmitReply={onSubmitReply}
      />

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
    </>
  );
}
