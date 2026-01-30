// FE/src/features/feed/mockData.ts
export type PostRole = "USER" | "ARTIST";

export type MockPost = {
  id: string;
  authorId: string;
  authorName: string;
  role: PostRole;

  title: string;
  content: string;

  imageUrls: string[]; // "/art/a1.jpg" 또는 "data:image/..." 가능
  tags?: string[];
  likes: number;
  views: number;

  createdAt: string;
  isDeleted?: boolean;

  meta?: Record<string, unknown>;
};

const POSTS_KEY = "comet_mock_posts_v1";
const ME_KEY = "comet_mock_me_v1";

// ✅ profile mock이 쓰는 users 키랑 맞춰서 같이 심어줌
const USERS_KEY = "comet_mock_users_v1";

type MockMe = { id: string; name: string; role: PostRole };

type StoredUser = {
  memberUuid: string;
  name: string;
  displayName?: string;
  role: "USER" | "ARTIST";
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nowISO() {
  return new Date().toISOString();
}

export function readMe(): MockMe | null {
  return safeJsonParse<MockMe | null>(localStorage.getItem(ME_KEY), null);
}

export function setMe(me: MockMe) {
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

/** ✅ LocalPost(옛 스키마) / MockPost(신 스키마) 섞여도 읽어서 MockPost로 정규화 */
function coerceToMockPost(x: any): MockPost | null {
  if (!x || typeof x !== "object") return null;

  // 이미 MockPost 형태
  if (Array.isArray(x.imageUrls)) {
    return {
      id: String(x.id ?? uid()),
      authorId: String(x.authorId ?? ""),
      authorName: String(x.authorName ?? "Unknown"),
      role: (x.role === "ARTIST" ? "ARTIST" : "USER") as PostRole,
      title: String(x.title ?? ""),
      content: String(x.content ?? ""),
      imageUrls: x.imageUrls.filter((u: any) => typeof u === "string"),
      tags: Array.isArray(x.tags) ? x.tags.filter((t: any) => typeof t === "string") : [],
      likes: typeof x.likes === "number" ? x.likes : 0,
      views: typeof x.views === "number" ? x.views : 0,
      createdAt: String(x.createdAt ?? nowISO()),
      isDeleted: Boolean(x.isDeleted),
      meta: x.meta && typeof x.meta === "object" ? x.meta : undefined,
    };
  }

  // LocalPost 형태(imageUrl 1개) -> MockPost로 변환
  const imageUrl =
    typeof x.imageUrl === "string" && x.imageUrl.trim().length > 0 ? x.imageUrl.trim() : "";

  const mode = x.mode === "ARTIST" ? "ARTIST" : x.mode === "USER" ? "USER" : null;
  const role = (x.role === "ARTIST" || x.role === "USER" ? x.role : mode) ?? "USER";

  return {
    id: String(x.id ?? uid()),
    authorId: String(x.authorId ?? ""),
    authorName: String(x.authorName ?? "Unknown"),
    role,
    title: String(x.title ?? ""),
    content: String(x.content ?? ""),
    imageUrls: imageUrl ? [imageUrl] : [],
    tags: Array.isArray(x.tags) ? x.tags.filter((t: any) => typeof t === "string") : [],
    likes: typeof x.likes === "number" ? x.likes : 0,
    views: typeof x.views === "number" ? x.views : 0,
    createdAt: String(x.createdAt ?? nowISO()),
    isDeleted: Boolean(x.isDeleted),
    meta: { migratedFrom: "LocalPost", ...(x.meta ?? {}) },
  };
}

function readAllRaw(): any[] {
  return safeJsonParse<any[]>(localStorage.getItem(POSTS_KEY), []);
}

function writeAll(list: MockPost[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(list));
}

export function listPosts(): MockPost[] {
  const raw = readAllRaw();
  const normalized = raw
    .map(coerceToMockPost)
    .filter((p): p is MockPost => !!p)
    .filter((p) => !p.isDeleted);

  // ✅ 정규화된 결과를 한 번 다시 저장해서 스키마 섞임을 정리(선택)
  // (원치 않으면 아래 2줄 삭제)
  writeAll(normalized);

  return normalized;
}

export function listPostsByAuthor(authorId: string): MockPost[] {
  return listPosts().filter((p) => p.authorId === authorId);
}

export function getPostById(postId: string): MockPost | null {
  const p = listPosts().find((x) => x.id === postId);
  return p ?? null;
}

export function bumpViews(postId: string) {
  const all = listPosts();
  const next = all.map((p) => (p.id === postId ? { ...p, views: (p.views ?? 0) + 1 } : p));
  writeAll(next);
}

export function createPost(input: Omit<MockPost, "id" | "createdAt" | "likes" | "views">) {
  const all = listPosts();
  const post: MockPost = {
    id: uid(),
    createdAt: nowISO(),
    likes: 0,
    views: 0,
    ...input,
    imageUrls: (input.imageUrls ?? []).filter(Boolean),
  };
  writeAll([post, ...all]);
  return post;
}

export function softDeletePost(postId: string) {
  const all = listPosts();
  const next = all.map((p) => (p.id === postId ? { ...p, isDeleted: true } : p));
  writeAll(next);
}

/** =========================
 * ✅ “반은 유저 / 반은 작가” 시드
 * ========================= */
const SEED_KEY = "comet_mock_posts_seeded_v2";

function seedUsersOnce() {
  const existing = safeJsonParse<StoredUser[]>(localStorage.getItem(USERS_KEY), []);

  const mk = (role: "USER" | "ARTIST", n: number): StoredUser => {
    const id = role === "USER" ? `mock-user-${String(n).padStart(4, "0")}` : `mock-artist-${String(n).padStart(4, "0")}`;
    return {
      memberUuid: id,
      name: role === "USER" ? `User ${n}` : `Artist ${n}`,
      displayName: role === "ARTIST" ? `A.${String(n).padStart(2, "0")}` : undefined,
      role,
    };
  };

  const seed: StoredUser[] = [
    ...Array.from({ length: 8 }).map((_, i) => mk("ARTIST", i + 1)),
    ...Array.from({ length: 8 }).map((_, i) => mk("USER", i + 1)),
    // ✅ me 기본값이 mock-user-0001이면 profile mock이랑도 맞음
  ];

  const byId = new Map(existing.map((u) => [u.memberUuid, u]));
  for (const u of seed) if (!byId.has(u.memberUuid)) byId.set(u.memberUuid, u);

  localStorage.setItem(USERS_KEY, JSON.stringify(Array.from(byId.values())));
}

export function ensureBaseSeedOnce(total = 60) {
  if (localStorage.getItem(SEED_KEY) === "1") return;

  seedUsersOnce();

  const existing = listPosts();
  if (existing.length >= Math.min(12, total)) {
    localStorage.setItem(SEED_KEY, "1");
    return;
  }

  const ART_IMAGES = Array.from({ length: 12 }).map((_, i) => `/art/a${i + 1}.jpg`);

  const artists = Array.from({ length: 8 }).map((_, i) => {
    const n = i + 1;
    return { id: `mock-artist-${String(n).padStart(4, "0")}`, name: `A.${String(n).padStart(2, "0")}` };
  });
  const users = Array.from({ length: 8 }).map((_, i) => {
    const n = i + 1;
    return { id: `mock-user-${String(n).padStart(4, "0")}`, name: `User ${n}` };
  });

  const seeded: MockPost[] = Array.from({ length: total }).map((_, i) => {
    const isArtist = i % 2 === 0; // ✅ 반반
    const author = isArtist ? artists[i % artists.length] : users[i % users.length];
    const img = ART_IMAGES[i % ART_IMAGES.length];
    const dayOffset = (i + 1) % 14;

    return {
      id: uid(),
      authorId: author.id,
      authorName: author.name,
      role: isArtist ? "ARTIST" : "USER",
      title: isArtist ? `Untitled #${i + 1}` : `Exhibition Review #${i + 1}`,
      content: isArtist
        ? "작품 업로드 목업 데이터입니다. (데모용)"
        : "감상평 목업 데이터입니다. (데모용)",
      imageUrls: [img],
      tags: isArtist ? ["mock", "art"] : ["mock", "review"],
      likes: Math.floor(Math.random() * 200),
      views: 100 + Math.floor(Math.random() * 5000),
      createdAt: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      meta: { seeded: true },
    };
  });

  // 기존 + seeded 합치기
  writeAll([...seeded, ...existing]);

  localStorage.setItem(SEED_KEY, "1");
}
