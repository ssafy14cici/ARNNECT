import type { BadgeStats } from "./types";

export function computeEarnedBadgeIds(stats: BadgeStats): string[] {
  const earned: string[] = [];

  // review
  if (stats.reviewCount >= 1) earned.push("review_lv1");
  if (stats.reviewCount >= 5) earned.push("review_lv2");
  if (stats.reviewCount >= 20) earned.push("review_lv3");

  // ticket
  if (stats.ticketCount >= 1) earned.push("ticket_lv1");
  if (stats.ticketCount >= 5) earned.push("ticket_lv2");
  if (stats.ticketCount >= 20) earned.push("ticket_lv3");

  // social
  if (stats.followerCount >= 1) earned.push("social_lv1");
  if (stats.followerCount >= 10) earned.push("social_lv2");
  if (stats.followerCount >= 50) earned.push("social_lv3");

  return earned;
}
