import { useEffect, useMemo, useState } from "react";
import type { ReviewCreateReq } from "../model/types";

type Props = {
  initial?: Partial<ReviewCreateReq>;
  submitting?: boolean;
  onSubmit: (data: ReviewCreateReq) => Promise<void> | void;
};

export default function ReviewForm({ initial, submitting, onSubmit }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(initial?.imageFile ?? null);
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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const validate = () => {
    if (!imageFile) return "이미지를 선택해주세요.";
    if (!reviewTitle.trim()) return "제목을 입력해주세요.";
    if (!reviewText.trim()) return "내용을 입력해주세요.";
    if (!artworkId.trim() && isNaN(Number(artworkId))) return "작품 ID는 숫자여야 합니다.";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return alert(err);

    // ✅ 필수값만 먼저 담기
    const payload: ReviewCreateReq = {
      title: reviewTitle.trim(),
      content: reviewText.trim(),
      imageFile: imageFile!, // validate에서 이미지 체크하니까 ! 사용 OK
    };

    // ✅ artworkId: 입력했을 때만 넣기 (비었으면 아예 필드 없음)
    if (artworkId.trim()) {
      payload.artworkId = Number(artworkId);
    }

    // ✅ tags: 입력이 있을 때만 넣기 (없으면 아예 필드 없음 = 서버에서 null/empty 취급)
    if (parsedTags.length > 0) {
      payload.tags = parsedTags;
    }

    await onSubmit(payload);
  };



  return (
    <>
      <div className="pc-content">
        <div className="pc-upload-section">
          <label className="pc-upload-box">
            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="pc-preview-img" />
            ) : (
              <div className="pc-upload-placeholder">
                <span className="plus-icon">+</span>
                <span>Upload Image</span>
              </div>
            )}
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
            />
          </div>

          <div className="pc-input-group">
            <label className="pc-label">Tags</label>
            <input
              className="pc-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="art, exhibition, mood (comma separated)"
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
