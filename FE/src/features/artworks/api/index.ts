// FE/src/features/artworks/api/index.ts
import { USE_MOCK } from "../../../shared/config/env";
import type { ArtworkCreateReq, ArtworkUpdateReq } from "../model/types";
import { createArtworkReal, updateArtworkReal, deleteArtworkReal } from "./real";

export async function createArtwork(data: ArtworkCreateReq) {
  if (USE_MOCK) throw new Error("[artworks] USE_MOCK=true 환경에서는 createArtwork를 지원하지 않습니다.");
  return createArtworkReal(data);
}

export async function updateArtwork(artworkId: string | number, data: ArtworkUpdateReq) {
  if (USE_MOCK) throw new Error("[artworks] USE_MOCK=true 환경에서는 updateArtwork를 지원하지 않습니다.");
  return updateArtworkReal(artworkId, data);
}

export async function deleteArtwork(artworkId: string | number) {
  if (USE_MOCK) throw new Error("[artworks] USE_MOCK=true 환경에서는 deleteArtwork를 지원하지 않습니다.");
  return deleteArtworkReal(artworkId);
}
