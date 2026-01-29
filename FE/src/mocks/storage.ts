// src/mocks/storage.ts
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function lsGet<T>(key: string, fallback: T): T {
  return safeParse<T>(localStorage.getItem(key), fallback);
}

export function lsSet<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${(crypto as any).randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
