// FE/src/pages/artworks/ArtworkEdit.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { http } from "../../shared/api/http";
import ArtworkForm, { type ArtworkFormEditValue } from "../../features/artworks/ui/ArtworkForm";
import { updateArtwork, deleteArtwork } from "../../features/artworks/api";
import { FIXED_FIELD_ID } from "../../features/artworks/model/constants";
import type { ArtworkUpdateReq } from "../../features/artworks/model/types";

// ✅ DEV 프록시 + /src prefix 보정 + PROD origin 붙이기
import { resolveMediaUrl } from "./detail/utils";

// ------------------- safe parsers -------------------
type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => asString(x, "")).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

// axios 응답 / wrapper 응답 모두 대응
function unwrapAxiosData(res: unknown): unknown {
  return isObject(res) && "data" in res ? (res as any).data : res;
}

// { data: ... } Envelope면 data만 꺼내기
function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

// ------------------- Types -------------------
type Detail = {
  title?: string;
  description?: string;
  genreId?: number;
  productionDate?: string; // "YYYY-MM-DD"
  size?: string;
  tags?: string[];
  imageUrl?: string; // ✅ 기존 이미지 미리보기(정규화된 URL)
};

function mapArtworkDetail(raw: unknown): Detail | null {
  const body = pickEnvelopeData(raw);
  if (!isObject(body)) return null;

  const title = asString(get(body, "title"), "");
  const description =
    asString(get(body, "description"), "") ||
    asString(get(body, "content"), "") ||
    asString(get(body, "intro"), "");

  const genreId = asNumber(get(body, "genreId"), asNumber(get(body, "genre_id"), 1));

  const productionDate =
    asString(get(body, "productionDate"), "") ||
    asString(get(body, "production_date"), "") ||
    asString(get(body, "date"), "");

  const size = asString(get(body, "size"), "");
  const tags = asStringArray(get(body, "tags"));

  const imageUrlRaw =
    asString(get(body, "imageUrl"), "") ||
    asString(get(body, "thumbnailUrl"), "") ||
    asString(get(body, "thumbnail"), "") ||
    asString(get(body, "src"), "") ||
    asString(get(body, "image"), "");

  const imageUrl = imageUrlRaw ? resolveMediaUrl(imageUrlRaw) : "";

  return {
    title,
    description,
    genreId,
    productionDate,
    size,
    tags,
    imageUrl,
  };
}

export default function ArtworkEdit() {
  const nav = useNavigate();
  const { artworkId = "" } = useParams<{ artworkId: string }>();

  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const normalizedId = useMemo(() => String(artworkId).trim(), [artworkId]);

  // ✅ initial이 비동기로 들어오는 구조에서 ArtworkForm이 props 변경을 반영 못하면
  // 한 번 remount 시켜서 확실히 프리필되게(loading -> ready 전환 1회)
  const formKey = useMemo(() => {
    return initial ? `artwork-edit-${normalizedId}-ready` : `artwork-edit-${normalizedId}-loading`;
  }, [initial, normalizedId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!normalizedId) return;

      setLoading(true);
      setLoadError(null);
      setInitial(null);

      try {
        const res = await http.get(`/api/v1/artworks/${encodeURIComponent(normalizedId)}`);
        const payload = unwrapAxiosData(res);
        const mapped = mapArtworkDetail(payload);

        if (cancelled) return;

        if (!mapped) {
          setInitial(null);
          setLoadError("작품 상세 응답을 해석하지 못했습니다.");
          return;
        }

        setInitial(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setInitial(null);
          setLoadError(e instanceof Error ? e.message : "작품 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedId]);

  const onSave = async (form: ArtworkFormEditValue) => {
    if (!normalizedId) return;

    // ✅ ArtworkUpdateReq는 string 필수인데, form 값은 string|undefined일 수 있으니 ""로 보정
    const req: ArtworkUpdateReq = {
      title: form.title ?? "",
      description: form.description ?? "",
      fieldId: FIXED_FIELD_ID,
      genreId: form.genreId ?? 1,
      productionDate: form.productionDate ?? "",
      size: form.size ?? "",
      tags: form.tags ?? [],
      image: form.image ?? undefined, // ✅ 선택(optional)
    };

    setLoading(true);
    try {
      await updateArtwork(normalizedId, req);
      alert("수정되었습니다.");
      nav(-1);
    } catch (e) {
      console.error(e);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!normalizedId) return;
    if (!window.confirm("삭제하시겠습니까?")) return;

    setLoading(true);
    try {
      await deleteArtwork(normalizedId);
      alert("삭제되었습니다.");
      nav(-1);
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // -------- UI states --------
  if (!normalizedId) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>Artwork Edit</h2>
        <p style={{ marginTop: 12 }}>artworkId가 없습니다.</p>
        <button type="button" onClick={() => nav(-1)} style={{ marginTop: 16 }}>
          뒤로
        </button>
      </div>
    );
  }

  if (!initial && !loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>Artwork Edit</h2>
        <p style={{ marginTop: 12 }}>{loadError ?? "작품 정보를 불러오지 못했습니다."}</p>
        <button type="button" onClick={() => nav(-1)} style={{ marginTop: 16 }}>
          뒤로
        </button>
      </div>
    );
  }

  return (
    <div className="post-create-page theme-artist">
      <div className="pc-container">
        <header className="pc-header" style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 className="pc-title">Edit Artwork</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onDelete} disabled={loading}>
              삭제
            </button>
            <button type="button" onClick={() => nav(-1)} disabled={loading}>
              닫기
            </button>
          </div>
        </header>

        {/* ✅ edit 모드 + initial 프리필 + key로 1회 강제 remount */}
        <ArtworkForm
          key={formKey}
          mode="edit"
          submitting={loading}
          onSubmit={onSave}
          initial={initial ?? undefined}
        />

        {/* 디버깅용(필요 없으면 삭제) */}
        {/* <pre style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>{JSON.stringify(initial, null, 2)}</pre> */}
      </div>
    </div>
  );
}
