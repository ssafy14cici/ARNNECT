// FE/src/features/reviews/ui/ReviewForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewCreateReq } from "../model/types";

type Props = {
  initial?: Partial<ReviewCreateReq>;
  submitting?: boolean;
  onSubmit: (data: ReviewCreateReq) => Promise<void> | void;
};

// ✅ public/review_basic/... 에 두면 접근 경로는 BASE_URL + review_basic/... 로 만드는 게 안전함
const DEFAULT_IMAGES = [
  "review_basic/basic_1.png",
  "review_basic/basic_2.jpg",
  "review_basic/basic_3.jpg",
  "review_basic/basic_4.jpg",
] as const;

function publicAssetUrl(path: string) {
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

/**
 * ✅ (참고) 기존에는 기본이미지를 서버에 업로드하려고 urlToFile을 썼는데,
 * "이미지 없이도 글 등록" 요구사항이면 서버 업로드는 하지 않는 게 맞음.
 * - 지금은 미리보기용 기본 이미지 표시만 하고, 업로드는 사용자가 파일 선택했을 때만 함.
 */
// async function urlToFile(url: string): Promise<File> {
//   const res = await fetch(url, { cache: "no-store" });
//   if (!res.ok) throw new Error(`Failed to fetch default image: ${url} (${res.status})`);
//   const blob = await res.blob();
//   const filename = url.split("/").pop()?.split("?")[0] || "default.jpg";
//   const mime = blob.type && blob.type.length > 0 ? blob.type : "image/jpeg";
//   return new File([blob], filename, { type: mime });
// }

export default function ReviewForm({ initial, submitting, onSubmit }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(initial?.imageFile ?? null);

  // ✅ 이 폼 인스턴스에서 사용할 기본이미지 1개를 고정(렌더마다 바뀌지 않게)
  const defaultUrlRef = useRef(
    publicAssetUrl(DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)]),
  );

  const [previewUrl, setPreviewUrl] = useState<string>(defaultUrlRef.current);

  const [tags, setTags] = useState<string>((initial?.tags ?? []).join(", "));
  const [reviewTitle, setReviewTitle] = useState(initial?.title ?? "");
  const [reviewText, setReviewText] = useState(initial?.content ?? "");
  const [artworkId, setArtworkId] = useState(
    typeof initial?.artworkId === "number" ? String(initial.artworkId) : "",
  );

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tags],
  );

  // ✅ blob URL 정리용 (stale previewUrl 문제 방지)
  const blobUrlRef = useRef<string | null>(null);

  // ✅ 미리보기: 파일 있으면 blob URL, 없으면 기본 이미지 URL
  useEffect(() => {
    // 이전 blob URL 정리
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(defaultUrlRef.current);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [imageFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
  };

  const validate = () => {
    // ✅ 이미지 없이도 등록 가능 (검증에서 이미지 체크 제거)
    if (!reviewTitle.trim()) return "제목을 입력해주세요.";
    if (!reviewText.trim()) return "내용을 입력해주세요.";

    if (!artworkId.trim()) return "작품 ID를 입력해주세요.";
    const n = Number(artworkId);
    if (!Number.isFinite(n)) return "작품 ID는 숫자여야 합니다.";

    return null;
  };

  const submit = async () => {
    if (submitting) return; // ✅ 중복 제출 방지
    const err = validate();
    if (err) return alert(err);

    // ✅ 이미지 없이도 payload가 만들어지도록: 파일 선택한 경우에만 imageFile 포함
    const payload: ReviewCreateReq = {
      title: reviewTitle.trim(),
      content: reviewText.trim(),
      artworkId: Number(artworkId),
      tags: parsedTags, // ✅ 없으면 []
      ...(imageFile ? { imageFile } : {}), // ✅ 핵심: 선택 시에만 포함
    };

    await onSubmit(payload);
  };

  return (
    <>
      <div className="pc-content">
        <div className="pc-upload-section">
          <label className="pc-upload-box">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
              disabled={!!submitting}
            />

            {/* ✅ 기본이미지도 미리보기로 항상 보이게 (서버 업로드는 아님) */}
            <img
              src={previewUrl}
              alt="Preview"
              className="pc-preview-img"
              onError={(e) => {
                e.currentTarget.src = defaultUrlRef.current;
              }}
            />
          </label>
        </div>

        <div className="pc-form-section">
          <div className="pc-input-group">
            <label className="pc-label">
              Title <span className="req">*</span>
            </label>
            <input
              className="pc-input"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Title of your review"
              disabled={!!submitting}
            />
          </div>

          <div className="pc-input-group">
            <label className="pc-label">
              Artwork ID <span className="req">*</span>
            </label>
            <input
              className="pc-input"
              value={artworkId}
              onChange={(e) => setArtworkId(e.target.value)}
              placeholder="Target Artwork ID"
              type="number"
              disabled={!!submitting}
            />
          </div>

          <div className="pc-input-group">
            <label className="pc-label">
              Content <span className="req">*</span>
            </label>
            <textarea
              className="pc-textarea"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={8}
              placeholder="Share your thoughts..."
              disabled={!!submitting}
            />
          </div>

          <div className="pc-input-group">
            <label className="pc-label">Tags</label>
            <input
              className="pc-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="art, exhibition, mood (comma separated)"
              disabled={!!submitting}
            />
            {parsedTags.length > 0 && (
              <div className="pc-tags-preview">
                {parsedTags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pc-footer">
        <button className="pc-submit-btn" onClick={submit} disabled={!!submitting} type="button">
          {submitting ? "Uploading..." : "Publish Review"}
        </button>
      </div>
    </>
  );
}
