export type BlindArtwork = {
  id: string;
  imageUrl: string;
  tags: string[]; // 로컬 분석용(추후 AI 태그로 교체)
};

const tagPools = [
  ["minimal", "mono", "calm"],
  ["bold", "contrast", "energy"],
  ["organic", "warm", "soft"],
  ["geometric", "cold", "sharp"],
  ["classic", "detail", "story"],
  ["abstract", "free", "texture"],
];

export const mockArtworks: BlindArtwork[] = Array.from({ length: 24 }).map((_, i) => {
  const tags = tagPools[i % tagPools.length];
  return {
    id: `a${i + 1}`,
    imageUrl: `https://picsum.photos/seed/blind-${i + 1}/900/1200`,
    tags,
  };
});
