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

type MockMe = { id: string; name: string; role: PostRole };

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

export function readMe(): MockMe | null {
  return safeJsonParse<MockMe | null>(localStorage.getItem(ME_KEY), null);
}

export function setMe(me: MockMe) {
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

/** ✅ LocalPost( imageUrl, mode ) / MockPost( imageUrls, role ) 섞여도 MockPost로 통일 */
function coerceToMockPost(x: any): MockPost | null {
  if (!x || typeof x !== "object") return null;

  // 이미 MockPost
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
      createdAt: String(x.createdAt ?? new Date().toISOString()),
      isDeleted: Boolean(x.isDeleted),
      meta: x.meta && typeof x.meta === "object" ? x.meta : undefined,
    };
  }

  // LocalPost -> MockPost 변환
  const imageUrl =
    typeof x.imageUrl === "string" && x.imageUrl.trim().length > 0 ? x.imageUrl.trim() : "";

  const role = (x.mode === "ARTIST" ? "ARTIST" : "USER") as PostRole;

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
    createdAt: String(x.createdAt ?? new Date().toISOString()),
    isDeleted: Boolean(x.isDeleted),
    meta: { migratedFrom: "LocalPost", ...(x.meta ?? {}) },
  };
}

export function listPosts(): MockPost[] {
  const raw = safeJsonParse<any[]>(localStorage.getItem(POSTS_KEY), []);
  const normalized = raw
    .map(coerceToMockPost)
    .filter((p): p is MockPost => !!p)
    .filter((p) => !p.isDeleted)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  // ✅ 한 번 정규화된 형태로 저장해서 이후 꼬임 방지(선택이지만 추천)
  localStorage.setItem(POSTS_KEY, JSON.stringify(normalized));

  return normalized;
}

export function listPostsByAuthor(authorId: string) {
  return listPosts().filter((p) => p.authorId === authorId);
}

export function getPostById(id: string): MockPost | null {
  return listPosts().find((p) => p.id === id) ?? null;
}

export function bumpViews(id: string) {
  const all = listPosts();
  const next = all.map((p) => (p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p));
  localStorage.setItem(POSTS_KEY, JSON.stringify(next));
}

export function createPost(input: Omit<MockPost, "id" | "createdAt" | "likes" | "views">) {
  const all = listPosts();
  const post: MockPost = {
    id: uid(),
    createdAt: new Date().toISOString(),
    likes: 0,
    views: 0,
    ...input,
    imageUrls: (input.imageUrls ?? []).filter(Boolean),
  };
  localStorage.setItem(POSTS_KEY, JSON.stringify([post, ...all]));
  return post;
}

export function softDeletePost(postId: string) {
  const all = listPosts();
  const next = all.map((p) => (p.id === postId ? { ...p, isDeleted: true } : p));
  localStorage.setItem(POSTS_KEY, JSON.stringify(next));
}

/** ✅ 로그인 유저용 더미 (기존 유지: Login.tsx에서 쓰고 있으면 에러 안 나게) */
export function seedMyPosts(count = 8) {
  const me = readMe();
  if (!me) throw new Error("ME 정보가 없습니다. setMe()로 먼저 세팅하세요.");

  const imgPool = Array.from({ length: 12 }).map((_, i) => `/art/a${i + 1}.jpg`);

  const all = listPosts();
  const seeded: MockPost[] = Array.from({ length: count }).map((_, idx) => {
    const img = imgPool[(idx + all.length) % imgPool.length];
    const dayOffset = (idx + 1) * 2;

    return {
      id: uid(),
      authorId: me.id,
      authorName: me.name,
      role: me.role,
      title: `My Log #${all.length + idx + 1}`,
      content: "목업 글입니다. 나중에 글쓰기 API로 교체하세요.",
      imageUrls: [img],
      tags: ["mock"],
      likes: Math.floor(Math.random() * 200),
      views: 200 + Math.floor(Math.random() * 5000),
      createdAt: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      meta: { seeded: true },
    };
  });

  localStorage.setItem(POSTS_KEY, JSON.stringify([...seeded, ...all]));
  return seeded;
}


const ARTWORKS_DATA = [
  { id: "a1", src: "/art/a1.jpg", title: "Nocturne Study", artistName: "A. Kim", likes: 128, views: 1420, createdAt: "2026-01-22T09:00:00.000Z" },
  { id: "a2", src: "/art/a2.jpg", title: "Ceramic Form #12", artistName: "S. Lee", likes: 76, views: 980, createdAt: "2026-01-21T15:40:00.000Z" },
  { id: "a3", src: "/art/a3.jpg", title: "Portrait Light", artistName: "J. Park", likes: 214, views: 2510, createdAt: "2026-01-20T12:05:00.000Z" },
  { id: "a4", src: "/art/a4.jpg", title: "Study of Blue", artistName: "H. Moon", likes: 55, views: 610, createdAt: "2026-01-19T10:20:00.000Z" },
  { id: "a5", src: "/art/a5.jpg", title: "Ink Texture", artistName: "A. Kim", likes: 92, views: 880, createdAt: "2026-01-18T08:30:00.000Z" },
  { id: "a6", src: "/art/a6.jpg", title: "Street Snapshot", artistName: "S. Lee", likes: 160, views: 1990, createdAt: "2026-01-17T14:15:00.000Z" },
  { id: "a7", src: "/art/a7.jpg", title: "Warm Craft", artistName: "J. Park", likes: 44, views: 530, createdAt: "2026-01-16T09:10:00.000Z" },
  { id: "a8", src: "/art/a8.jpg", title: "Minimal Lines", artistName: "H. Moon", likes: 301, views: 4200, createdAt: "2026-01-15T11:45:00.000Z" },
  { id: "a9", src: "/art/a9.jpg", title: "Evening Glow", artistName: "A. Kim", likes: 87, views: 940, createdAt: "2026-01-14T18:05:00.000Z" },
  { id: "a10", src: "/art/a10.jpg", title: "Form & Shadow", artistName: "S. Lee", likes: 66, views: 720, createdAt: "2026-01-13T16:30:00.000Z" },
  { id: "a11", src: "/art/a11.jpg", title: "Quiet Scene", artistName: "J. Park", likes: 145, views: 1650, createdAt: "2026-01-12T10:00:00.000Z" },
  { id: "a12", src: "/art/a12.jpg", title: "Color Draft", artistName: "H. Moon", likes: 33, views: 410, createdAt: "2026-01-11T09:25:00.000Z" },
];

/** ✅ 수정된 초기 시드 함수 */
export function ensureBaseSeedOnce() {
  const BASE_SEED_KEY = "comet_mock_posts_seeded_v2"; // 버전을 올려서 새로 세팅되게 함
  if (localStorage.getItem(BASE_SEED_KEY) === "1") return;

  // artworks 데이터를 MockPost 형식으로 변환
  const seeded: MockPost[] = ARTWORKS_DATA.map((art) => ({
    id: art.id,
    authorId: `artist-${art.artistName.replace(/\s+/g, "").toLowerCase()}`,
    authorName: art.artistName,
    role: "ARTIST", // artworks 데이터는 모두 작가이므로 ARTIST로 설정
    title: art.title,
    content: `${art.artistName} 작가의 작품 ${art.title}입니다.`,
    imageUrls: [art.src],
    tags: ["artwork", "gallery"],
    likes: art.likes,
    views: art.views,
    createdAt: art.createdAt,
    meta: { seeded: true, size: "original" },
  }));

  localStorage.setItem("comet_mock_posts_v1", JSON.stringify(seeded));
  localStorage.setItem(BASE_SEED_KEY, "1");
}
