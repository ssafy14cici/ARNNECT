// FE/src/features/artworks/model/mappers.ts
import type { ArtworkCreateReq } from "./types";

// FE/src/features/artworks/model/mappers.ts
import type { ArtworkUpdateReq } from "./types";
type JsonRecord = Record<string, unknown>;

export function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 서버 envelope({data}/{result}) 대응 */
export function unwrapEnvelope<T>(raw: unknown): T {
  if (!isRecord(raw)) return raw as T;
  if ("data" in raw) return (raw as any).data as T;
  if ("result" in raw) return (raw as any).result as T;
  return raw as T;
}


export function toArtworkCreateFormData(data: ArtworkCreateReq): FormData {
  const fd = new FormData();

  fd.append("title", data.title);
  fd.append("description", data.description ?? "");

  // ✅ BE 필드명/타입
  fd.append("fieldId", String(data.fieldId));
  fd.append("genreId", String(data.genreId));

  if (data.productionDate) fd.append("productionDate", data.productionDate);
  if (data.size) fd.append("size", data.size);

  appendTags(fd, data.tags);

  // ✅ MultipartFile image
  fd.append("image", data.image);

  return fd;
}

/* ---------------- (기존 artwork/helpers.ts 에서 유용한 것들) ---------------- */
export function normalizeArtworkId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^artwork-/, "").replace(/^review-/, "");
}

export function toArtworkNumericId(id: unknown): number | null {
  const normalizedRaw = normalizeArtworkId(id);

  if (typeof id === "number" && Number.isFinite(id)) return id;

  const s = normalizedRaw;
  if (!s) return null;

  const normalized = s.startsWith("a") ? s.slice(1) : s;
  const n = parseInt(normalized, 10);
  if (Number.isNaN(n)) return null;

  if (n >= 1000) return n - 999;

  return n;
}



function appendTags(fd: FormData, tags?: string[]) {
  // ✅ tags가 비었어도 "tags" 키를 보내고 싶다면
  if (!tags || tags.length === 0) {
    fd.append("tags", ""); // 서버로 tags 키 전송
    return;
  }
  tags.forEach((t) => fd.append("tags", t));
}


export function toArtworkUpdateFormData(data: ArtworkUpdateReq): FormData {
  const fd = new FormData();

  fd.append("title", data.title);
  fd.append("description", data.description);

  fd.append("fieldId", String(data.fieldId));
  if (typeof data.genreId === "number") fd.append("genreId", String(data.genreId));

  fd.append("productionDate", data.productionDate);
  fd.append("size", data.size);

  if (data.tags?.length) appendTags(fd, data.tags);

  // ✅ 새 이미지 선택했을 때만 보냄(안 보내면 null로 들어가서 기존 이미지 유지 처리 가능해야 함)
  if (data.image) fd.append("image", data.image);

  return fd;
}
