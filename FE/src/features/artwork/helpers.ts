// FE/src/features/artwork/helpers.ts

export type Comment = {
  id: string;
  parentId: string | null;
  content: string;

  authorId?: string;
  authorName?: string;
  createdAt?: string; // ISO
};

/**
 * ✅ data/artworks 가 보통 `as const`라서 readonly임
 * 그래서 base 타입도 readonly로 받아야 타입캐스팅 문제가 줄어듦
 */
export type ArtworkBase = {
  readonly id: string | number;
  readonly src: string;

  // 더미 데이터에서 자주 쓰는 필드들(선택)
  readonly title?: string;
  readonly artist?: string;
  readonly artistName?: string;

  // ✅ 팬레터/팔로우용으로 "작가 uuid"가 실API 붙으면 들어올 가능성 큼
  readonly artistId?: string; // memberUuid 등
  readonly artistMemberUuid?: string;

  readonly description?: string;
  readonly tags?: readonly string[];

  // 기타 필드들이 있어도 막히지 않도록
  readonly [key: string]: any;
};

export type ArtworkDetailData = ArtworkBase & {
  title: string;
  artist: string;
  description: string;
  tags: string[]; // UI에서 map 돌리기 편하게 최종은 mutable array
};

/** ✅ URL/피드에서 넘어오는 id를 작품 id 규칙으로 정규화 */
function normalizeArtworkId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  // /artworks/artwork-a1 같이 들어오는 케이스 방어
  // (review-는 여기서 들어오면 원래 잘못된 거지만, 그래도 제거해두면 안전)
  return s.replace(/^artwork-/, "").replace(/^review-/, "");
}

/** ✅ "a12" / "12" / 12 / "artwork-a12" → 12 로 통일 */
export function toArtworkNumericId(id: unknown): number | null {
  const normalizedRaw = normalizeArtworkId(id);

  if (typeof id === "number" && Number.isFinite(id)) return id;

  const s = normalizedRaw;
  if (!s) return null;

  // "a12" → "12"
  const normalized = s.startsWith("a") ? s.slice(1) : s;
  const n = parseInt(normalized, 10);
  if (Number.isNaN(n)) return null;

  // 기존 로직 호환: 1000 이상이면 -999 보정(유저가 넣어둔 규칙 유지)
  if (n >= 1000) return n - 999;

  return n;
}

export const getMockArtworkData = (baseArtwork: ArtworkBase): ArtworkDetailData => {
  // ✅ id가 "artwork-a1" 같이 들어와도 정상화
  const rawId = normalizeArtworkId(baseArtwork.id);
  const artworkNumber = String(rawId).replace(/^a/, "");

  const title = baseArtwork.title || `Garsington Opera Pavilion #${artworkNumber}`;

  const artist =
    baseArtwork.artist ||
    baseArtwork.artistName ||
    `ARTIST ${artworkNumber}`;

  const description =
    baseArtwork.description ||
    `이 작품은 현대 건축과 자연의 조화를 담아낸 독특한 시리즈입니다. 빛과 그림자의 대비, 공간의 흐름을 통해 관람객에게 새로운 시각적 경험을 선사합니다. 작가는 이 작품을 통해 인간과 환경의 관계를 탐구하며, 건축물이 단순한 구조물을 넘어 예술적 표현의 매개체가 될 수 있음을 보여줍니다.`;

  const tags = baseArtwork.tags ? [...baseArtwork.tags] : ["건축", "현대미술", "공간디자인", "빛과그림자"];

  return {
    ...baseArtwork,
    title,
    artist,
    description,
    tags,
  };
};

export const findArtworkById = (list: readonly ArtworkBase[], id?: string) => {
  const normalized = normalizeArtworkId(id);
  if (!normalized) return null;

  const urlId = String(normalized);

  return (
    list.find((item) => {
      const itemId = String(normalizeArtworkId(item.id));

      // 1) 문자열 직접 매칭: "a1" vs "a1", "1" vs "a1" 등 허용
      if (
        itemId === urlId ||
        itemId === `a${urlId}` ||
        itemId.replace(/^a/, "") === urlId.replace(/^a/, "")
      ) {
        return true;
      }

      // 2) 숫자 규칙 매칭: 1000 이상 보정 규칙 포함
      const numericUrlId = parseInt(urlId.replace(/^a/, ""), 10);
      const numericItemId = parseInt(itemId.replace(/^a/, ""), 10);

      if (Number.isNaN(numericUrlId) || Number.isNaN(numericItemId)) return false;

      if (numericUrlId >= 1000) {
        const expectedItemId = numericUrlId - 999;
        return numericItemId === expectedItemId;
      }

      return false;
    }) || null
  );
};
