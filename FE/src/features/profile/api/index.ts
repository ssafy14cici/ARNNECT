// FE/src/features/profile/api/index.ts
import type { ProfileRole, ProfileModel, PageResult, FeedItem } from "../types";
import type { UpdateMyProfilePatch } from "./real";
import * as real from "./real";
import { http } from "../../../shared/api/http";

export type { UpdateMyProfilePatch };

export type ToggleFollowResult = {
  isFollowing?: boolean; // 응답에서 확정 가능한 경우만
  raw: unknown;          // 원본 응답(디버깅용)
};

// ─────────────────────────────────────────────────────────────
// 내부 유틸: 서버 응답에서 팔로우 상태 키를 최대한 폭넓게 읽어오기
// ─────────────────────────────────────────────────────────────
function pickFollowFlag(raw: any): boolean | undefined {
  const v =
    raw?.isFollowing ??
    raw?.isFollowed ??
    raw?.followed ??
    raw?.following ??
    raw?.follow ??
    raw?.result; // 토글 결과를 result(boolean)로 주는 서버도 있음

  return typeof v === "boolean" ? v : undefined;
}

function normalizeProfile(p: ProfileModel): ProfileModel {
  const v = pickFollowFlag(p as any);
  // ✅ 없으면 덮어쓰지 않는다 (undefined를 false로 만들지 않기)
  return typeof v === "boolean" ? ({ ...(p as any), isFollowing: v } as ProfileModel) : p;
}

export const profileApi: {
  getMyProfile: () => Promise<ProfileModel>;

  // ✅ 통합 조회(artist -> user fallback)
  getProfile: (memberUuid: string) => Promise<ProfileModel>;

  getArtistProfile: (memberUuid: string) => Promise<ProfileModel>;
  getUserProfile: (memberUuid: string) => Promise<ProfileModel>;

  getArtistFeed: (memberUuid: string, cursor?: string | null) => Promise<PageResult<FeedItem>>;
  getUserFeed: (memberUuid: string, cursor?: string | null) => Promise<PageResult<FeedItem>>;

  // ✅ 토글 팔로우(POST /follow/{uuid})
  toggleFollow: (targetId: string) => Promise<ToggleFollowResult>;

  // 기존 호환
  follow: (targetId: string) => Promise<void>;
  unfollow: (targetId: string) => Promise<void>;

  sendFanLetter: (artistUuid: string, content: string) => Promise<void>;
  updateMyProfile: (role: ProfileRole, patch: UpdateMyProfilePatch) => Promise<ProfileModel>;

  updateFeaturedBadges: (role: ProfileRole, profileId: string, badgeIds: string[]) => Promise<void>;
} = {
  getMyProfile: async () => normalizeProfile(await real.getMyProfile()),

  // ✅ 여기서 fallback 처리 (real.getProfile 의존 제거)
  getProfile: async (memberUuid: string) => {
    try {
      return normalizeProfile(await real.getArtistProfile(memberUuid));
    } catch {
      return normalizeProfile(await real.getUserProfile(memberUuid));
    }
  },

  getArtistProfile: async (memberUuid: string) => normalizeProfile(await real.getArtistProfile(memberUuid)),
  getUserProfile: async (memberUuid: string) => normalizeProfile(await real.getUserProfile(memberUuid)),

  getArtistFeed: real.getArtistFeed,
  getUserFeed: real.getUserFeed,

  toggleFollow: async (targetId: string) => {
    const res = await http.post(`/api/v1/follow/${encodeURIComponent(targetId)}`);
    const raw = (res as any)?.data?.data ?? (res as any)?.data ?? res;

    // raw 자체가 boolean인 경우도 처리
    const directBool = typeof raw === "boolean" ? raw : undefined;
    const isFollowing = directBool ?? pickFollowFlag(raw);

    return { isFollowing, raw };
  },

  // 기존 API 유지(내부 구현은 real 그대로 둠)
  follow: real.follow,
  unfollow: real.unfollow,

  sendFanLetter: real.sendFanLetter,
  updateMyProfile: real.updateMyProfile,

  updateFeaturedBadges: real.updateFeaturedBadges,
};
