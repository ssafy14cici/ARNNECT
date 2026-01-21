// src/types/auth.ts

export type UserRole = "USER" | "ARTIST";

export type LoginRequest = {
  email: string;
  password: string;
  role: UserRole;
  remember: boolean;
};

export type LoginResponse = {
  token: string;
  email: string;
  role: UserRole;
};

export type SignupUserRequest = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  phone: string;
  agreements: {
    all: boolean;
    terms: boolean;
    privacy: boolean;
    marketing: boolean;
  };
};

export type ArtistStep1 = {
  email: string;
  name: string;
  password: string;
  phone: string;
};

export type ArtistStep2 = {
  displayName: string;
  affiliation: string;
  artMain: string;
  artSub: string;
  verified: "YES" | "NO";
  verifiedFile: File | null;   // ✅ 추가
  gender: "M" | "F";
  birthYear: string;
  birthYearPublic: boolean;
};


export type ArtistStep3 = {
  contact: string; // 소통창구
  intro: string; // 예술활동 소개
  profileImage: File | null;
  portfolioFile: File | null;
};

export type ArtistStep4 = {
  privacyConsent: boolean;
};

export type SignupArtistRequest = ArtistStep1 & ArtistStep2 & ArtistStep3 & ArtistStep4;
