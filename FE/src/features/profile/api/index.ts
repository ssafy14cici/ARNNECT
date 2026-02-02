// FE/src/features/profile/api/index.ts
import type { ProfileRole } from "../types";
import * as mock from "./mock";
import * as real from "./real";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

export const profileApi = {
  getMyProfile: () => (USE_MOCK ? mock.getMyProfile() : real.getMyProfile()),
  getArtistProfile: (id: string) => (USE_MOCK ? mock.getArtistProfile(id) : real.getArtistProfile(id)),
  getUserProfile: (id: string) => (USE_MOCK ? mock.getUserProfile(id) : real.getUserProfile(id)),

  getArtistFeed: (id: string, cursor?: string | null) =>
    (USE_MOCK ? mock.getArtistFeed(id, cursor) : real.getArtistFeed(id, cursor)),
  getUserFeed: (id: string, cursor?: string | null) =>
    (USE_MOCK ? mock.getUserFeed(id, cursor) : real.getUserFeed(id, cursor)),

  follow: (targetId: string) => (USE_MOCK ? mock.follow(targetId) : real.follow(targetId)),
  unfollow: (targetId: string) => (USE_MOCK ? mock.unfollow(targetId) : real.unfollow(targetId)),

  updateFeaturedBadges: (role: ProfileRole, profileId: string, badgeIds: string[]) =>
    (USE_MOCK ? mock.updateFeaturedBadges(role, profileId, badgeIds) : real.updateFeaturedBadges(role, profileId, badgeIds)),
};
