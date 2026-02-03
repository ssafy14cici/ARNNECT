import { useEffect, useMemo, useState } from "react";
import type { ArtworkCreateReq } from "../model/types";
import { FIXED_FIELD_ID, GENRE_OPTIONS } from "../model/constants";

type Mode = "create" | "edit";

type Props = {
  mode?: Mode; // create: 이미지 필수 / edit: 이미지 선택(하지만 현재 타입상 결국 필요)
  initial?: Partial<ArtworkCreateReq>;
  submitting?: boolean;
  onSubmit: (data: ArtworkCreateReq) => Promise<void> | void;
};

function splitSize(raw?: string) {
  const s = (raw ?? "").trim();
  if (!s) return { w: "", h: "" };

  // "100*200" / "100×200" / "100x200" / "100 X 200" 등 방어
  const normalized = s.replace(/\s/g, "").replace("×", "*").replace(/x/gi, "*");
  const [w, h] = normalized.split("*");
  return { w: w ?? "", h: h ?? "" };
}

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

  // ✅ fieldId는 DB에 1개라 고정 (UI는 완전 제거)
  const fieldId = FIXED_FIELD_ID;

  // ✅ genreId: 토글 단일 선택
  const [genreId, setGenreId] = useState<number>(initial?.genreId ?? 1);

  // ✅ LocalDate: YYYY-MM-DD
  const [productionDate, setProductionDate] = useState<string>(initial?.productionDate ?? "");

  // ✅ size: 가로/세로 입력 → 전송 시 "w*h"
  const initSize = useMemo(() => splitSize(initial?.size), [initial?.size]);
  const [sizeW, setSizeW] = useState(initSize.w);
  const [sizeH, setSizeH] = useState(initSize.h);

  const parsedTags = useMemo(
    () => tags.split(",").map((t) => t.trim()).filter(Boolean),
    [tags],
  );

  // initial 이미지가 File로 들어온 경우에도 프리뷰 생성
  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 1회만(초기 이미지 프리뷰용)

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

    if (!sizeW.trim() || !sizeH.trim()) return "사이즈(가로/세로)를 입력해주세요.";
    if (Number.isNaN(Number(sizeW)) || Number.isNaN(Number(sizeH))) return "사이즈는 숫자만 입력해주세요.";

    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return alert(err);

    const effectiveImage = image ?? initial?.image ?? null;
    if (!effectiveImage) return alert("이미지를 선택해주세요.");

    const size = `${sizeW.trim()}*${sizeH.trim()}`;

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,

      fieldId,
      genreId,

      productionDate: productionDate.trim(),
      size,

      tags: parsedTags,
      image: effectiveImage,
    });
  };

  return (
    <>
      {/* ✅ 스크롤이 여기서 되도록: flex:1 + minHeight:0 + overflowY:auto */}
      <div className="pc-content" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
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

          {/* ✅ Field UI 완전 제거 */}

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

            {/* ✅ Size: 가로 × 세로 입력 */}
            <div className="pc-input-group">
              <label className="pc-label">
                Size <span className="req">*</span>
              </label>

              <div className="pc-size-row">
                <input
                  className="pc-input"
                  value={sizeW}
                  onChange={(e) => setSizeW(e.target.value)}
                  placeholder="가로"
                  inputMode="numeric"
                  disabled={!!submitting}
                />
                <span className="pc-size-x">×</span>
                <input
                  className="pc-input"
                  value={sizeH}
                  onChange={(e) => setSizeH(e.target.value)}
                  placeholder="세로"
                  inputMode="numeric"
                  disabled={!!submitting}
                />
              </div>

              <div className="pc-size-hint">
                전송: {sizeW || "—"}*{sizeH || "—"}
              </div>
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

      {/* footer는 고정 영역 */}
      <div className="pc-footer" style={{ flexShrink: 0 }}>
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
