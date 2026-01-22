// FE/src/data/users.ts
export type UserMock = {
  id: string;
  name: string;
  profileImage?: string | null;
  badges?: string[];
  followerCount: number;
};

export const users: UserMock[] = [
  { id: "user-1", name: "U. PARK", profileImage: null, badges: ["NEW"], followerCount: 120 },
  { id: "user-2", name: "K. CHOI", profileImage: null, badges: [], followerCount: 44 },
];
