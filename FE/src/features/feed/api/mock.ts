// src/features/feed/api/mock.ts (목업 전용: posts mock 저장소에서 읽기)
// 여기서 posts mock 저장소를 읽어서 feed로 매핑

import type { FeedItem } from "../types";
import { listPostsMock } from "../../posts/api/mock"; // ✅ 목업 저장소 단일화

function pickExcerpt(content?: string, max = 120) {
  if (!content) return undefined;
  const s = content.replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export async function getFeedListMock(): Promise<FeedItem[]> {
  const posts = listPostsMock();

  return posts
    .map((p) => ({
      id: p.id,
      authorRole: p.mode === "ARTIST" ? "ARTIST" : "USER",
      title: p.title,
      excerpt: pickExcerpt(p.content),
      authorName: p.authorName,
      authorId: p.authorId,
      createdAt: p.createdAt,
      imageUrl: (p.imageUrls?.[0] ?? p.imageUrl) || undefined,
      likes: p.likes ?? 0,
      views: p.views ?? 0,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
