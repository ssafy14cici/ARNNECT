//FE\src\features\profile\api.ts
import type { ArtistProfile, UserProfile, FeedItem, ProfileRole } from "./types";

// =====================================================================
// 🚨 [네트워크 완전 차단] 하드코딩 데이터 반환 버전
// =====================================================================

const MOCK_ARTIST_ID = "hardcoded-artist-id";
const MOCK_USER_ID = "hardcoded-user-id";

// 1. 하드코딩된 아티스트 프로필 객체
const FIXED_ARTIST_PROFILE: ArtistProfile = {
  id: MOCK_ARTIST_ID,
  role: "ARTIST",
  name: "Mock Artist",
  imageUrl: "", // 필요하면 "/art/profile.jpg" 등으로 변경
  bio: "네트워크 요청 없이 표시되는 하드코딩 아티스트입니다.",
  genre: "Painting",
  contactEnabled: true,
  contactUrl: "https://open.kakao.com/me/artist",
  followersCount: 123,
  followingsCount: 10,
  badges: [
    { id: "b1", label: "인기 작가", description: "조회수 1만 달성" }
  ],
  featuredBadgeIds: ["b1"],
  isFollowing: false,
};

// 2. 하드코딩된 유저 프로필 객체
const FIXED_USER_PROFILE: UserProfile = {
  id: MOCK_USER_ID,
  role: "USER",
  name: "Mock User",
  imageUrl: "",
  bio: "네트워크 요청 없이 표시되는 하드코딩 유저입니다.",
  followersCount: 5,
  followingsCount: 12,
  badges: [],
  featuredBadgeIds: [],
  isFollowing: false,
};

export const profileApi = {
  // 어떤 ID가 들어오든 무조건 위에서 만든 아티스트 객체 리턴
  getArtistProfile: async (id: string): Promise<ArtistProfile> => {
    return { ...FIXED_ARTIST_PROFILE, id: id }; // ID만 맞춰서 반환
  },

  // 어떤 ID가 들어오든 무조건 위에서 만든 유저 객체 리턴
  getUserProfile: async (id: string): Promise<UserProfile> => {
    return { ...FIXED_USER_PROFILE, id: id };
  },

  // 피드: 무조건 하드코딩된 이미지 3개 반환
  getArtistFeed: async (id: string, _cursor?: string | null) => {
    const items: FeedItem[] = [
      { id: "art1", imageUrl: "/art/a1.jpg", createdAt: new Date().toISOString() },
      { id: "art2", imageUrl: "/art/a2.jpg", createdAt: new Date().toISOString() },
      { id: "art3", imageUrl: "/art/a3.jpg", createdAt: new Date().toISOString() },
    ];
    return { items, nextCursor: null };
  },

  // 유저 피드: 빈 배열 반환
  getUserFeed: async (id: string, _cursor?: string | null) => {
    return { items: [], nextCursor: null };
  },

  // 기능 함수들: 아무 동작 안 하고 성공 처리 (콘솔만 찍음)
  follow: async (targetId: string) => { console.log("하드코딩 팔로우 성공"); },
  unfollow: async (targetId: string) => { console.log("하드코딩 언팔로우 성공"); },
  submitQuestionToArtist: async () => { console.log("질문 전송 흉내"); },
  updateFeaturedBadges: async () => { console.log("뱃지 변경 흉내"); },
};