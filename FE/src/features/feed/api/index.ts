// src/features/feed/api/index.ts
import { getFeedListReal } from "./real";
import { USE_MOCK } from "../../../shared/config/env";
import { getDemoArtworkImage } from "../../artworks/api/demoArtworks";
import type { FeedItem } from "../model/types";

export async function getFeedList(): Promise<FeedItem[]> {
  if (USE_MOCK) {
    return Array.from({ length: 6 }, (_, idx) => ({
      id: `artwork-${9001 + idx}`,
      authorRole: "ARTIST",
      title: `Demo Artwork ${idx + 1}`,
      excerpt: "Portfolio demo artwork for frontend-only deployment.",
      authorName: "ARNNECT Demo",
      authorId: "demo-artist",
      createdAt: new Date(Date.UTC(2026, 0, idx + 1)).toISOString(),
      imageUrl: getDemoArtworkImage(idx),
      likes: 0,
      views: 0,
    }));
  }

  return getFeedListReal();
}

export type { FeedItem };
