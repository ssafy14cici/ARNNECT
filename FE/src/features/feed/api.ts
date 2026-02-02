//FE\src\features\feed\api.ts

import { http } from "../../shared/api/http";
import { __mock as postsMock } from "./posts/api";
import type { FeedItem } from "./types";   // ✅ 여기서만


const ART_IMAGES = [
  "/art/a1.jpg", "/art/a2.jpg", "/art/a3.jpg", "/art/a4.jpg",
  "/art/a5.jpg", "/art/a6.jpg", "/art/a7.jpg", "/art/a8.jpg",
  "/art/a9.jpg", "/art/a10.jpg", "/art/a11.jpg", "/art/a12.jpg",
];



function buildImageMockFeeds(): FeedItem[] {
  return ART_IMAGES.map((src, idx) => ({
    id: `img-${idx + 1}`,
    authorRole: idx % 2 === 0 ? "ARTIST" : "USER",
    title: `Artwork ${idx + 1}`,
    authorName: idx % 2 === 0 ? "Mock Artist" : "Mock User",
    authorId: idx % 2 === 0 ? `artist-${idx}` : `user-${idx}`,
    createdAt: new Date(Date.now() - idx * 3 * 60 * 60 * 1000).toISOString(),
    imageUrl: src,
    likes: Math.floor(Math.random() * 300),
    views: 100 + Math.floor(Math.random() * 3000),
  }));
}

function fileBaseName(url?: string) {
  if (!url) return null;
  const last = url.split("/").pop() ?? "";
  if (!last) return null;
  return last.replace(/\.(png|jpg|jpeg|webp)$/i, "");
}

function fromLocalPosts(): FeedItem[] {
  const reviews = postsMock.loadReviews();
  const artworks = postsMock.loadArtworks();

  const reviewItems: FeedItem[] = reviews.map((r: any) => ({
    id: `review-${r.id}`,
    authorRole: "USER", // ✅ 리뷰는 USER로 고정(또는 r.role이 USER면 r.role)
    title: r.title,
    excerpt: r.excerpt,
    authorName: r.authorName,
    authorId: r.authorId,
    createdAt: r.createdAt,
    imageUrl: r.imageUrl,
    category: r.category,
    likes: r.likes ?? 0,
    views: r.views ?? 0,
  }));

  const artworkItems: FeedItem[] = artworks.map((a: any) => ({
    id: `artwork-${a.id}`,
    authorRole: "ARTIST",
    title: a.title,
    excerpt: a.excerpt,
    authorName: a.authorName,
    authorId: a.authorId,
    createdAt: a.createdAt,
    imageUrl: a.imageUrl,
    category: a.category,
    likes: a.likes ?? 0,
    views: a.views ?? 0,
  }));

  return [...reviewItems, ...artworkItems].sort((x, y) =>
    y.createdAt.localeCompare(x.createdAt),
  );
}

const USE_MOCK = (import.meta as any).env.VITE_USE_MOCK === "true" || (import.meta as any).env.DEV;

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
