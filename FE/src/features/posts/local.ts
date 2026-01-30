// FE/src/features/posts/local.ts

// 1️⃣ 타입 이름 변경 (Mode -> Role)
export type LocalRole = "ARTIST" | "USER";

export type LocalPost = {
  id: string;
  role: LocalRole; // 2️⃣ 속성명 변경: mode -> role
  authorId: string;
  authorName: string;

  title: string;
  content: string;

  imageUrl?: string;
  imageUrls?: string[];

  tags?: string[];
  artworkId?: number;

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
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

// 3️⃣ 필터링 파라미터 및 로직 변경 (mode -> role)
export function listPosts(role?: LocalRole) {
  const all = readAll();
  // 저장된 데이터에 role이 없을 경우(구버전 데이터) 대비 안전장치 추가 가능
  return role ? all.filter((p) => p.role === role) : all;
}

export function listPostsByAuthor(authorId: string, role?: LocalRole) {
  const all = readAll();
  return all.filter((p) => p.authorId === authorId && (!role || p.role === role));
}

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("파일 읽기 실패"));
    r.readAsDataURL(file);
  });
}

// 4️⃣ 생성 함수 파라미터 변경 (mode -> role)
export async function createLocalPost(input: {
  role: LocalRole; // 👈 여기가 중요합니다 (PostCreate와 일치)
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
    role: input.role, // 👈 저장할 때도 role 이름으로 저장
    authorId: input.authorId,
    authorName: input.authorName,
    title: input.title,
    content: input.content,
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
    tags: input.tags ?? [],
    artworkId: input.artworkId,
    createdAt: new Date().toISOString(),
  };

  writeAll([post, ...all]);
  return post;
}