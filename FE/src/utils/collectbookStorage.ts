import type { CollectBookItem } from "../types/collectbook";

const KEY = "arnnect_collectbook_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(): string {
  // modern browsers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function listCollectBookItems(): CollectBookItem[] {
  const items = safeParse<CollectBookItem[]>(localStorage.getItem(KEY), []);
  // 최근 스캔 순
  return [...items].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
}

export function getCollectBookItem(id: string): CollectBookItem | null {
  return listCollectBookItems().find((x) => x.id === id) ?? null;
}

export function addCollectBookItem(input: Omit<CollectBookItem, "id"> & { id?: string }): CollectBookItem {
  const items = safeParse<CollectBookItem[]>(localStorage.getItem(KEY), []);

  const item: CollectBookItem = {
    ...input,
    id: input.id ?? uid(),
  };

  // ticketCode 기준으로 중복 등록 방지(원하면 제거 가능)
  const filtered = items.filter((x) => x.ticketCode !== item.ticketCode);

  const next = [item, ...filtered];
  localStorage.setItem(KEY, JSON.stringify(next));
  return item;
}

export function clearCollectBookAll() {
  localStorage.removeItem(KEY);
}
