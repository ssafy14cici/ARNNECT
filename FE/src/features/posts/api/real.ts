import { http } from "../../../shared/api/http";
import type { ArtworkCreateReq, ReviewCreateReq } from "../types";

function appendTags(fd: FormData, tags: string[]) {
  tags.forEach((t) => fd.append("tags", t));
}

export async function createReviewReal(data: ReviewCreateReq) {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("content", data.content);
  fd.append("artworkId", String(data.artworkId));
  appendTags(fd, data.tags);
  fd.append("image", data.imageFile);

  const res = await http.post("/api/v1/reviews", fd);
  return res.data;
}

export async function createArtworkReal(data: ArtworkCreateReq) {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("description", data.description);
  fd.append("field", data.field);
  fd.append("genre", data.genre);
  fd.append("productionDate", String(data.productionDate));
  fd.append("size", data.size);
  appendTags(fd, data.tags);
  fd.append("image", data.imageFile);

  const res = await http.post("/api/v1/artworks", fd);
  return res.data;
}
