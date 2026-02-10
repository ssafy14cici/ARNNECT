// FE/src/features/artworks/ui/ArtworkForm.tsx
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { ArtworkCreateReq } from "../model/types";
import { FIXED_FIELD_ID, GENRE_OPTIONS } from "../model/constants";

type Mode = "create" | "edit";

// ✅ edit 제출 값: image는 선택(optional)
export type ArtworkFormEditValue = Omit<ArtworkCreateReq, "image"> & {
  image?: File;
  imageUrl?: string; // ✅ 기존 이미지 미리보기용(서버 url)
};

type Props =
  | {
      mode?: "create";
      initial?: Partial<ArtworkCreateReq>;
      submitting?: boolean;
      onSubmit: (data: ArtworkCreateReq) => Promise<void> | void;
    }
  | {
      mode: "edit";
      initial?: Partial<ArtworkFormEditValue>;
      submitting?: boolean;
      onSubmit: (data: ArtworkFormEditValue) => Promise<void> | void;
    };

function splitSize(raw?: string) {
  const s = (raw ?? "").trim();
  if (!s) return { w: "", h: "" };

  const normalized = s.replace(/\s/g, "").replace("×", "*").replace(/x/gi, "*");
  const [w, h] = normalized.split("*");
  return { w: w ?? "", h: h ?? "" };
}

// ✅ 숫자만 + 최대 4자리(연도)
function sanitizeYearInput(v: string) {
  return v.replace(/\D/g, "").slice(0, 4);
}

// ✅ 서버가 productionDate(YYYY-MM-DD)를 기대하는 경우를 대비해, 연도만 입력받고 내부적으로 01-01로 보정
function yearToProductionDate(year: string) {
  const y = sanitizeYearInput(year).trim();
  if (!y) return "";
  return `${y}-01-01`;
}

// ✅ initial.productionDate가 "YYYY-MM-DD" 또는 "YYYY"로 올 수 있으니 연도만 뽑기
function dateLikeToYear(raw?: string) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  // "2024-01-01" -> "2024"
  const m = s.match(/^(\d{1,4})/);
  return m ? sanitizeYearInput(m[1]) : "";
}

export default function ArtworkForm(props: Props) {
  const mode: Mode = props.mode ?? "create";
  const initial = props.initial;
  const submitting = props.submitting;
  const onSubmit = props.onSubmit as any;

  // ✅ image는 File만 관리(새로 선택한 이미지)
  const [image, setImage] = useState<File | null>((initial as any)?.image ?? null);

  // ✅ previewUrl은 서버 url(문자열) 또는 objectURL 둘 다 가능
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const objectUrlRef = useRef<string | null>(null);

  const [tags, setTags] = useState<string>(((initial as any)?.tags ?? []).join(", "));
  const [title, setTitle] = useState((initial as any)?.title ?? "");
  const [description, setDescription] = useState((initial as any)?.description ?? "");

  // ✅ fieldId는 DB에 1개라 고정 (UI는 완전 제거)
  const fieldId = FIXED_FIELD_ID;

  // ✅ genreId: 토글 단일 선택
  const [genreId, setGenreId] = useState<number>((initial as any)?.genreId ?? 1);

  // ✅ 연도만 입력(최대 4자리) — 기존 productionDate(type="date") 제거
  // initial.productionDate가 "YYYY-MM-DD"여도 연도만 추출해서 넣음
  const [productionYear, setProductionYear] = useState<string>(dateLikeToYear((initial as any)?.productionDate));

  // ✅ size: 가로/세로 입력 → 전송 시 "w*h"
  const initSize = useMemo(() => splitSize((initial as any)?.size), [(initial as any)?.size]);
  const [sizeW, setSizeW] = useState(initSize.w);
  const [sizeH, setSizeH] = useState(initSize.h);

  const parsedTags = useMemo(
    () => tags.split(",").map((t) => t.trim()).filter(Boolean),
    [tags],
  );

  // ✅ 최초 마운트 시: (1) initial.imageUrl 있으면 그대로 미리보기
  //               (2) initial.image(File) 있으면 objectURL 만들어 미리보기
  useEffect(() => {
    // 1) 서버 이미지 url
    const initialImageUrl = String((initial as any)?.imageUrl ?? "").trim();
    if (initialImageUrl) {
      setPreviewUrl(initialImageUrl);
      return;
    }

    // 2) File로 들어온 초기 이미지(거의 create에서만)
    if (image) {
      const url = URL.createObjectURL(image);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 1회만

  // unmount 시 objectURL만 revoke
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    };
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이전 objectURL 정리
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setImage(file);

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  };

  const validate = () => {
    if (mode === "create" && !image) return "이미지를 선택해주세요.";
    if (!title.trim()) return "작품 제목을 입력해주세요.";
    if (!genreId) return "장르를 선택해주세요.";
    if (parsedTags.length === 0) return "태그를 1개 이상 입력해주세요.";


    // ✅ 연도만 필수(숫자만, 최대 4자리)
    const y = productionYear.trim();
    if (!y) return "제작 연도를 입력해주세요.";
    if (!/^\d{1,4}$/.test(y)) return "제작 연도는 숫자만, 최대 4자리까지 입력해주세요.";

    if (!sizeW.trim() || !sizeH.trim()) return "사이즈(가로/세로)를 입력해주세요.";
    if (Number.isNaN(Number(sizeW)) || Number.isNaN(Number(sizeH))) return "사이즈는 숫자만 입력해주세요.";

    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return alert(err);

    const size = `${sizeW.trim()}*${sizeH.trim()}`;

    // ✅ 연도 입력 -> 서버 전송용 productionDate로 보정(YYYY-01-01)
    const productionDate = yearToProductionDate(productionYear.trim());

    // ✅ create는 image 필수
    if (mode === "create") {
      if (!image) return alert("이미지를 선택해주세요.");

      const req: ArtworkCreateReq = {
        title: title.trim(),
        description: description.trim() || undefined,
        fieldId,
        genreId,
        productionDate, // ✅ 연도만 입력받고 내부적으로 YYYY-01-01로 전송
        size,
        tags: parsedTags,
        image,
      };

      await onSubmit(req);
      return;
    }

    // ✅ edit는 image 선택(optional)
    const req: ArtworkFormEditValue = {
      title: title.trim(),
      description: description.trim() || undefined,
      fieldId,
      genreId,
      productionDate, // ✅ 연도만 입력받고 내부적으로 YYYY-01-01로 전송
      size,
      tags: parsedTags,
      image: image ?? undefined,
      imageUrl: String((initial as any)?.imageUrl ?? "").trim() || undefined,
    };

    await onSubmit(req);
  };

  return (
    <>
      <div className="pc-content" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div className="pc-upload-section">
          <label className="pc-upload-box">
            <input type="file" accept="image/*" onChange={handleImageChange} hidden disabled={!!submitting} />

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
                Production Year <span className="req">*</span>
              </label>
              <input
                className="pc-input"
                value={productionYear}
                onChange={(e) => setProductionYear(sanitizeYearInput(e.target.value))}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={4}
                placeholder="예: 2026"
                disabled={!!submitting}
              />
              <div className="pc-size-hint">숫자만 입력 가능 (최대 4자리)</div>
            </div>

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

      <div className="pc-footer" style={{ flexShrink: 0 }}>
        <button className="pc-submit-btn" onClick={submit} disabled={!!submitting} type="button">
          {submitting ? "Uploading..." : mode === "edit" ? "Save Changes" : "Publish Artwork"}
        </button>
      </div>
    </>
  );
}
