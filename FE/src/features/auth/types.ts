// FE/src/features/auth/types.ts
export type UserRole = "USER" | "ARTIST";

export type LoginRequest = {
  email: string;
  password: string;
  role: UserRole;
  remember?: boolean;
};

export type LoginResponse = {
  token: string;
  email: string;
  role: UserRole;
  memberUuid: string;
  name: string;
};

export type SignupUserRequest = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  phone: string;
  agreements?: {
    all?: boolean;
    terms: boolean;
    privacy: boolean;
    marketing?: boolean;
  };
};

export type SignupArtistRequest = {
  email: string;
  password: string;
  name: string;
  phone: string;

  displayName?: string;
  artMain?: string;
  artSub?: string;
  birthYear?: number;

  verified?: "YES" | "NO";
  verifiedFile?: File | null;

  privacyConsent: boolean;
};
