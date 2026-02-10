// FE/src/pages/reviews/ReviewEdit.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../features/auth/store";
import { http } from "../../shared/api/http";

// ✅ DEV 프록시 + /src prefix 보정 + PROD origin 붙이기
import { resolveMediaUrl } from "../artworks/detail/utils";

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
      .map((x) => asString(x, ""))
      .map((s) => s.trim())
      .filter(Boolean);
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

// ✅ axios 응답에서 본문 꺼내기
function unwrapAxiosData(res: unknown): unknown {
  return isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
}

// ✅ 서버가 200이어도 {success:false,...}로 실패를 내려주는 케이스 방어
function ensureApiSuccess(payload: unknown): unknown {
  if (!isObject(payload)) return payload;

  const success = get(payload, "success");
  const isSuccess = get(payload, "isSuccess");
  const ok = get(payload, "ok");

  const explicitFail = success === false || isSuccess === false || ok === false;
  if (explicitFail) {
    const msg = asString(get(payload, "message"), "요청이 실패했습니다.");
    const code = asString(get(payload, "code"), "");
    throw new Error(code ? `${msg} (${code})` : msg);
  }

  return payload;
}

// ------------------- API PATHS -------------------
const REVIEW_BASE = "/api/v1/reviews"; // GET/PUT/DELETE /api/v1/reviews/{id}

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

  const reviewId = asNumber(get(body, "reviewId"), asNumber(get(body, "id"), NaN));
  const artworkId = asNumber(get(body, "artworkId"), asNumber(get(body, "artwork_id"), NaN));
  if (!Number.isFinite(reviewId) || !Number.isFinite(artworkId)) return null;

  const title = asString(get(body, "title"), "");
  const content = asString(get(body, "content"), "");
  const imageUrl = asString(get(body, "imageUrl"), asString(get(body, "image"), "")).trim();

  const createdAtIso = toIso(get(body, "createdAtIso") ?? get(body, "createdAt"));

  const memberUuid =
    asString(get(body, "memberUuid"), "").trim() ||
    asString(get(body, "authorUuid"), "").trim() ||
    asString(get(body, "writerUuid"), "").trim();

  const nickname =
    asString(get(body, "nickname"), "").trim() ||
    asString(get(body, "authorName"), "").trim() ||
    asString(get(body, "writerName"), "").trim() ||
    "—";

  const artistUuid =
    asString(get(body, "artistUuid"), "").trim() ||
    asString(get(body, "artistMemberUuid"), "").trim() ||
    asString(get(body, "artistId"), "").trim();

  const artistName =
    asString(get(body, "artistName"), "").trim() ||
    asString(get(body, "artist"), "").trim() ||
    "Unknown Artist";

  const artworkTitle =
    asString(get(body, "artworkTitle"), "").trim() ||
    asString(get(body, "artworkName"), "").trim() ||
    asString(get(body, "artwork"), "").trim() ||
    "Untitled Artwork";

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
  const [deleting, setDeleting] = useState(false);

  const [origin, setOrigin] = useState<ReviewDetailData | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // ✅ 기존 이미지 url(서버값 유지용)
  const [tagsText, setTagsText] = useState(""); // "a,b,c"

  // ✅ 파일 업로드로 이미지 교체
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(""); // blob url
  const [imgHovered, setImgHovered] = useState(false);

  const canEdit = useMemo(() => {
    if (!isLoggedIn || !user?.memberUuid) return false;
    if (!origin?.memberUuid) return false;
    return user.memberUuid === origin.memberUuid;
  }, [isLoggedIn, user, origin]);

  const parsedTags = useMemo(() => {
    const arr = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(arr)); // 중복 제거
  }, [tagsText]);

  // ✅ 화면에 보여줄 이미지 src (선택한 파일 > 기존 서버 이미지)
  const displayImageSrc = useMemo(() => {
    if (imagePreviewUrl) return imagePreviewUrl;
    const u = imageUrl.trim();
    return u ? resolveMediaUrl(u) : "";
  }, [imagePreviewUrl, imageUrl]);

  // blob URL revoke (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const onPickImageFile = (file: File | null) => {
    // 기존 preview revoke
    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);

    if (!file) {
      setImagePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  useEffect(() => {
    if (!normalizedReviewId) {
      nav("/", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        const res = await http.get(`${REVIEW_BASE}/${normalizedReviewId}`);
        const payload = unwrapAxiosData(res);

        const mapped = mapReviewDetail(payload);
        if (cancelled) return;

        setOrigin(mapped);

        // prefill
        setTitle(mapped?.title ?? "");
        setContent(mapped?.content ?? "");
        setImageUrl(mapped?.imageUrl ?? "");
        setTagsText((mapped?.tags ?? []).join(", "));

        // ✅ 파일 교체 상태는 초기화
        onPickImageFile(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedReviewId, nav]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      alert("로그인이 필요합니다.");
      nav(`/reviews/${normalizedReviewId}`, { replace: true });
    }
  }, [loading, isLoggedIn, nav, normalizedReviewId]);

  useEffect(() => {
    if (!loading && origin && isLoggedIn && user?.memberUuid && user.memberUuid !== origin.memberUuid) {
      alert("수정 권한이 없습니다.");
      nav(`/reviews/${normalizedReviewId}`, { replace: true });
    }
  }, [loading, origin, isLoggedIn, user, nav, normalizedReviewId]);

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
      // ✅ 이미지 파일 없으면 JSON (서버가 @RequestBody로 받는 경우가 많음)
      if (!imageFile) {
        const res = await http.put(`${REVIEW_BASE}/${normalizedReviewId}`, {
          title: nextTitle,
          content: nextContent,
          artworkId: origin.artworkId,
          tags: parsedTags, // 배열
          // 기존 이미지 유지가 서버에서 필요하면 같이 보내기(무시해도 OK)
          imageUrl: imageUrl.trim() || null,
        });

        ensureApiSuccess(res.data);
      } else {
        // ✅ 이미지 파일 있으면 multipart
        const fd = new FormData();
        fd.append("title", nextTitle);
        fd.append("content", nextContent);
        fd.append("artworkId", String(origin.artworkId));

        // tags: List<String> 바인딩 호환 (반복 append)
        parsedTags.forEach((t) => fd.append("tags", t));
        // fallback: JSON 문자열도 같이(서버가 tagsJson을 파싱하는 케이스 대비)
        fd.append("tagsJson", JSON.stringify(parsedTags.length ? parsedTags : []));

        // ✅ 파일 키 이름은 서버 스펙과 동일해야 함 (imageFile이 맞는지 BE 확인 필요)
        fd.append("imageFile", imageFile);

        const res = await http.put(`${REVIEW_BASE}/${normalizedReviewId}`, fd);
        ensureApiSuccess(res.data);
      }

      alert("수정되었습니다.");
      nav(`/reviews/${normalizedReviewId}`);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "수정 실패";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!canEdit) return;
    if (!normalizedReviewId) return;

    const ok = window.confirm("정말 삭제할까요? (되돌릴 수 없습니다)");
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await http.delete(`${REVIEW_BASE}/${normalizedReviewId}`);
      // ✅ 삭제도 success:false 형태면 실패로 처리
      ensureApiSuccess(res.data);

      alert("삭제되었습니다.");
      nav("/reviews", { replace: true });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "삭제 실패";
      alert(msg);
    } finally {
      setDeleting(false);
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
          <button type="button" onClick={onCancel} disabled={saving || deleting}>
            취소
          </button>
          <button type="button" onClick={onDelete} disabled={!canEdit || saving || deleting}>
            {deleting ? "Deleting..." : "삭제"}
          </button>
          <button type="button" onClick={onSave} disabled={!canEdit || saving || deleting}>
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
            disabled={!canEdit || saving || deleting}
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10 }}
            placeholder="제목을 입력하세요"
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!canEdit || saving || deleting}
            rows={10}
            style={{ padding: "12px", border: "1px solid #ddd", borderRadius: 10, resize: "vertical" }}
            placeholder="내용을 입력하세요"
          />
        </div>

        {/* ✅ 이미지: 기존 이미지 미리보기 + hover 시 파일로 교체 */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>이미지</label>

          <div
            style={{
              position: "relative",
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              border: displayImageSrc ? "none" : "1px solid #ddd",
            }}
            onMouseEnter={() => setImgHovered(true)}
            onMouseLeave={() => setImgHovered(false)}
          >
            {displayImageSrc ? (
              <img
                src={displayImageSrc}
                alt="preview"
                style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div style={{ height: 220, display: "grid", placeItems: "center", borderRadius: 12 }}>
                이미지 없음
              </div>
            )}

            {/* hover overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "flex-end",
                padding: 12,
                background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0))",
                opacity: imgHovered ? 1 : 0,
                transition: "opacity .15s ease",
                pointerEvents: "none",
              }}
            >
              <button
                type="button"
                style={{
                  pointerEvents: "auto",
                  background: "rgba(0,0,0,0.75)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEdit || saving || deleting}
              >
                이미지 변경
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={!canEdit || saving || deleting}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              onPickImageFile(f);
              // 같은 파일 다시 선택 가능하도록 값 초기화
              e.currentTarget.value = "";
            }}
          />

          {imageFile && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                선택됨: <b>{imageFile.name}</b>
              </div>
              <button
                type="button"
                onClick={() => onPickImageFile(null)}
                disabled={!canEdit || saving || deleting}
                style={{ padding: "6px 10px" }}
              >
                선택 취소(기존 이미지 유지)
              </button>
            </div>
          )}

          <div style={{ fontSize: 12, opacity: 0.65 }}>* 새 이미지를 선택하지 않으면 기존 이미지를 유지합니다.</div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>태그 (쉼표로 구분)</label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            disabled={!canEdit || saving || deleting}
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
    </div>
  );
}
