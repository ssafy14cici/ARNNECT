// src/features/feed/api/index.ts
import { getFeedListReal } from "./real";
import type { FeedItem } from "../model/types";

export async function getFeedList(): Promise<FeedItem[]> {
  return getFeedListReal();
}

export type { FeedItem };
