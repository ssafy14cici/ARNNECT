import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./postCreate.css";

import { uploadImage, createArtwork, createReview } from "../../api/post"; 
import { useAuthStore } from "../../stores/authStore";

type Mode = "ARTIST" | "USER";

type Props = {
  mode: Mode;
};

export default function PostCreate({ mode }: Props) {
  const navigate = useNavigate();
  const isArtist = useMemo(() => mode === "ARTIST", [mode]);
  
  // 로딩 상태
  const [loading, setLoading] = useState(false);

  // 공통
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [tags, setTags] = useState<string>("");

  // ARTIST (작품)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [field, setField] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [size, setSize] = useState("");

  // USER (감상평)
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [artworkId, setArtworkId] = useState(""); 

  // 태그 파싱
  const parsedTags = useMemo(() => {
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  }, [tags]);

  // 이미지 변경 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    if (!imageFile) return "이미지를 선택해주세요.";

    if (isArtist) {
      if (!title.trim()) return "작품 제목을 입력해주세요.";
      if (!field.trim()) return "분야(field)를 입력해주세요.";
      if (!genre.trim()) return "장르(genre)를 입력해주세요.";
      if (!year.trim() || isNaN(Number(year))) return "제작년도는 숫자여야 합니다.";
      return null;
    }

    // USER
    if (!reviewTitle.trim()) return "제목을 입력해주세요.";
    if (!reviewText.trim()) return "내용을 입력해주세요.";
    if (!artworkId.trim() || isNaN(Number(artworkId))) return "작품 ID는 숫자여야 합니다.";
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    setLoading(true);
    try {
      // 1. 이미지 업로드 후 URL 획득
      const uploadedImageUrl = await uploadImage(imageFile!);

      // 2. 모드별 API 호출
      if (isArtist) {
        await createArtwork({
          title: title.trim(),
          description: description.trim(),
          field: field.trim(),
          genre: genre.trim(),
          productionDate: Number(year),
          size: size.trim(),
          imageUrl: uploadedImageUrl,
          tags: parsedTags,
        });
      } else {
        await createReview({
          title: reviewTitle.trim(),
          content: reviewText.trim(),
          artworkId: Number(artworkId),
          imageUrl: uploadedImageUrl,
          tags: parsedTags,
        });
      }

      // 3. 완료 후 이동
      alert("등록되었습니다.");
      navigate(-1);
    } catch (error) {
      console.error(error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`post-create-page ${isArtist ? 'theme-artist' : 'theme-user'}`}>
      <div className="pc-container">
        
        {/* Header */}
        <header className="pc-header">
          <h1 className="pc-title">{isArtist ? "New Artwork" : "New Review"}</h1>
          <button className="pc-close-btn" onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <div className="pc-content">
          {/* 1. Image Upload Section */}
          <div className="pc-upload-section">
            <label className="pc-upload-box">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                hidden 
              />
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

          {/* 2. Form Section */}
          <div className="pc-form-section">
            
            {isArtist ? (
              // --- ARTIST FORM ---
              <>
                <div className="pc-input-group">
                  <label className="pc-label">Title <span className="req">*</span></label>
                  <input className="pc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
                </div>

                <div className="pc-row-2">
                  <div className="pc-input-group">
                    <label className="pc-label">Field <span className="req">*</span></label>
                    <input className="pc-input" value={field} onChange={(e) => setField(e.target.value)} placeholder="Ex: Painting" />
                  </div>
                  <div className="pc-input-group">
                    <label className="pc-label">Genre <span className="req">*</span></label>
                    <input className="pc-input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Ex: Abstract" />
                  </div>
                </div>

                <div className="pc-row-2">
                  <div className="pc-input-group">
                    <label className="pc-label">Year <span className="req">*</span></label>
                    <input className="pc-input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" type="number" />
                  </div>
                  <div className="pc-input-group">
                    <label className="pc-label">Size</label>
                    <input className="pc-input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="100x100cm" />
                  </div>
                </div>

                <div className="pc-input-group">
                  <label className="pc-label">Description</label>
                  <textarea 
                    className="pc-textarea" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={5} 
                    placeholder="Tell us about your artwork..."
                  />
                </div>
              </>
            ) : (
              // --- USER FORM ---
              <>
                <div className="pc-input-group">
                  <label className="pc-label">Title <span className="req">*</span></label>
                  <input className="pc-input" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Title of your review" />
                </div>

                <div className="pc-input-group">
                  <label className="pc-label">Artwork ID <span className="req">*</span></label>
                  <input className="pc-input" value={artworkId} onChange={(e) => setArtworkId(e.target.value)} placeholder="Target Artwork ID" type="number" />
                </div>

                <div className="pc-input-group">
                  <label className="pc-label">Content <span className="req">*</span></label>
                  <textarea 
                    className="pc-textarea" 
                    value={reviewText} 
                    onChange={(e) => setReviewText(e.target.value)} 
                    rows={8} 
                    placeholder="Share your thoughts..."
                  />
                </div>
              </>
            )}

            {/* Common: Tags */}
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
                  {parsedTags.map(t => <span key={t}>#{t}</span>)}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="pc-footer">
          <button className="pc-submit-btn" onClick={onSubmit} disabled={loading}>
            {loading ? "Uploading..." : "Publish Post"}
          </button>
        </div>

      </div>
    </div>
  );
}