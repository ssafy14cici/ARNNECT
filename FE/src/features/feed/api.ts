import { http } from "../../shared/api/http";
// 경로 수정: posts/api -> posts/api (같은 폴더에 있다면 ./posts/api 가 아니라 ./posts/api.ts 위치 확인 필요)
// 구조상 features/feed/posts/api.ts 이고 현재 파일이 features/feed/api.ts 이므로:
import { __mock as postsMock } from "./posts/api"; 

type FeedRole = "ARTIST" | "USER";

export type FeedItem = {
  id: string;
  role: FeedRole;
  title: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  imageUrl?: string;
  likes: number;
  views: number;
};

const ART_IMAGES = [
  "/art/a1.jpg", "/art/a2.jpg", "/art/a3.jpg", "/art/a4.jpg",
  "/art/a5.jpg", "/art/a6.jpg", "/art/a7.jpg", "/art/a8.jpg",
  "/art/a9.jpg", "/art/a10.jpg", "/art/a11.jpg", "/art/a12.jpg",
];

function buildImageMockFeeds(): FeedItem[] {
  return ART_IMAGES.map((src, idx) => ({
    id: `img-${idx + 1}`,
    role: idx % 2 === 0 ? "ARTIST" : "USER",
    title: `Artwork ${idx + 1}`,
    authorName: idx % 2 === 0 ? "Mock Artist" : "Mock User",
    authorId: idx % 2 === 0 ? `artist-${idx}` : `user-${idx}`,
    createdAt: new Date(Date.now() - idx * 3 * 60 * 60 * 1000).toISOString(),
    imageUrl: src,
    likes: Math.floor(Math.random() * 300),
    views: 100 + Math.floor(Math.random() * 3000),
  }));
}

function fromLocalPosts(): FeedItem[] {
  const reviews = postsMock.loadReviews();
  const artworks = postsMock.loadArtworks();

  // 매개변수 r, a에 any 타입 명시하여 에러 해결
  const reviewItems: FeedItem[] = reviews.map((r: any) => ({
    id: `review-${r.id}`,
    role: r.role,
    title: r.title,
    authorName: r.authorName,
    authorId: r.authorId,
    createdAt: r.createdAt,
    imageUrl: r.imageUrl,
    likes: r.likes,
    views: r.views,
  }));

  const artworkItems: FeedItem[] = artworks.map((a: any) => ({
    id: `artwork-${a.id}`,
    role: "ARTIST",
    title: a.title,
    authorName: a.authorName,
    authorId: a.authorId,
    createdAt: a.createdAt,
    imageUrl: a.imageUrl,
    likes: a.likes,
    views: a.views,
  }));

  return [...reviewItems, ...artworkItems].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

const USE_MOCK = (import.meta as any).env.VITE_USE_MOCK === "true" || (import.meta as any).env.DEV;

/** 피드 목록 조회 */
export const getFeedList = async (): Promise<FeedItem[]> => {
  if (USE_MOCK) {
    const local = fromLocalPosts();
    return local.length > 0 ? local : buildImageMockFeeds();
  }

  try {
    const res = await http.get("/feeds");
    if (Array.isArray(res?.data)) return res.data as FeedItem[];
    return buildImageMockFeeds();
  } catch {
    return buildImageMockFeeds();
  }
};