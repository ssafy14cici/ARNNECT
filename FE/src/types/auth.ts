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
  displayName: string; // 성명(활동명)
  affiliation: string; // 소속(선택)
  artMain: string; // 대분류
  artSub: string; // 소분류
  verified: "YES" | "NO"; // 예술활동증명 여부
  gender: "M" | "F";
  birthYear: string;
  birthYearPublic: boolean; // 공개 토글
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
