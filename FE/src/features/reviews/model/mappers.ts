//FE\src\features\reviews\model\mappers.ts

import type { ReviewCreateReq } from "./types";

function appendTags(fd: FormData, tags: string[]) {
  tags.forEach((t) => fd.append("tags", t));
}

export function toReviewCreateFormData(data: ReviewCreateReq): FormData {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("content", data.content);
  if (typeof data.artworkId === "number") {
    fd.append("artworkId", String(data.artworkId));
  }
  appendTags(fd, data.tags ?? []);
  // 이미지 없이 게시글 등록 가능?
  if (data.imageFile) fd.append("image", data.imageFile);
  return fd;
}