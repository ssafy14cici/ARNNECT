// FE/src/api/mockPosts.ts
export type PostRole = "USER" | "ARTIST";

export type MockPost = {
  id: string;
  authorId: string;      // 로그인 유저 식별자(추천: member_uuid or email)
  authorName: string;
  role: PostRole;

  title: string;
  content: string;

  imageUrls: string[];   // /public 경로 사용: "/art/a1.jpg"
  likes: number;
  views: number;

  createdAt: string;     // ISO
  isDeleted?: boolean;
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

/** 콘솔/테스트용: "현재 로그인 유저"를 로컬에 강제로 박아두기 */
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

export function createPost(input: Omit<MockPost, "id" | "createdAt" | "likes" | "views">) {
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

/** 테스트용: 내 글 더미 n개 생성 */
export function seedMyPosts(count = 8) {
  const me = readMe();
  if (!me) throw new Error("ME 정보가 없습니다. setMe()로 먼저 세팅하세요.");

  const imgPool = Array.from({ length: 12 }).map((_, i) => `/art/b${i + 1}.jpg`);

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
      likes: Math.floor(Math.random() * 200),
      views: 200 + Math.floor(Math.random() * 5000),
      createdAt: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  localStorage.setItem(POSTS_KEY, JSON.stringify([...seeded, ...all]));
  return seeded;
}
