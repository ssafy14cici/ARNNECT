import { USE_MOCK } from "../../../shared/config/env";
import type { ArtworkCreateReq } from "../model/types";
import { createArtworkReal } from "./real";

export async function createArtwork(data: ArtworkCreateReq) {
  if (USE_MOCK) {
    throw new Error("[artworks] USE_MOCK=true 환경에서는 createArtwork를 지원하지 않습니다.");
  }
  return createArtworkReal(data);
}
