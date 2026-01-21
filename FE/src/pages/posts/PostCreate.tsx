import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./postCreate.css";

type Mode = "ARTIST" | "USER";

type Props = {
  mode: Mode;
};

export default function PostCreate({ mode }: Props) {
  const navigate = useNavigate();
  const isArtist = useMemo(() => mode === "ARTIST", [mode]);

  // 공통
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string>("");

  // ARTIST(작품)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [field, setField] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [size, setSize] = useState("");

  // USER(감상평)
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [artworkIdOrUuid, setArtworkIdOrUuid] = useState(""); // optional

  const parsedTags = useMemo(() => {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tags]);

  const validate = () => {
    if (!imageFile) return "이미지를 선택해줘.";

    if (isArtist) {
      if (!title.trim()) return "작품 제목을 입력해줘.";
      if (!field.trim()) return "분야(field)를 입력해줘.";
      if (!genre.trim()) return "장르(genre)를 입력해줘.";
      return null;
    }

    // USER
    if (!reviewTitle.trim()) return "감상평 제목을 입력해줘.";
    if (!reviewText.trim()) return "감상평 내용을 입력해줘.";
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    // ✅ 백엔드 붙기 전: formData 구성까지만 해두고 TODO로 남김
    const fd = new FormData();
    fd.append("image", imageFile!);

    if (isArtist) {
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("field", field.trim());
      fd.append("genre", genre.trim());
      parsedTags.forEach((t) => fd.append("tags", t));
      if (year.trim()) fd.append("year", year.trim());
      if (size.trim()) fd.append("size", size.trim());

      console.log("[ARTWORK CREATE] FormData ready", Object.fromEntries(fd.entries()));
      alert("TODO: 작품 등록 API 연결 (POST /api/v1/artworks)");
    } else {
      fd.append("title", reviewTitle.trim());
      fd.append("text", reviewText.trim());
      parsedTags.forEach((t) => fd.append("tags", t));
      if (artworkIdOrUuid.trim()) fd.append("artworkUuid", artworkIdOrUuid.trim());

      console.log("[REVIEW CREATE] FormData ready", Object.fromEntries(fd.entries()));
      alert("TODO: 감상평 등록 API 연결 (POST /api/v1/reviews)");
    }

    // 임시: 성공 가정 후 돌아가기
    navigate(-1);
  };

  return (
    <div className="postCreate">
      <div className="postCreateTop">
        <button className="postCreateBack" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="postCreateTitle">
          {isArtist ? "작품 등록" : "감상평 작성"}
        </div>
        <button className="postCreateSubmit" onClick={onSubmit}>
          등록
        </button>
      </div>

      <div className="postCreateBody">
        <label className="pcLabel">이미지</label>
        <input
          className="pcInput"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />

        {isArtist ? (
          <>
            <label className="pcLabel">작품 제목</label>
            <input className="pcInput" value={title} onChange={(e) => setTitle(e.target.value)} />

            <label className="pcLabel">작품 설명</label>
            <textarea
              className="pcTextarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />

            <div className="pcGrid2">
              <div>
                <label className="pcLabel">분야(field)</label>
                <input className="pcInput" value={field} onChange={(e) => setField(e.target.value)} />
              </div>
              <div>
                <label className="pcLabel">장르(genre)</label>
                <input className="pcInput" value={genre} onChange={(e) => setGenre(e.target.value)} />
              </div>
            </div>

            <div className="pcGrid2">
              <div>
                <label className="pcLabel">제작년도(선택)</label>
                <input className="pcInput" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div>
                <label className="pcLabel">사이즈(선택)</label>
                <input className="pcInput" value={size} onChange={(e) => setSize(e.target.value)} />
              </div>
            </div>
          </>
        ) : (
          <>
            <label className="pcLabel">감상평 제목</label>
            <input className="pcInput" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} />

            <label className="pcLabel">감상평 내용</label>
            <textarea
              className="pcTextarea"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={8}
            />

            <label className="pcLabel">작품 ID/UUID (선택)</label>
            <input
              className="pcInput"
              value={artworkIdOrUuid}
              onChange={(e) => setArtworkIdOrUuid(e.target.value)}
              placeholder="연결할 작품이 있으면 입력"
            />
          </>
        )}

        <label className="pcLabel">태그 (쉼표로 구분)</label>
        <input
          className="pcInput"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="예: 현대미술, 추상, 전시"
        />

        {parsedTags.length > 0 && (
          <div className="pcTagRow">
            {parsedTags.map((t) => (
              <span key={t} className="pcTag">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
