// FE/src/pages/reviews/ReviewEdit.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../features/auth/store";
import { http } from "../../shared/api/http";

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
    return v.map((x) => asString(x, "")).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}
function normalizeId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^review-/, "").replace(/^artwork-/, "");
}

// ------------------- API PATHS -------------------
const REVIEW_BASE = "/api/v1/reviews";
const REVIEW_DETAIL_SUFFIX = "/detail"; // ✅ /{id}/detail 사용 시
// const REVIEW_DETAIL_SUFFIX = "";      // ✅ /{id} 사용 시

// ------------------- Types -------------------
type ReviewDetailData = {
  reviewId: number;
  artworkId: number;
  artworkTitle: string;

  title: string;
  content: string;

  imageUrl?: string;
  createdAtIso: string;

  memberUuid: string; // 작성자
  nickname: string;

  artistUuid: string;
  artistName: string;

  tags: string[];
};

function toIso(v: unknown): string {
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

function mapReviewDetail(payload: unknown): ReviewDetailData | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  const reviewId = asNumber(get(body, "reviewId"), NaN);
  const artworkId = asNumber(get(body, "artworkId"), NaN);
  if (!Number.isFinite(reviewId) || !Number.isFinite(artworkId)) return null;

  const title = asString(get(body, "title"), "");
  const content = asString(get(body, "content"), "");
  const imageUrl = asString(get(body, "imageUrl"), "").trim();
  const createdAtIso = toIso(get(body, "createdAt"));

  const memberUuid = asString(get(body, "memberUuid"), "").trim();
  const nickname = asString(get(body, "nickname"), "").trim() || "—";

  const artistUuid = asString(get(body, "artistUuid"), "").trim();
  const artistName = asString(get(body, "artistName"), "").trim() || "Unknown Artist";

  const artworkTitle = asString(get(body, "artworkTitle"), "Untitled Artwork");
  const tags = asStringArray(get(body, "tags"));
  const safeTags = tags.length ? tags : [];

  return {
    reviewId,
    artworkId,
    artworkTitle,
    title: title || "Untitled",
    content: content || "",
    imageUrl: imageUrl || undefined,
    createdAtIso,
    memberUuid,
    nickname,
    artistUuid,
    artistName,
    tags: safeTags,
  };
}

// ------------------- Component -------------------
export default function ReviewEdit() {
  const { reviewId = "" } = useParams<{ reviewId: string }>();
  const normalizedReviewId = useMemo(() => normalizeId(reviewId), [reviewId]);

  const nav = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [origin, setOrigin] = useState<ReviewDetailData | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsText, setTagsText] = useState(""); // "a,b,c"

  const canEdit = useMemo(() => {
    if (!isLoggedIn || !user?.memberUuid) return false;
    if (!origin?.memberUuid) return false;
    return user.memberUuid === origin.memberUuid;
  }, [isLoggedIn, user, origin]);

  useEffect(() => {
    if (!normalizedReviewId) {
      nav("/", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        const res = await http.get(`${REVIEW_BASE}/${normalizedReviewId}${REVIEW_DETAIL_SUFFIX}`);
        const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;

        const mapped = mapReviewDetail(payload);
        if (cancelled) return;

        setOrigin(mapped);

        // prefill
        setTitle(mapped?.title ?? "");
        setContent(mapped?.content ?? "");
        setImageUrl(mapped?.imageUrl ?? "");
        setTagsText((mapped?.tags ?? []).join(", "));
      } catch (e) {
        console.error(e);
        if (!cancelled) setOrigin(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedReviewId, nav]);

  useEffect(() => {
    // 로그인 안 되어 있으면 접근 제한
    if (!loading && !isLoggedIn) {
      alert("로그인이 필요합니다.");
      nav(`/reviews/${normalizedReviewId}`, { replace: true });
    }
  }, [loading, isLoggedIn, nav, normalizedReviewId]);

  useEffect(() => {
    // 작성자 아니면 편집 제한
    if (!loading && origin && isLoggedIn && user?.memberUuid && user.memberUuid !== origin.memberUuid) {
      alert("수정 권한이 없습니다.");
      nav(`/reviews/${normalizedReviewId}`, { replace: true });
    }
  }, [loading, origin, isLoggedIn, user, nav, normalizedReviewId]);

  const parsedTags = useMemo(() => {
    const arr = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // 중복 제거
    return Array.from(new Set(arr));
  }, [tagsText]);

  const onCancel = () => {
    nav(`/reviews/${normalizedReviewId}`);
  };

  const onSave = async () => {
    if (!origin) return;
    if (!canEdit) return;

    const nextTitle = title.trim();
    const nextContent = content.trim();

    if (!nextTitle) return alert("제목을 입력해주세요.");
    if (!nextContent) return alert("내용을 입력해주세요.");

    setSaving(true);
    try {
      // ✅ 가장 보편적인 PUT 형태 (BE 스펙에 맞게 키 수정 가능)
      const body = {
        title: nextTitle,
        content: nextContent,
        imageUrl: imageUrl.trim() || null,
        tags: parsedTags.length ? parsedTags : [],
        // artworkId가 수정 불가면 굳이 안 보내도 됨
        artworkId: origin.artworkId,
      };

      await http.put(`${REVIEW_BASE}/${origin.reviewId}`, body);

      alert("수정되었습니다.");
      nav(`/reviews/${origin.reviewId}`);
    } catch (e) {
      console.error(e);
      alert("수정 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>Loading...</h2>
      </div>
    );
  }

  if (!origin) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>리뷰 정보를 불러올 수 없습니다.</h2>
        <button style={{ marginTop: 16 }} onClick={() => nav("/", { replace: true })} type="button">
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "110px 24px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>Review Edit</h2>
          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            작품: <b>{origin.artworkTitle}</b> · 작성자: <b>{origin.nickname}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onCancel} disabled={saving}>
            취소
          </button>
          <button type="button" onClick={onSave} disabled={!canEdit || saving}>
            {saving ? "Saving..." : "저장"}
          </button>
        </div>
      </div>

      {!canEdit && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#fff3cd", color: "#664d03" }}>
          수정 권한이 없습니다.
        </div>
      )}

      <section style={{ marginTop: 22, display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit || saving}
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10 }}
            placeholder="제목을 입력하세요"
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!canEdit || saving}
            rows={10}
            style={{ padding: "12px", border: "1px solid #ddd", borderRadius: 10, resize: "vertical" }}
            placeholder="내용을 입력하세요"
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>이미지 URL (선택)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={!canEdit || saving}
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10 }}
            placeholder="https://..."
          />
          {imageUrl.trim() && (
            <div style={{ marginTop: 6 }}>
              <img
                src={imageUrl.trim()}
                alt="preview"
                style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 12 }}
                onError={(e) => {
                  // 이미지 깨지면 미리보기 숨김
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>태그 (쉼표로 구분)</label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            disabled={!canEdit || saving}
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10 }}
            placeholder="예: 현대미술, 회화, 풍경"
          />
          {parsedTags.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {parsedTags.map((t) => (
                <span key={t} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div style={{ marginTop: 26, opacity: 0.7, fontSize: 12 }}>
        * 이미지 업로드가 파일(FormData) 방식이면, 현재 구현(이미지 URL)은 스펙에 맞게 수정이 필요합니다.
      </div>
    </div>
  );
}
