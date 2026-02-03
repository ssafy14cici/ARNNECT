import { useEffect, useMemo, useState } from "react";
import type { ArtworkCreateReq } from "../model/types";

type Props = {
  initial?: Partial<ArtworkCreateReq>;
  submitting?: boolean;
  onSubmit: (data: ArtworkCreateReq) => Promise<void> | void;
};

export default function ArtworkForm({ initial, submitting, onSubmit }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(initial?.imageFile ?? null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [tags, setTags] = useState<string>((initial?.tags ?? []).join(", "));

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [field, setField] = useState(initial?.field ?? "");
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [year, setYear] = useState(initial?.productionDate ? String(initial.productionDate) : "");
  const [size, setSize] = useState(initial?.size ?? "");

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
    if (!title.trim()) return "작품 제목을 입력해주세요.";
    if (!field.trim()) return "분야(field)를 입력해주세요.";
    if (!genre.trim()) return "장르(genre)를 입력해주세요.";
    if (!year.trim() || isNaN(Number(year))) return "제작년도는 숫자여야 합니다.";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return alert(err);

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      field: field.trim(),
      genre: genre.trim(),
      productionDate: Number(year),
      size: size.trim(),
      tags: parsedTags,
      imageFile: imageFile!,
    });
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
            <input className="pc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
          </div>

          <div className="pc-row-2">
            <div className="pc-input-group">
              <label className="pc-label">
                Field <span className="req">*</span>
              </label>
              <input className="pc-input" value={field} onChange={(e) => setField(e.target.value)} placeholder="Ex: Painting" />
            </div>
            <div className="pc-input-group">
              <label className="pc-label">
                Genre <span className="req">*</span>
              </label>
              <input className="pc-input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Ex: Abstract" />
            </div>
          </div>

          <div className="pc-row-2">
            <div className="pc-input-group">
              <label className="pc-label">
                Year <span className="req">*</span>
              </label>
              <input className="pc-input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" type="number" />
            </div>
            <div className="pc-input-group">
              <label className="pc-label">Size</label>
              <input className="pc-input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="100x100cm" />
            </div>
          </div>

          <div className="pc-input-group">
            <label className="pc-label">Description</label>
            <textarea className="pc-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Tell us about your artwork..." />
          </div>

          <div className="pc-input-group">
            <label className="pc-label">Tags</label>
            <input className="pc-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="art, exhibition, mood (comma separated)" />
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
          {submitting ? "Uploading..." : "Publish Artwork"}
        </button>
      </div>
    </>
  );
}
