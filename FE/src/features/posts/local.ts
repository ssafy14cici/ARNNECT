// FE/src/features/posts/local.ts
export type LocalMode = "ARTIST" | "USER";

export type LocalPost = {
  id: string;
  mode: LocalMode; // ARTIST=작품, USER=리뷰
  authorId: string;      // ✅ memberUuid
  authorName: string;

  title: string;
  content: string;

  imageUrl?: string;     // ✅ dataURL or "/art/a1.jpg"
  tags?: string[];
  artworkId?: number;    // 리뷰면 연결용

  createdAt: string;
};

const KEY = "comet_mock_posts_v1";
const EVT = "comet_posts_updated";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readAll(): LocalPost[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalPost[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: LocalPost[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function subscribePostsUpdated(cb: () => void) {
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h); // 다른 탭 대비(선택)
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

export function listPosts(mode?: LocalMode) {
  const all = readAll();
  return mode ? all.filter((p) => p.mode === mode) : all;
}

export function listPostsByAuthor(authorId: string, mode?: LocalMode) {
  const all = readAll();
  return all.filter((p) => p.authorId === authorId && (!mode || p.mode === mode));
}

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("파일 읽기 실패"));
    r.readAsDataURL(file);
  });
}

export async function createLocalPost(input: {
  mode: LocalMode;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  imageFile?: File | null;
  tags?: string[];
  artworkId?: number;
}) {
  const all = readAll();
  const imageUrl = input.imageFile ? await fileToDataUrl(input.imageFile) : undefined;

  const post: LocalPost = {
    id: uid(),
    mode: input.mode,
    authorId: input.authorId,
    authorName: input.authorName,
    title: input.title,
    content: input.content,
    imageUrl,
    tags: input.tags ?? [],
    artworkId: input.artworkId,
    createdAt: new Date().toISOString(),
  };

  writeAll([post, ...all]);
  return post;
}
