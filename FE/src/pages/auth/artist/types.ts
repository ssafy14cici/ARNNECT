// FE/src/pages/auth/artist/types.ts

export type ArtistStep2 = {
  nickname: string;
  birth: string;        // yyyy-MM-dd
  affiliation: string;
  debutYear: string;    // 입력은 string → submit에서 number 변환
  genreId: number | null;
  sns: string;
};

export type ArtistStep3 = {
  document: File | null;       // backend: document (file)
  artIntroduction: string;      // optional이지만 우선 입력 받는다고 가정
};
