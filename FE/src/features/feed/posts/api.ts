import { http } from "../../../shared/api/http";

// Vite 환경변수 타입 에러 방지
const USE_MOCK = (import.meta as any).env.VITE_USE_MOCK === "true";

export type PostRole = "ARTIST" | "USER";

export type AuthorCtx = {
  id: string;
  name: string;
  role: PostRole;
};

export interface ReviewCreateReq {
  title: string;
  content: string;
  artworkId: number;
  tags: string[];
  imageFile: File;
  author: AuthorCtx;
}

export interface ArtworkCreateReq {
  title: string;
  description: string;
  field: string;
  genre: string;
  productionDate: number;
  size: string;
  tags: string[];
  imageFile: File;
  author: AuthorCtx;
}

// Mock 데이터 인터페이스 정의 (any 에러 방지)
interface MockPostItem {
  id: string;
  role: string;
  authorName: string;
  authorId: string;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
  likes: number;
  views: number;
  // review 전용
  artworkId?: number;
  // artwork 전용
  field?: string;
  meta?: any;
}

// 메모리 상의 임시 Mock 데이터 저장소
const _mockPosts: MockPostItem[] = [];

// 헬퍼 함수
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("파일 읽기 실패"));
    fr.readAsDataURL(file);
  });
}

// --- API 함수들 ---

export async function createReview(data: ReviewCreateReq) {
  if (USE_MOCK) {
    console.log("[Mock] Creating Review:", data);
    const url = await fileToDataUrl(data.imageFile);

    const newPost: MockPostItem = {
      id: `mock-review-${Date.now()}`,
      role: data.author.role,
      authorName: data.author.name,
      authorId: data.author.id,
      title: data.title,
      content: data.content,
      imageUrl: url,
      createdAt: new Date().toISOString(),
      likes: 0,
      views: 0,
      artworkId: data.artworkId,
    };
    _mockPosts.unshift(newPost);

    return { ok: true, id: newPost.id };
  }

  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("content", data.content);
  fd.append("artworkId", String(data.artworkId));
  data.tags.forEach((t) => fd.append("tags", t));
  fd.append("image", data.imageFile);

  const res = await http.post("/api/v1/reviews", fd);
  return res.data;
}

export async function createArtwork(data: ArtworkCreateReq) {
  if (USE_MOCK) {
    console.log("[Mock] Creating Artwork:", data);
    const url = await fileToDataUrl(data.imageFile);

    const newPost: MockPostItem = {
      id: `mock-art-${Date.now()}`,
      role: "ARTIST",
      authorName: data.author.name,
      authorId: data.author.id,
      title: data.title,
      content: data.description,
      imageUrl: url,
      createdAt: new Date().toISOString(),
      likes: 0,
      views: 0,
      field: data.field,
    };
    _mockPosts.unshift(newPost);

    return { ok: true, id: newPost.id };
  }

  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("description", data.description);
  fd.append("field", data.field);
  fd.append("genre", data.genre);
  fd.append("productionDate", String(data.productionDate));
  fd.append("size", data.size);
  data.tags.forEach((t) => fd.append("tags", t));
  fd.append("image", data.imageFile);

  const res = await http.post("/api/v1/artworks", fd);
  return res.data;
}

export function listPostsByAuthor(authorId: string, _role: string) {
  // _role: unused variable warning 방지
  if (USE_MOCK) {
    return _mockPosts.filter((p) => p.authorId === authorId);
  }
  return [];
}

export function subscribePostsUpdated(_callback: () => void) {
  // _callback: unused variable warning 방지
  return () => {};
}

// features/feed/api.ts 에서 사용하기 위한 Mock 헬퍼 객체
export const __mock = {
  loadReviews: () => _mockPosts.filter((p) => p.artworkId !== undefined), // artworkId가 있으면 리뷰로 간주
  loadArtworks: () => _mockPosts.filter((p) => p.field !== undefined), // field가 있으면 작품으로 간주
};