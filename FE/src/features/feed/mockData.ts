// FE/src/features/feed/mockData.ts
export type PostRole = "USER" | "ARTIST";

export type MockPost = {
  id: string;
  authorId: string;
  authorName: string;
  role: PostRole;

  title: string;
  content: string;

  imageUrls: string[]; // ✅ "/art/a1.jpg" 또는 "data:image/..." 가능
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

export function listPosts(): MockPost[] {
  const all = safeJsonParse<MockPost[]>(localStorage.getItem(POSTS_KEY), []);
  return all.filter((p) => !p.isDeleted);
}

export function listPostsByAuthor(authorId: string): MockPost[] {
  return listPosts().filter((p) => p.authorId === authorId);
}

export function createPost(
  input: Omit<MockPost, "id" | "createdAt" | "likes" | "views">,
) {
  const all = safeJsonParse<MockPost[]>(localStorage.getItem(POSTS_KEY), []);
  const post: MockPost = {
    id: uid(),
    createdAt: new Date().toISOString(),
    likes: 0,
    views: 0,
    ...input,
  };
  localStorage.setItem(POSTS_KEY, JSON.stringify([post, ...all]));
  return post;
}

export function softDeletePost(postId: string) {
  const all = safeJsonParse<MockPost[]>(localStorage.getItem(POSTS_KEY), []);
  const next = all.map((p) => (p.id === postId ? { ...p, isDeleted: true } : p));
  localStorage.setItem(POSTS_KEY, JSON.stringify(next));
}

export function seedMyPosts(count = 8) {
  const me = readMe();
  if (!me) throw new Error("ME 정보가 없습니다. setMe()로 먼저 세팅하세요.");

  const imgPool = Array.from({ length: 12 }).map((_, i) => `/art/a${i + 1}.jpg`);

  const all = safeJsonParse<MockPost[]>(localStorage.getItem(POSTS_KEY), []);
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
