// FE/src/pages/auth/artist/types.ts

export type ArtistStep2 = {
  displayName: string;
  affiliation: string;
  artMain: string;
  artSub: string;
  verified: "YES" | "NO";
  verifiedFile: File | null;
  gender: "M" | "F";
  birthYear: string;
  birthYearPublic: boolean;
};

export type ArtistStep3 = {
  contact: string;
  intro: string;
  profileImage: File | null;
  portfolioFile: File | null;
};
