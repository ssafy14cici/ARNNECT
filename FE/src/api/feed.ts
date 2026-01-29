// src/api/feed.ts
import { http } from "./http";

type FeedRole = "ARTIST" | "USER";

type FeedItem = {
  id: string;
  role: FeedRole;
  title: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  imageUrl: string;
  likes: number;
  views: number;
};

/**
 * public/art 안의 이미지 자체를 더미 데이터로 사용
 */
const ART_IMAGES = [
  "/art/b1.jpg",
  "/art/b2.jpg",
  "/art/b3.jpg",
  "/art/b4.jpg",
  "/art/b5.jpg",
  "/art/b6.jpg",
  "/art/b7.jpg",
  "/art/b8.jpg",
  "/art/b9.jpg",
  "/art/b10.jpg",
  "/art/b11.jpg",
  "/art/b12.jpg",
];

function buildImageMockFeeds(): FeedItem[] {
  return ART_IMAGES.map((src, idx) => ({
    id: String(idx + 1),
    role: idx % 2 === 0 ? "ARTIST" : "USER",
    title: `Artwork ${idx + 1}`,
    authorName: idx % 2 === 0 ? "Mock Artist" : "Mock User",
    authorId: idx % 2 === 0 ? `artist-${idx}` : `user-${idx}`,
    createdAt: new Date(
      Date.now() - idx * 3 * 60 * 60 * 1000
    ).toISOString(),
    imageUrl: src, // ← 이게 곧 더미 데이터의 핵심
    likes: Math.floor(Math.random() * 300),
    views: 100 + Math.floor(Math.random() * 3000),
  }));
}

/**
 * 피드 목록 조회
 * - 서버 요청은 시도
 * - 현재 단계에서는 이미지 기반 더미 데이터를 반환
 */
export const getFeedList = async (): Promise<FeedItem[]> => {
  console.log("[FE → SERVER] GET /feeds 요청 송출");

  try {
    const res = await http.get("/feeds");

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    // 서버 응답이 비정상이면 이미지 기반 더미 사용
    return buildImageMockFeeds();
  } catch {
    // 서버 미연결 → 이미지 = 더미 데이터
    return buildImageMockFeeds();
  }
};
