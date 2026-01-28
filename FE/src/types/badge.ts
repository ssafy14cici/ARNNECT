export type BadgeDomain = "review" | "ticket" | "social";

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  domain: BadgeDomain;
  level: 1 | 2 | 3;
};

export type BadgeStats = {
  reviewCount: number;
  ticketCount: number;
  followerCount: number;
};
