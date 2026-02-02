import type { ArtworkCreateReq, ReviewCreateReq, PostRole, MockPost } from "../types";

const POSTS_KEY = "arnnect_mock_posts_v1"; // ✅ 기존 comet_mock_posts_v1 사용 금지(충돌)
const EVT = "arnnect_posts_updated";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readAll(): MockPost[] {
  return safeParse<MockPost[]>(localStorage.getItem(POSTS_KEY), []);
}

function writeAll(list: MockPost[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function subscribePostsUpdated(cb: () => void) {
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("파일 읽기에 실패했습니다."));
    fr.readAsDataURL(file);
  });
}

export function listPostsByAuthorMock(authorId: string, role?: PostRole) {
  const all = readAll().filter((p) => !p.isDeleted);
  return all.filter((p) => p.authorId === authorId && (!role || p.role === role));
}

export function listPostsMock() {
  return readAll().filter((p) => !p.isDeleted);
}

export async function createReviewMock(data: ReviewCreateReq) {
  const dataUrl = await fileToDataUrl(data.imageFile);

  const post: MockPost = {
    id: uid(),
    authorId: data.author.id,
    authorName: data.author.name,
    role: data.author.role,
    title: data.title,
    content: data.content,
    imageUrls: [dataUrl],
    tags: data.tags,
    likes: 0,
    views: 0,
    createdAt: new Date().toISOString(),
    meta: { kind: "review", artworkId: data.artworkId },
  };

  writeAll([post, ...readAll()]);
  return { ok: true, id: post.id };
}

export async function createArtworkMock(data: ArtworkCreateReq) {
  const dataUrl = await fileToDataUrl(data.imageFile);

  const post: MockPost = {
    id: uid(),
    authorId: data.author.id,
    authorName: data.author.name,
    role: data.author.role,
    title: data.title,
    content: data.description || "(작품 설명 없음)",
    imageUrls: [dataUrl],
    tags: data.tags,
    likes: 0,
    views: 0,
    createdAt: new Date().toISOString(),
    meta: {
      kind: "artwork",
      field: data.field,
      genre: data.genre,
      productionDate: data.productionDate,
      size: data.size,
    },
  };

  writeAll([post, ...readAll()]);
  return { ok: true, id: post.id };
}
