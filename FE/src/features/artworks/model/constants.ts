// FE/src/features/artworks/model/constants.ts
export const FIXED_FIELD_ID = 1 as const;

export const GENRE_OPTIONS = [
  { id: 1, en: "none", ko: "자유" },
  { id: 2, en: "abstract", ko: "추상화" },
  { id: 3, en: "drawings", ko: "드로잉 / 스케치" },
  { id: 4, en: "figurative", ko: "인물화" },
  { id: 5, en: "illustration", ko: "일러스트레이션" },
  { id: 6, en: "landscape", ko: "풍경화" },
  { id: 7, en: "mythology", ko: "신화화" },
  { id: 8, en: "plants-animals", ko: "꽃·새·동물화" },
  { id: 9, en: "posters", ko: "포스터" },
  { id: 10, en: "religion", ko: "종교화" },
  { id: 11, en: "still-life", ko: "정물화" },
] as const;
