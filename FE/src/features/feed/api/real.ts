// src/features/feed/api/real.ts (실서버 전용)

import { http } from "../../../shared/api/http";
import type { FeedItem } from "../types";

export async function getFeedListReal(): Promise<FeedItem[]> {
  const res = await http.get("/feeds");
  return (Array.isArray(res?.data) ? res.data : []) as FeedItem[];
}
