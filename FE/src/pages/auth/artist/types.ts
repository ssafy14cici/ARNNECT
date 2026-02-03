
export type ArtistStep2 = {
  displayName: string;              // 활동명
  artMain: number | "";             // 대분류 id (또는 string)
  artSub: number | "";              // 소분류 id (또는 string)
  birthYear: number | "";           // 출생연도

  verified: "YES" | "NO";           // 예술활동 증명 여부
  verifiedFile: File | null;        // 증빙 파일
};


export type ArtistStep3 = {
  document: File | null;       // backend: document (file)
  artIntroduction: string;      // optional이지만 우선 입력 받는다고 가정
};
