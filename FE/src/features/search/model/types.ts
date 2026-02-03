// src/features/search/model/types.ts
export type SearchArtwork = {
  id: string;
  src: string;

  title?: string;
  artist?: string;
  thumbnail?: string;

  likes?: number;
  views?: number;
  createdAt?: string;

  tags?: string[];
  uploader?: string;
};
