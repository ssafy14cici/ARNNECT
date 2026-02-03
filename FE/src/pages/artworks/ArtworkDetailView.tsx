import { useMemo, useState } from "react";
import type { LocalComment } from "./ArtworkDetail";

type ArtworkBase = {
  id: string | number;
  src: string;
  title: string;
  artist: string;
  description: string;
  tags: string[];
  artistMemberUuid?: string;
};

type Props = {
  artwork: ArtworkBase | null;

  similarArtworks: readonly any[];
  recommendArtworks: readonly any[];

  isLoading: boolean;
  imageError: boolean;
  setImageError: (v: boolean) => void;

  isFollowing: boolean;
  isLiked: boolean;
  likeCount: number;

  onToggleFollow: () => void;
  onLike: () => void;

  comments: LocalComment[];
  onAddComment: (content: string) => void;
  onAddReply: (parentId: string, content: string) => void;
  onDeleteComment: (id: string) => void;
  onUpdateComment: (id: string, content: string) => void;

  onGoHome: () => void;
  onNavigateArtwork: (id: string) => void;

  profilePath: (authorId: string) => string;

  fanLetterOpen: boolean;
  fanLetterSending: boolean;
  onOpenFanLetter: () => void;
  onCloseFanLetter: () => void;
  onSendFanLetter: (content: string) => Promise<void>;
};

export default function ArtworkDetailView(props: Props) {
  const {
    artwork,
    similarArtworks,
    recommendArtworks,
    isLoading,
    imageError,
    setImageError,
    isFollowing,
    isLiked,
    likeCount,
    onToggleFollow,
    onLike,
    comments,
    onAddComment,
    onAddReply,
    onDeleteComment,
    onUpdateComment,
    onGoHome,
    onNavigateArtwork,
    fanLetterOpen,
    fanLetterSending,
    onOpenFanLetter,
    onCloseFanLetter,
    onSendFanLetter,
  } = props;

  const [commentText, setCommentText] = useState("");
  const [fanLetterText, setFanLetterText] = useState("");

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
        <button style={{ marginTop: 16 }} onClick={onGoHome} type="button">
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
          <button type="button" onClick={onLike}>
            {isLiked ? "♥" : "♡"} {likeCount}
          </button>
          <button type="button" onClick={onToggleFollow}>
            {isFollowing ? "Following" : "Follow"}
          </button>
          <button type="button" onClick={onOpenFanLetter}>
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
              onClick={() => onNavigateArtwork(String(a.id))}
              style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}
            >
              <img
                src={a.thumbnail ?? a.src}
                alt={a.title ?? String(a.id)}
                style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10 }}
              />
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
              onClick={() => onNavigateArtwork(String(a.id))}
              style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}
            >
              <img
                src={a.thumbnail ?? a.src}
                alt={a.title ?? String(a.id)}
                style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10 }}
              />
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
              onAddComment(v);
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
                    onUpdateComment(c.id, next);
                  }}
                >
                  수정
                </button>
                <button type="button" onClick={() => onDeleteComment(c.id)}>
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reply = prompt("답글 내용");
                    if (!reply) return;
                    onAddReply(c.id, reply);
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
          onClick={onCloseFanLetter}
        >
          <div
            style={{ width: "min(520px, 100%)", background: "#fff", borderRadius: 14, padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Send FanLetter</h3>
              <button type="button" onClick={onCloseFanLetter}>
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
              <button type="button" onClick={onCloseFanLetter}>
                취소
              </button>
              <button
                type="button"
                disabled={fanLetterSending}
                onClick={async () => {
                  const v = fanLetterText.trim();
                  if (!v) return alert("내용을 입력해주세요.");
                  await onSendFanLetter(v);
                  setFanLetterText("");
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
