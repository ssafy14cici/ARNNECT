// FE/src/features/collectbook/storage.ts
import type { CollectBookItem } from "./types";


const KEY = "arnnect_collectbook_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function loadAll(): CollectBookItem[] {
  return safeParse<CollectBookItem[]>(localStorage.getItem(KEY), []);
}

function saveAll(items: CollectBookItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

// ✅ 최근 스캔 순 목록
export function getCollectBookItems(): CollectBookItem[] {
  const items = loadAll();
  return items.sort((a, b) => (b.scannedAt || "").localeCompare(a.scannedAt || ""));
}


export function removeCollectBookItem(id: string) {
  const items = loadAll().filter((it) => it.id !== id);
  saveAll(items);
}

export function addCollectBookItem(input: Omit<CollectBookItem, "id">) {
  const items = loadAll();

  // ✅ 같은 ticketCode + visitedAt 조합은 1개만
  const idx = items.findIndex(
    (it) => it.ticketCode === input.ticketCode && it.visitedAt === input.visitedAt
  );

  if (idx >= 0) {
    // 이미 있으면: 기존 항목 갱신(중복 방지)
    const updated: CollectBookItem = {
      ...items[idx],
      ...input,
      id: items[idx].id, // id 유지
      // scannedAt은 "최신 스캔 시간으로 갱신"하고 싶으면 아래처럼
      scannedAt: input.scannedAt || items[idx].scannedAt,
    };
    items[idx] = updated;
    saveAll(items);
    return updated;
  }

  // 없으면 새로 추가
  const item: CollectBookItem = { id: uuid(), ...input };
  items.push(item);
  saveAll(items);
  return item;
}

// ✅ 상세 1건 조회
export function getCollectBookItemById(id: string) {
  const items = getCollectBookItems();
  return items.find((it) => it.id === id) ?? null;
}

// ✅ (옵션) 예전 이름을 쓰고 있었다면 alias로도 제공
export const getCollectBookItem = getCollectBookItemById;
