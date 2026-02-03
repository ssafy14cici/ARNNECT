// src/features/search/api/index.ts
import { fetchSearchArtworksReal } from "./real";
import type { SearchArtwork } from "../model/types";

export async function fetchSearchArtworks(q: string): Promise<SearchArtwork[]> {
  return fetchSearchArtworksReal(q);
}

export type { SearchArtwork };
