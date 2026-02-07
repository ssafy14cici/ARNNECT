// FE/src/features/badge/assets.ts
const ID_TO_NO: Record<string, number> = {
  review_lv1: 1, review_lv2: 2, review_lv3: 3,
  ticket_lv1: 4, ticket_lv2: 5, ticket_lv3: 6,
  social_lv1: 7, social_lv2: 8, social_lv3: 9,
};

export function badgeImageSrc(badgeId: string) {
  const no = ID_TO_NO[badgeId] ?? 1;
  // ✅ BASE_URL은 항상 끝에 "/"가 붙는 형태라, 앞에 "/" 안 붙이는게 안전
  return `${import.meta.env.BASE_URL}badges/badges${no}.png`;
}
