// FE/src/pages/feed/FeedDetail.tsx
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bumpViews, getPostById } from "../../features/feed/mockData";
import "./feed.css";

export default function FeedDetail() {
  const nav = useNavigate();
  const { id = "" } = useParams();

  const post = useMemo(() => (id ? getPostById(id) : null), [id]);

  useEffect(() => {
    if (post?.id) bumpViews(post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  if (!post) {
    return (
      <div style={{ padding: 24 }}>
        <button type="button" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>
          ← 뒤로
        </button>
        <div>게시물을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <button type="button" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>
        ← 뒤로
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>{post.title}</h1>
        <div style={{ opacity: 0.8, fontSize: 14 }}>
          {post.role} · {post.createdAt.slice(0, 10)} · views {post.views}
        </div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.9 }}>
        <button type="button" onClick={() => nav(`/profile/${post.authorId}`)}>
          @{post.authorName}
        </button>
      </div>

      {post.imageUrls?.[0] && (
        <div style={{ marginTop: 16 }}>
          <img
            src={post.imageUrls[0]}
            alt=""
            style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 16 }}
          />
        </div>
      )}

      <pre
        style={{
          marginTop: 16,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.6,
          opacity: 0.95,
        }}
      >
        {post.content}
      </pre>

      {post.tags?.length ? (
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {post.tags.map((t) => (
            <span key={t} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)" }}>
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
