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

  // ✅ genreId는 드롭다운
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
    // ✅ create일 때만 이미지 필수
    if (mode === "create" && !image) return "이미지를 선택해주세요.";

    if (!title.trim()) return "작품 제목을 입력해주세요.";
    if (!genreId) return "장르를 선택해주세요.";

    // ✅ BE UpdateArtworkRequest에선 productionDate/size가 NotNull이므로
    // edit까지 고려하면 필수로 두는게 안전함 (create에서도 동일하게 강제 권장)
    if (!productionDate.trim()) return "제작일을 선택해주세요.";
    if (!size.trim()) return "사이즈(size)를 입력해주세요.";

    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return alert(err);

    // edit 모드에서 이미지 미선택이면 image가 null일 수 있음.
    // 하지만 onSubmit 타입이 ArtworkCreateReq(= image: File)라서 강제로 넣으면 런타임 문제.
    // 따라서 edit 모드에서도 "이미지 미선택"을 허용하려면
    // 1) onSubmit 타입을 UpdateReq로 분리하거나
    // 2) image를 optional로 바꾸는 게 맞다.
    //
    // 여기서는 "edit에서도 제출 시 image가 없으면 기존 image를 재사용" 전략으로 처리:
    // initial.image가 File로 들어오는 케이스만 가능. (일반적으로 서버 이미지는 File이 아님)
    //
    // ✅ 현실적으로는 edit에서는 ArtworkUpdateReq를 쓰는 별도 폼이 맞지만,
    // 요청대로 create 타입을 유지하며 최대한 안전하게 처리:
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
            {/* ✅ Field UI 제거: 고정값만 노출 */}
            <div className="pc-input-group">
              <label className="pc-label">Field</label>
              <input className="pc-input" value="기본(1)" disabled />
            </div>

            <div className="pc-input-group">
              <label className="pc-label">
                Genre <span className="req">*</span>
              </label>
              <select
                className="pc-input"
                value={genreId}
                onChange={(e) => setGenreId(Number(e.target.value))}
                disabled={!!submitting}
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.ko}
                  </option>
                ))}
              </select>
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
              Description{" "}
              <span className="req">
                {mode === "edit" ? "*" : ""}
              </span>
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
          {submitting
            ? "Uploading..."
            : mode === "edit"
              ? "Save Changes"
              : "Publish Artwork"}
        </button>
      </div>
    </>
  );
}
