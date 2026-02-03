// FE/src/features/artworks/ui/ArtworkForm.tsx
import { useEffect, useMemo, useState } from "react";
import type { ArtworkCreateReq } from "../model/types";
import { FIXED_FIELD_ID, GENRE_OPTIONS } from "../model/constants";

type Mode = "create" | "edit";

type Props = {
  /** create: 이미지 필수 / edit: 이미지 선택 */
  mode?: Mode;
  initial?: Partial<ArtworkCreateReq>;
  submitting?: boolean;
  onSubmit: (data: ArtworkCreateReq) => Promise<void> | void;
};

export default function ArtworkForm({
  mode = "create",
  initial,
  submitting,
  onSubmit,
}: Props) {
  const [image, setImage] = useState<File | null>(initial?.image ?? null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [tags, setTags] = useState<string>((initial?.tags ?? []).join(", "));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  // ✅ fieldId는 DB에 1개라 고정
  const fieldId = FIXED_FIELD_ID;

  // ✅ genreId: 토글 단일 선택
  const [genreId, setGenreId] = useState<number>(initial?.genreId ?? 1);

  // ✅ LocalDate: YYYY-MM-DD
  const [productionDate, setProductionDate] = useState<string>(
    initial?.productionDate ?? "",
  );
  const [size, setSize] = useState(initial?.size ?? "");

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const validate = () => {
    if (mode === "create" && !image) return "이미지를 선택해주세요.";
    if (!title.trim()) return "작품 제목을 입력해주세요.";
    if (!genreId) return "장르를 선택해주세요.";
    if (!productionDate.trim()) return "제작일을 선택해주세요.";
    if (!size.trim()) return "사이즈(size)를 입력해주세요.";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return alert(err);

    const effectiveImage = image ?? initial?.image ?? null;
    if (!effectiveImage) return alert("이미지를 선택해주세요.");

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,

      fieldId,
      genreId,

      productionDate: productionDate.trim(),
      size: size.trim(),

      tags: parsedTags.length ? parsedTags : undefined,
      image: effectiveImage,
    });
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
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="pc-preview-img" />
            ) : (
              <div className="pc-upload-placeholder">
                <span className="plus-icon">+</span>
                <span>{mode === "edit" ? "Change Image" : "Upload Image"}</span>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              disabled={!!submitting}
            />
          </div>

          <div className="pc-row-2">

            {/* ✅ Genre: 토글(단일 선택) */}
            <div className="pc-input-group">
              <label className="pc-label">
                Genre <span className="req">*</span>
              </label>

              <div className="pc-genre-toggle">
                {GENRE_OPTIONS.map((g) => {
                  const active = g.id === genreId;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      className={`pc-genre-chip ${active ? "is-active" : ""}`}
                      onClick={() => setGenreId(g.id)}
                      disabled={!!submitting}
                      aria-pressed={active}
                      title={g.en}
                    >
                      {g.ko}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pc-row-2">
            <div className="pc-input-group">
              <label className="pc-label">
                Production Date <span className="req">*</span>
              </label>
              <input
                className="pc-input"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                type="date"
                disabled={!!submitting}
              />
            </div>

            <div className="pc-input-group">
              <label className="pc-label">
                Size <span className="req">*</span>
              </label>
              <input
                className="pc-input"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="100x100cm"
                disabled={!!submitting}
              />
            </div>
          </div>

          <div className="pc-input-group">
            <label className="pc-label">
              Description <span className="req">{mode === "edit" ? "*" : ""}</span>
            </label>
            <textarea
              className="pc-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Tell us about your artwork..."
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
        <button
          className="pc-submit-btn"
          onClick={submit}
          disabled={!!submitting}
          type="button"
        >
          {submitting ? "Uploading..." : mode === "edit" ? "Save Changes" : "Publish Artwork"}
        </button>
      </div>
    </>
  );
}
