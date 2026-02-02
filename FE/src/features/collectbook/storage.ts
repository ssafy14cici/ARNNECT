// FE/src/features/collectbook/storage.ts
import type { CollectBookItem, ExhibitionLite, Visibility } from "./types";

const KEY = "arnnect_collectbook_v1";
const DEFAULT_OWNER = "mock-user-0001";

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

type StoredCollectBookItem = Partial<CollectBookItem> & { ownerUuid?: string };

function asStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function normalizeExhibition(v: unknown): ExhibitionLite {
  const o = (v && typeof v === "object" ? (v as Record<string, unknown>) : {}) as Record<string, unknown>;
  return {
    title: asStr(o.title),
    place: asStr(o.place),
    startDate: asStr(o.startDate),
    endDate: asStr(o.endDate),
    posterUrl: asStr(o.posterUrl),
    description: asStr(o.description),
  };
}

function normalizeVisibility(v: unknown): Visibility {
  return v === "public" ? "public" : "private";
}

export function loadAll(): CollectBookItem[] {
  const list = safeParse<unknown[]>(localStorage.getItem(KEY), []);

  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => {
      const it = x as StoredCollectBookItem;

      return {
        id: asStr(it.id) ?? uuid(),
        ownerUuid: asStr(it.ownerUuid) ?? DEFAULT_OWNER,
        ticketCode: asStr(it.ticketCode) ?? "",
        exhibition: normalizeExhibition(it.exhibition),
        memo: asStr(it.memo),
        visitedAt: asStr(it.visitedAt) ?? new Date().toISOString().slice(0, 10),
        visibility: normalizeVisibility(it.visibility),
        scannedAt: asStr(it.scannedAt) ?? new Date().toISOString(),
      };
    });
}

function saveAll(items: CollectBookItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getCollectBookItems(): CollectBookItem[] {
  return loadAll().sort((a, b) => (b.scannedAt || "").localeCompare(a.scannedAt || ""));
}

export function removeCollectBookItem(id: string) {
  saveAll(loadAll().filter((it) => it.id !== id));
}

export function addCollectBookItem(input: Omit<CollectBookItem, "id">) {
  const items = loadAll();

  const idx = items.findIndex(
    (it) =>
      it.ownerUuid === input.ownerUuid &&
      it.ticketCode === input.ticketCode &&
      it.visitedAt === input.visitedAt,
  );

  if (idx >= 0) {
    const updated: CollectBookItem = {
      ...items[idx],
      ...input,
      id: items[idx].id,
      scannedAt: input.scannedAt || items[idx].scannedAt,
    };
    items[idx] = updated;
    saveAll(items);
    return updated;
  }

  const item: CollectBookItem = { id: uuid(), ...input };
  items.push(item);
  saveAll(items);
  return item;
}

export function getCollectBookItemById(id: string) {
  return getCollectBookItems().find((it) => it.id === id) ?? null;
}

export const getCollectBookItem = getCollectBookItemById;
