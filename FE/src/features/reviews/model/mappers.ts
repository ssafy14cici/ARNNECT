import type { ReviewCreateReq } from "./types";

function appendTags(fd: FormData, tags: string[]) {
  tags.forEach((t) => fd.append("tags", t));
}

export function toReviewCreateFormData(data: ReviewCreateReq): FormData {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("content", data.content);
  fd.append("artworkId", String(data.artworkId));
  appendTags(fd, data.tags ?? []);
  fd.append("image", data.imageFile);
  return fd;
}
