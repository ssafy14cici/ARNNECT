//FE/src/features/badge/data.ts

import type { BadgeDef } from "../../features/badge/types";

export const BADGES: BadgeDef[] = [
  // review
  {
    id: "review_lv1",
    name: "첫 리뷰",
    description: "리뷰 1개 달성",
    domain: "review",
    level: 1,
  },
  {
    id: "review_lv2",
    name: "리뷰러",
    description: "리뷰 5개 달성",
    domain: "review",
    level: 2,
  },
  {
    id: "review_lv3",
    name: "리뷰 마스터",
    description: "리뷰 20개 달성",
    domain: "review",
    level: 3,
  },

  // ticket
  {
    id: "ticket_lv1",
    name: "첫 티켓",
    description: "티켓 1개 수집",
    domain: "ticket",
    level: 1,
  },
  {
    id: "ticket_lv2",
    name: "컬렉터",
    description: "티켓 5개 수집",
    domain: "ticket",
    level: 2,
  },
  {
    id: "ticket_lv3",
    name: "슈퍼 컬렉터",
    description: "티켓 20개 수집",
    domain: "ticket",
    level: 3,
  },

  // 좋아요 변경예정
  {
    id: "social_lv1",
    name: "첫 팔로워",
    description: "팔로워 1명 달성",
    domain: "social",
    level: 1,
  },
  {
    id: "social_lv2",
    name: "인기 유저",
    description: "팔로워 10명 달성",
    domain: "social",
    level: 2,
  },
  {
    id: "social_lv3",
    name: "인플루언서",
    description: "팔로워 50명 달성",
    domain: "social",
    level: 3,
  },
];
