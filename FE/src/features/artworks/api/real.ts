import { http } from "../../../shared/api/http";
import { useAuthStore } from "../../auth/store";
import type { ArtworkCreateReq } from "../model/types";
import { toArtworkCreateFormData } from "../model/mappers";

function authHeader() {
  const s = useAuthStore.getState();
  const token = s.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createArtworkReal(data: ArtworkCreateReq) {
  const fd = toArtworkCreateFormData(data);

  const res = await http.post("/api/v1/artworks", fd, {
    headers: {
      ...authHeader(),
      // FormData면 Content-Type 지정 금지(axios가 boundary 포함해서 자동 세팅)
    },
    withCredentials: true,
  });

  return res.data;
}
