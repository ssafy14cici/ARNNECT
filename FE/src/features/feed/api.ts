// FE/src/features/feed/api.ts
import { http } from "../../shared/api/http";
import { __mock as postsMock } from "../posts/api";
import { useMock } from "../../mocks/useMock";

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

function fileBaseName(url?: string) {
  if (!url) return null;
  const last = url.split("/").pop() ?? "";
  if (!last) return null;
  return last.replace(/\.(png|jpg|jpeg|webp)$/i, "");
}

function fromLocalPosts(): FeedItem[] {
  const reviews = postsMock.loadReviews();
  const artworks = postsMock.loadArtworks();

  const reviewItems: FeedItem[] = reviews.map((r) => {
    const imageName = fileBaseName(r.imageUrl);
    return {
      id: imageName || `review-${r.id}`,
      role: r.role,
      title: r.title,
      authorName: r.authorName,
      authorId: r.authorId,
      createdAt: r.createdAt,
      imageUrl: r.imageUrl,
      likes: r.likes,
      views: r.views,
    };
  });

  const artworkItems: FeedItem[] = artworks.map((a) => {
    const imageName = fileBaseName(a.imageUrl);
    return {
      id: imageName || `artwork-${a.id}`,
      role: "ARTIST",
      title: a.title,
      authorName: a.authorName,
      authorId: a.authorId,
      createdAt: a.createdAt,
      imageUrl: a.imageUrl,
      likes: a.likes,
      views: a.views,
    };
  });

  return [...reviewItems, ...artworkItems].sort((x, y) =>
    y.createdAt.localeCompare(x.createdAt),
  );
}

/** 피드 목록 조회 */
export const getFeedList = async (): Promise<FeedItem[]> => {
  // ✅ 런타임 판별
  if (useMock()) {
    const local = fromLocalPosts();
    return local.length > 0 ? local : buildImageMockFeeds();
  }

  // ✅ real API
  const res = await http.get("/feeds");
  return Array.isArray(res?.data) ? (res.data as FeedItem[]) : [];
};
