// FE/src/features/artworks/model/types.ts
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

  artistUuid?: string;
  artistName?: string;
};

/**
 * ✅ BE CreateArtworkRequest 매칭
 * - fieldId: Integer (DB 1개 → FE에서 고정 1)
 * - genreId: Integer (드롭다운)
 * - productionDate: LocalDate ("YYYY-MM-DD")
 * - image: MultipartFile
 */
export interface ArtworkCreateReq {
  title: string;
  description?: string;

  fieldId: number;
  genreId: number;

  productionDate?: string; // "YYYY-MM-DD"
  size?: string;

  image: File;
  tags?: string[];

  author?: AuthorCtx;
}


export interface ArtworkUpdateReq {
  title: string;
  description: string;

  fieldId: number;          // ✅ 필수 
  genreId?: number;         // ✅ 선택
  productionDate: string;   // ✅ 필수 "YYYY-MM-DD"
  size: string;             // ✅ 필수

  image?: File;             // ✅ 선택
  tags?: string[];          // ✅ 선택
}
