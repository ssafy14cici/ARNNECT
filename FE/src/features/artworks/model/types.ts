// ✅ 기존 features/posts/types.ts 기반 (author는 mock/local에서 쓰던 흔적이라 optional 유지)

export type PostRole = "USER" | "ARTIST";

export type AuthorCtx = {
  id: string;
  name: string;
  role: PostRole;
};

export type ArtworkId = string | number;

export type Artwork = {
  artworkId: ArtworkId;
  title?: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  createdAt?: string;

  // (선택) 작가 식별
  artistUuid?: string;
  artistName?: string;
};

export interface ArtworkCreateReq {
  title: string;
  description: string;
  field: string;
  genre: string;
  productionDate: number;
  size: string;
  tags: string[];
  imageFile: File;

  // legacy/mock 호환용
  author?: AuthorCtx;
}
