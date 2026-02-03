// src/features/reviews/api/mock.ts
import type { Review, ReviewCreateReq, ReviewId } from "../model/types";

let seq = 1000;
let store: Review[] = [];

function nowISO() {
  return new Date().toISOString();
}

function fileToObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

export async function createReviewMock(data: ReviewCreateReq) {
  console.log("[reviews/api/mock] createReviewMock called", data);
  console.log("mock createReview called", data);

  const reviewId: ReviewId = ++seq;
  const imageUrl = fileToObjectUrl(data.imageFile);

  const created: Review = {
    reviewId,
    title: data.title,
    content: data.content,
    artworkId: data.artworkId,
    tags: data.tags ?? [],
    createdAt: nowISO(),
    imageUrl,
    authorName: data.author?.name,
    authorUuid: (data.author as any)?.uuid ?? (data.author as any)?.id,
  };

  store = [created, ...store];

  return {
    success: true,
    code: "OK",
    message: "mock: 감상평이 등록되었습니다.",
    data: { reviewId, imageUrl },
  };
}

export async function listReviewsByArtworkMock(artworkId: number) {
  const list = store.filter((r) => r.artworkId === artworkId);
  return { success: true, code: "OK", message: "mock: 작품 감상평 목록", data: list };
}

export async function getReviewDetailMock(reviewId: ReviewId) {
  const found = store.find((r) => String(r.reviewId) === String(reviewId)) ?? null;
  return { success: true, code: "OK", message: "mock: 감상평 상세", data: found };
}

export async function updateReviewMock(reviewId: ReviewId, patch: Partial<Review>) {
  store = store.map((r) => (String(r.reviewId) === String(reviewId) ? { ...r, ...patch } : r));
  return { success: true, code: "OK", message: "mock: 감상평 수정", data: null };
}

export async function deleteReviewMock(reviewId: ReviewId) {
  store = store.filter((r) => String(r.reviewId) !== String(reviewId));
  return { success: true, code: "OK", message: "mock: 감상평 삭제", data: null };
}
