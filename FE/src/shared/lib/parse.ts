// FE/src/shared/lib/parse.ts
export type JsonObject = Record<string, unknown>;

export function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
export function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
export function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
export function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
export function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
  }
  return fallback;
}
export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : isObject(x) ? asString(get(x, "name"), "") : ""))
    .map((s) => s.trim())
    .filter(Boolean);
}
export function pickEnvelopeData(raw: unknown): unknown {
  // 공통 응답 봉투 { data: ... } 흡수
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

