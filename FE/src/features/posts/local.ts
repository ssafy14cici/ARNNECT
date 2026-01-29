// FE/src/features/posts/local.ts
export type LocalMode = "ARTIST" | "USER";

export type LocalPost = {
  id: string;
  mode: LocalMode;

  authorId: string;       // ✅ memberUuid 사용
  authorName: string;

  title: string;
  content: string;

  imageUrl?: string;      // ✅ dataURL 또는 "/art/a1.jpg" 같은 public path
  createdAt: string;

  meta?: Record<string, unknown>;
  isDeleted?: boolean;
};

const POSTS_KEY = "comet_mock_posts_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(prefix = "post") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readAll(): LocalPost[] {
  const all = safeParse<LocalPost[]>(localStorage.getItem(POSTS_KEY), []);
  return all.filter((p) => !p.isDeleted);
}

function writeAll(posts: LocalPost[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

// -------------------------
// pub-sub
// -------------------------
type Unsub = () => void;
const subs = new Set<() => void>();

function emitPostsUpdated() {
  subs.forEach((fn) => fn());
}

export function subscribePostsUpdated(cb: () => void): Unsub {
  subs.add(cb);
  return () => subs.delete(cb);
}

// -------------------------
// read APIs
// -------------------------
export function listPosts(mode?: LocalMode): LocalPost[] {
  const all = readAll();
  const filtered = mode ? all.filter((p) => p.mode === mode) : all;
  return filtered.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export function listPostsByAuthor(authorId: string, mode?: LocalMode): LocalPost[] {
  if (!authorId) return [];
  const all = readAll();
  return all
    .filter((p) => p.authorId === authorId)
    .filter((p) => (mode ? p.mode === mode : true))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

// -------------------------
// write APIs
// -------------------------
export function createPost(input: Omit<LocalPost, "id" | "createdAt">): LocalPost {
  if (!input.authorId) throw new Error("authorId is required");
  if (!input.authorName) throw new Error("authorName is required");
  if (!input.title?.trim()) throw new Error("title is required");

  const next: LocalPost = {
    id: uid("post"),
    createdAt: new Date().toISOString(),
    ...input,
    title: input.title.trim(),
    content: input.content?.trim() ?? "",
  };

  const all = safeParse<LocalPost[]>(localStorage.getItem(POSTS_KEY), []);
  writeAll([next, ...all]);
  emitPostsUpdated();
  return next;
}

export function softDeletePost(id: string) {
  const all = safeParse<LocalPost[]>(localStorage.getItem(POSTS_KEY), []);
  const next = all.map((p) => (p.id === id ? { ...p, isDeleted: true } : p));
  writeAll(next);
  emitPostsUpdated();
}

// -------------------------
// file -> dataURL (local image 저장)
// -------------------------
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("File read failed"));
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

// -------------------------
// seed (내 피드 비었을 때만 자동 생성 옵션)
// -------------------------
const SEED_PREFIX = "comet_mock_seed_author_v1";

const ART_IMAGES = Array.from({ length: 12 }).map((_, i) => `/art/a${i + 1}.jpg`);

export function ensureSeedForAuthor(params: {
  authorId: string;
  authorName: string;
  mode: LocalMode;
  count?: number;
}) {
  const { authorId, authorName, mode, count = 6 } = params;
  const key = `${SEED_PREFIX}.${authorId}.${mode}`;
  if (localStorage.getItem(key) === "1") return;

  const mine = listPostsByAuthor(authorId, mode);
  if (mine.length > 0) {
    localStorage.setItem(key, "1");
    return;
  }

  for (let i = 0; i < count; i++) {
    createPost({
      mode,
      authorId,
      authorName,
      title: mode === "ARTIST" ? `My Artwork #${i + 1}` : `My Review #${i + 1}`,
      content: "목업 자동 생성 포스트입니다. (나중에 작성글로 교체)",
      imageUrl: ART_IMAGES[i % ART_IMAGES.length],
      meta: {},
    });
  }

  localStorage.setItem(key, "1");
}
