import type { ArtworkCreateReq } from "./types";

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

function appendTags(fd: FormData, tags: string[]) {
  tags.forEach((t) => fd.append("tags", t));
}

export function toArtworkCreateFormData(data: ArtworkCreateReq): FormData {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("description", data.description ?? "");
  fd.append("field", data.field);
  fd.append("genre", data.genre);
  fd.append("productionDate", String(data.productionDate));
  fd.append("size", data.size ?? "");
  appendTags(fd, data.tags ?? []);
  fd.append("image", data.imageFile);
  return fd;
}

/* ---------------- (기존 artwork/helpers.ts 에서 유용한 것들) ---------------- */

/** URL/피드에서 넘어오는 id를 작품 id 규칙으로 정규화 */
export function normalizeArtworkId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^artwork-/, "").replace(/^review-/, "");
}

/** "a12" / "12" / 12 / "artwork-a12" → 12 로 통일 */
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
