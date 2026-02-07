// FE/src/features/reviews/ui/ReviewForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewCreateReq } from "../model/types";

type Props = {
  initial?: Partial<ReviewCreateReq>;
  submitting?: boolean;
  onSubmit: (data: ReviewCreateReq) => Promise<void> | void;
};

// ✅ 기본 이미지 목록 (public/review_basic/... 에 두면 /review_basic/... 로 접근됨)
const DEFAULT_IMAGES = [
  "/review_basic/basic_1.png",
  "/review_basic/basic_2.jpg",
  "/review_basic/basic_3.jpg",
  "/review_basic/basic_4.jpg",
];

// ✅ URL(기본 이미지)을 File로 변환해서 서버에 업로드 가능하게
async function urlToFile(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch default image: ${url} (${res.status})`);
  const blob = await res.blob();
  const filename = url.split("/").pop() || "default.jpg";

  // blob.type이 비어있는 경우가 있어 fallback
  const mime = blob.type && blob.type.length > 0 ? blob.type : "image/jpeg";
  return new File([blob], filename, { type: mime });
}

export default function ReviewForm({ initial, submitting, onSubmit }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(initial?.imageFile ?? null);

  // ✅ 이 폼 인스턴스에서 사용할 기본이미지 1개를 고정(렌더마다 바뀌지 않게)
  const defaultUrlRef = useRef(
    DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)],
  );

  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [tags, setTags] = useState<string>((initial?.tags ?? []).join(", "));
  const [reviewTitle, setReviewTitle] = useState(initial?.title ?? "");
  const [reviewText, setReviewText] = useState(initial?.content ?? "");
  const [artworkId, setArtworkId] = useState(
    typeof initial?.artworkId === "number" ? String(initial.artworkId) : "",
  );

  const parsedTags = useMemo(
    () => tags.split(",").map((t) => t.trim()).filter(Boolean),
    [tags],
  );

  // ✅ 미리보기는 "파일이 있으면 blob URL", 없으면 "기본 이미지 URL"을 보여줌
  useEffect(() => {
    // 기존 blob URL 정리
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(defaultUrlRef.current);
    }

    // 언마운트 시에도 blob URL 정리
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
  };

  const validate = () => {
    // ✅ 이미지는 선택사항 (없으면 기본 이미지로 대체 업로드)
    if (!reviewTitle.trim()) return "제목을 입력해주세요.";
    if (!reviewText.trim()) return "내용을 입력해주세요.";

    if (!artworkId.trim()) return "작품 ID를 입력해주세요.";
    const n = Number(artworkId);
    if (!Number.isFinite(n)) return "작품 ID는 숫자여야 합니다.";

    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return alert(err);

    // ✅ 파일 없으면 화면에 보여주던 기본이미지를 그대로 File로 변환해 업로드
    let finalImageFile = imageFile;
    if (!finalImageFile) {
      try {
        finalImageFile = await urlToFile(defaultUrlRef.current);
      } catch (error) {
        console.error("Failed to load default image:", error);
        return alert("기본 이미지를 불러오는데 실패했습니다.");
      }
    }

    const payload: ReviewCreateReq = {
      title: reviewTitle.trim(),
      content: reviewText.trim(),
      artworkId: Number(artworkId),
      tags: parsedTags, // ✅ 없으면 []
      imageFile: finalImageFile,
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

            {/* ✅ 기본이미지도 미리보기로 항상 보이게 */}
            <img src={previewUrl} alt="Preview" className="pc-preview-img" />
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
