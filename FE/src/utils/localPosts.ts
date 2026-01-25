// FE/src/utils/localPosts.ts
export type LocalMode = "ARTIST" | "USER";

export type LocalPost = {
  id: string;
  authorId: string; // 실제 작성자 id (ex. u_artist_test_com)
  mode: LocalMode;
  imageUrl: string; // dataUrl
  tags: string[];
  createdAt: string;

  // ARTIST
  title?: string;
  description?: string;
  field?: string;
  genre?: string;
  year?: string;
  size?: string;

  // USER
  reviewTitle?: string;
  reviewText?: string;
  artworkIdOrUuid?: string;
};

const KEY = "comet_local_posts_v1";
const EVT = "comet:posts-updated";

function safeParse(raw: string | null): LocalPost[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as LocalPost[]) : [];
  } catch {
    return [];
  }
}

export function listAllPosts(): LocalPost[] {
  return safeParse(localStorage.getItem(KEY));
}

export function saveAllPosts(posts: LocalPost[]) {
  localStorage.setItem(KEY, JSON.stringify(posts));
  window.dispatchEvent(new Event(EVT));
}

export function addPost(post: LocalPost) {
  const prev = listAllPosts();
  saveAllPosts([post, ...prev]);
}

export function listPostsByAuthor(authorId: string, mode?: LocalMode): LocalPost[] {
  const all = listAllPosts();
  return all.filter((p) => p.authorId === authorId && (!mode || p.mode === mode));
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function subscribePostsUpdated(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
