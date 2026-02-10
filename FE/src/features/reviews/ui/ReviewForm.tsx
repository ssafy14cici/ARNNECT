// FE/src/features/reviews/ui/ReviewForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewCreateReq } from "../model/types";

type Props = {
  initial?: Partial<ReviewCreateReq>;
  submitting?: boolean;
  onSubmit: (data: ReviewCreateReq) => Promise<void> | void;
};

// ✅ public/review_basic/... 에 두면 접근 경로는 BASE_URL + review_basic/... 로 만드는 게 안전함
const DEFAULT_IMAGES = [
  "review_basic/basic_1.png",
  "review_basic/basic_2.jpg",
  "review_basic/basic_3.jpg",
  "review_basic/basic_4.jpg",
] as const;

function publicAssetUrl(path: string) {
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

// ✅ URL(기본 이미지)을 File로 변환해서 서버에 업로드 가능하게
async function urlToFile(url: string): Promise<File> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch default image: ${url} (${res.status})`);
  const blob = await res.blob();

  const filename = url.split("/").pop()?.split("?")[0] || "default.jpg";
  const mime = blob.type && blob.type.length > 0 ? blob.type : "image/jpeg";
  return new File([blob], filename, { type: mime });
}

export default function ReviewForm({ initial, submitting, onSubmit }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(initial?.imageFile ?? null);

  // ✅ 이 폼 인스턴스에서 사용할 기본이미지 1개를 고정(렌더마다 바뀌지 않게)
  const defaultUrlRef = useRef(publicAssetUrl(DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)]));

  // ✅ 기본이미지 File도 한 번만 만들고 캐시(등록 버튼 여러번 눌러도 fetch 반복 방지)
  const defaultFileRef = useRef<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string>(defaultUrlRef.current);

  // ✅ tags는 필수니까 UX상 빈 문자열로 시작하면 사용자가 입력하도록 유도됨
  const [tags, setTags] = useState<string>((initial?.tags ?? []).join(", "));
  const [reviewTitle, setReviewTitle] = useState(initial?.title ?? "");
  const [reviewText, setReviewText] = useState(initial?.content ?? "");

  // ✅ artworkId는 선택이므로 기본값 "" 유지
  const [artworkId, setArtworkId] = useState(
    typeof initial?.artworkId === "number" ? String(initial.artworkId) : "",
  );

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tags],
  );

  // ✅ blob URL 정리용 (stale previewUrl 문제 방지)
  const blobUrlRef = useRef<string | null>(null);

  // ✅ 미리보기: 파일 있으면 blob URL, 없으면 기본 이미지 URL
  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(defaultUrlRef.current);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [imageFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
  };

  const validate = () => {
    if (!reviewTitle.trim()) return "제목을 입력해주세요.";
    if (!reviewText.trim()) return "내용을 입력해주세요.";

    // ✅ tags 필수
    if (parsedTags.length === 0) return "태그를 1개 이상 입력해주세요.";

    // ✅ artworkId 선택: 입력한 경우에만 숫자 검증 + 1 이상
    if (artworkId.trim()) {
      const n = Number(artworkId);
      if (!Number.isFinite(n)) return "작품 ID는 숫자여야 합니다.";
      if (n < 1) return "작품 ID는 1 이상의 숫자여야 합니다.";
    }

    return null;
  };

  const ensureDefaultFile = async () => {
    if (defaultFileRef.current) return defaultFileRef.current;
    const f = await urlToFile(defaultUrlRef.current);
    defaultFileRef.current = f;
    return f;
  };

  const submit = async () => {
    if (submitting) return;
    const err = validate();
    if (err) return alert(err);

    // ✅ 파일 없으면 기본 이미지 File을 만들어서 같이 보냄(백엔드가 이미지 필수일 때)
    let finalImageFile = imageFile;
    if (!finalImageFile) {
      try {
        finalImageFile = await ensureDefaultFile();
      } catch (error) {
        console.error("[ReviewForm] Failed to load default image:", error);
        console.error("[ReviewForm] defaultUrlRef.current =", defaultUrlRef.current);
        return alert("기본 이미지를 불러오는데 실패했습니다.");
      }
    }

    // ✅ artworkId 선택: 값이 있을 때만 payload에 포함 (1 이상만)
    const trimmedArtworkId = artworkId.trim();
    const payload: ReviewCreateReq = {
      title: reviewTitle.trim(),
      content: reviewText.trim(),
      tags: parsedTags,
      imageFile: finalImageFile,
      ...(trimmedArtworkId ? { artworkId: Math.max(1, Number(trimmedArtworkId)) } : {}),
    };

    await onSubmit(payload);
  };

  // ✅ Artwork ID 입력값: 1 미만은 입력 단계에서 차단
  const onChangeArtworkId = (v: string) => {
    // 빈 값은 허용(선택 항목이므로)
    if (!v) {
      setArtworkId("");
      return;
    }

    // 숫자 외 입력 방지 (type="number"여도 브라우저별 예외가 있어서 방어)
    const n = Number(v);
    if (!Number.isFinite(n)) return;

    // 1 미만은 반영하지 않음 (아예 내려가지 않게)
    if (n < 1) {
      setArtworkId("1");
      return;
    }

    setArtworkId(String(Math.trunc(n)));
  };

  return (
    <>
      <div className="pc-content">
        <div className="pc-upload-section">
          <label className="pc-upload-box">
            <input type="file" accept="image/*" onChange={handleImageChange} hidden disabled={!!submitting} />

            {/* ✅ 기본이미지도 미리보기로 항상 보이게 */}
            <img
              src={previewUrl}
              alt="Preview"
              className="pc-preview-img"
              onError={(e) => {
                e.currentTarget.src = defaultUrlRef.current;
              }}
            />
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

          {/* ✅ Artwork ID: 선택 항목 + 1부터 시작(1 미만 내려가지 않게) */}
          <div className="pc-input-group">
            <label className="pc-label">Artwork ID</label>
            <input
              className="pc-input"
              value={artworkId}
              onChange={(e) => onChangeArtworkId(e.target.value)}
              placeholder="(Optional) Target Artwork ID"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
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

          {/* ✅ Tags: 필수 */}
          <div className="pc-input-group">
            <label className="pc-label">
              Tags <span className="req">*</span>
            </label>
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
