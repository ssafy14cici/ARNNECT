// FE/src/features/artworks/api/real.ts
import { http } from "../../../shared/api/http";
import { useAuthStore } from "../../auth/store";
import type { ArtworkCreateReq, ArtworkUpdateReq } from "../model/types";
import { toArtworkCreateFormData, toArtworkUpdateFormData } from "../model/mappers";

function authHeader() {
  const s = useAuthStore.getState();
  const token = s.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createArtworkReal(data: ArtworkCreateReq) {
  const fd = toArtworkCreateFormData(data);
  const res = await http.post("/api/v1/artworks", fd, {
    headers: { ...authHeader() },
    withCredentials: true,
  });
  return res.data;
}

export async function updateArtworkReal(artworkId: string | number, data: ArtworkUpdateReq) {
  const fd = toArtworkUpdateFormData(data);

  const res = await http.put(`/api/v1/artworks/${artworkId}`, fd, {
    headers: { ...authHeader() },
    withCredentials: true,
  });

  return res.data;
}

export async function deleteArtworkReal(artworkId: string | number) {
  const res = await http.delete(`/api/v1/artworks/${artworkId}`, {
    headers: { ...authHeader() },
    withCredentials: true,
  });

  return res.data;
}
