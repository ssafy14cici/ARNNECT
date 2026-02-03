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

// 서버가 tags를 "JSON 문자열 하나"로만 받도록 만들어둔 경우
// 서버가 멀티값을 지원 안 하고 마지막 값만을 읽는 경우 에러 생김