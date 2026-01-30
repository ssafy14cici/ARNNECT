import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./postCreate.css";

import { useAuthStore } from "../../features/auth/store";
import { createLocalPost } from "../../features/posts/local";

type Mode = "ARTIST" | "USER";
type Props = { mode: Mode };

export default function PostCreate({ mode }: Props) {
  const navigate = useNavigate();
  const isArtist = useMemo(() => mode === "ARTIST", [mode]);

  const authUser = useAuthStore((s) => s.user);
  const appRole = useAuthStore((s) => s.role);

  const [loading, setLoading] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [tags, setTags] = useState<string>("");

  // ARTIST
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [field, setField] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [size, setSize] = useState("");

  // USER
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [artworkId, setArtworkId] = useState("");

  const parsedTags = useMemo(
    () => tags.split(",").map((t) => t.trim()).filter(Boolean),
    [tags],
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    if (!authUser?.memberUuid) return "로그인 후 이용해주세요.";
    if (!imageFile) return "이미지를 선택해주세요.";

    if (isArtist) {
      if (!title.trim()) return "작품 제목을 입력해주세요.";
      if (!field.trim()) return "분야(field)를 입력해주세요.";
      if (!genre.trim()) return "장르(genre)를 입력해주세요.";
      if (!year.trim() || isNaN(Number(year))) return "제작년도는 숫자여야 합니다.";
      return null;
    }

    if (!reviewTitle.trim()) return "제목을 입력해주세요.";
    if (!reviewText.trim()) return "내용을 입력해주세요.";
    if (!artworkId.trim() || isNaN(Number(artworkId))) return "작품 ID는 숫자여야 합니다.";
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) return alert(err);

    setLoading(true);
    try {
      const authorId = authUser!.memberUuid;
      const authorName = authUser!.name;

      if (isArtist) {
        await createLocalPost({
          mode: "ARTIST",
          authorId,
          authorName,
          title: title.trim(),
          content: [
            description?.trim(),
            `field: ${field.trim()}`,
            `genre: ${genre.trim()}`,
            `year: ${year.trim()}`,
            size ? `size: ${size.trim()}` : "",
          ].filter(Boolean).join("\n"),
          imageFile,
          tags: parsedTags,
        });
      } else {
        await createLocalPost({
          mode: "USER",
          authorId,
          authorName,
          title: reviewTitle.trim(),
          content: reviewText.trim(),
          imageFile,
          tags: parsedTags,
          artworkId: Number(artworkId),
        });
      }

      alert("등록되었습니다. (로컬 저장)");
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`post-create-page ${isArtist ? "theme-artist" : "theme-user"}`}>
      <div className="pc-container">
        <header className="pc-header">
          <h1 className="pc-title">{isArtist ? "New Artwork" : "New Review"}</h1>
          <button className="pc-close-btn" onClick={() => navigate(-1)} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

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
            {isArtist ? (
              <>
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
              </>
            ) : (
              <>
                <div className="pc-input-group">
                  <label className="pc-label">
                    Title <span className="req">*</span>
                  </label>
                  <input className="pc-input" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Title of your review" />
                </div>

                <div className="pc-input-group">
                  <label className="pc-label">
                    Artwork ID <span className="req">*</span>
                  </label>
                  <input className="pc-input" value={artworkId} onChange={(e) => setArtworkId(e.target.value)} placeholder="Target Artwork ID" type="number" />
                </div>

                <div className="pc-input-group">
                  <label className="pc-label">
                    Content <span className="req">*</span>
                  </label>
                  <textarea className="pc-textarea" value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={8} placeholder="Share your thoughts..." />
                </div>
              </>
            )}

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
          <button className="pc-submit-btn" onClick={onSubmit} disabled={loading} type="button">
            {loading ? "Uploading..." : "Publish Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
