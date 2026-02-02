// FE/src/features/profile/api/index.ts
import type { ProfileRole, ProfileModel, PageResult, FeedItem } from "../types";
import type { UpdateMyProfilePatch } from "./real";
import * as real from "./real";

export type { UpdateMyProfilePatch };

export const profileApi: {
  getMyProfile: () => Promise<ProfileModel>;
  getProfile: (memberUuid: string) => Promise<ProfileModel>;
  getArtistProfile: (memberUuid: string) => Promise<ProfileModel>;
  getUserProfile: (memberUuid: string) => Promise<ProfileModel>;

  getArtistFeed: (memberUuid: string, cursor?: string | null) => Promise<PageResult<FeedItem>>;
  getUserFeed: (memberUuid: string, cursor?: string | null) => Promise<PageResult<FeedItem>>;

  follow: (targetId: string) => Promise<void>;
  unfollow: (targetId: string) => Promise<void>;

  sendFanLetter: (artistUuid: string, content: string) => Promise<void>;
  updateMyProfile: (role: ProfileRole, patch: UpdateMyProfilePatch) => Promise<ProfileModel>;

  updateFeaturedBadges: (role: ProfileRole, profileId: string, badgeIds: string[]) => Promise<void>;
} = {
  getMyProfile: real.getMyProfile,
  getProfile: real.getProfile,
  getArtistProfile: real.getArtistProfile,
  getUserProfile: real.getUserProfile,

  getArtistFeed: real.getArtistFeed,
  getUserFeed: real.getUserFeed,

  follow: real.follow,
  unfollow: real.unfollow,

  sendFanLetter: real.sendFanLetter,
  updateMyProfile: real.updateMyProfile,

  updateFeaturedBadges: real.updateFeaturedBadges,
};
