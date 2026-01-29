// src/mocks/seed.ts
import { lsGet, lsSet, uid } from "./storage";

// ✅ 지금 프로젝트에서 이미 쓰는 키들(가능하면 그대로 사용)
const KEY_USERS = "comet_mock_users_v1";                 // auth
const KEY_ARTWORKS = "arnnect_mock_artworks_v1";         // posts/api.ts에서 사용(위에서 만든 것)
const KEY_REVIEWS = "arnnect_mock_reviews_v1";           // posts/api.ts에서 사용(위에서 만든 것)
const KEY_EXHIBITIONS_MAP = "arnnect_mock_exhibitions_v1";// tickets/api.ts
const KEY_EXHIBITIONS_ORDER = "arnnect_mock_exhibitions_order_v1";
const KEY_COLLECTBOOK = "arnnect_collectbook_v1";        // collectbook/storage.ts
const KEY_FOLLOWS = "arnnect_mock_follows_v1";            // 새로 추가(팔로우)
const KEY_SEEDED = "arnnect_mock_seeded_v1";              // ✅ seed 완료 플래그

type UserRole = "USER" | "ARTIST";

// auth StoredUser와 맞추기
type StoredUser = {
  memberUuid: string;
  name: string;
  displayName?: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
};

// 작품/리뷰는 posts/api.ts에 맞춰주면 제일 깔끔
type StoredArtwork = {
  id: string;
  authorId: string;
  authorName: string;
  role: "ARTIST";
  title: string;
  description: string;
  field: string;
  genre: string;
  productionDate: number;
  size: string;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
  likes: number;
  views: number;
};

type StoredReview = {
  id: string;
  authorId: string;
  authorName: string;
  role: "USER" | "ARTIST";
  title: string;
  content: string;
  artworkId: number;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
  likes: number;
  views: number;
};

type StoredExhibition = {
  _version: 1;
  ticket_code: string;
  exhibition_id: string;
  title: string;
  place: string;
  startDate: string;
  endDate: string;
  feeType: "free" | "paid";
  price?: number;
  durationMinutes?: number;
  posterUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

// collectbook/types.ts의 CollectBookItem 구조에 맞추기(네 storage.ts 기준)
type CollectBookItem = {
  id: string;
  ticketCode: string;
  exhibition: {
    title?: string;
    place?: string;
    startDate?: string;
    endDate?: string;
    posterUrl?: string;
    description?: string;
  };
  memo?: string;
  visitedAt: string;
  visibility: "private" | "public";
  scannedAt: string;
  // ✅ “누구 티켓북인지”를 전체목업에서 구분하고 싶으면 권장
  ownerId?: string; // memberUuid
};

type FollowEdge = { from: string; to: string; createdAt: string };

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

export function seedMockDB() {
  const already = lsGet(KEY_SEEDED, false);
  if (already) return;

  const now = new Date().toISOString();

  // 1) 기본 계정
  const baseUsers: StoredUser[] = [
    {
      memberUuid: "mock-user-0001",
      name: "유저",
      email: "user@test.com",
      password: "123456789",
      role: "USER",
      createdAt: now,
    },
    {
      memberUuid: "mock-artist-0001",
      name: "아티스트",
      displayName: "artist",
      email: "artist@test.com",
      password: "123456789",
      role: "ARTIST",
      createdAt: now,
    },
  ];

  // auth seed: 기존 값 있으면 유지 + 없으면 추가
  const users = lsGet<StoredUser[]>(KEY_USERS, []);
  const nextUsers = [...users];

  for (const u of baseUsers) {
    const exists = nextUsers.some((x) => x.email.toLowerCase() === u.email.toLowerCase());
    if (!exists) nextUsers.unshift(u);
  }
  lsSet(KEY_USERS, nextUsers);

  // 2) 작품(artist가 만든 작품 4개)
  const artworks = lsGet<StoredArtwork[]>(KEY_ARTWORKS, []);
  if (artworks.length === 0) {
    const a: StoredArtwork[] = Array.from({ length: 4 }).map((_, i) => ({
      id: uid("art"),
      authorId: "mock-artist-0001",
      authorName: "테스트예술가",
      role: "ARTIST",
      title: `Mock Artwork ${i + 1}`,
      description: "로컬 목업 작품 설명입니다.",
      field: "Art",
      genre: i % 2 === 0 ? "Painting" : "Digital",
      productionDate: 2023 + (i % 2),
      size: "50x70",
      imageUrl: `/art/a${i + 1}.jpg`,
      tags: ["mock", "arnnect", i % 2 === 0 ? "classic" : "modern"],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      likes: 0,
      views: 0,
    }));
    lsSet(KEY_ARTWORKS, a);
  }

  // 3) 리뷰(유저가 작품에 남긴 리뷰 3개)
  const reviews = lsGet<StoredReview[]>(KEY_REVIEWS, []);
  if (reviews.length === 0) {
    // artworkId는 number를 쓰고 있으니 “순서 기반”으로 매핑
    const arts = lsGet<StoredArtwork[]>(KEY_ARTWORKS, []);
    const r: StoredReview[] = Array.from({ length: 3 }).map((_, i) => ({
      id: uid("rev"),
      authorId: "mock-user-0001",
      authorName: "테스트유저",
      role: "USER",
      title: `Mock Review ${i + 1}`,
      content: "로컬 목업 감상평입니다.",
      artworkId: i + 1, // ✅ 네 앱의 artworkId 정책에 맞춰 필요시 교체
      imageUrl: arts[i]?.imageUrl,
      tags: ["review", "mock"],
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      likes: 0,
      views: 0,
    }));
    lsSet(KEY_REVIEWS, r);
  }

  // 4) 전시/티켓(ticket_code) 1개 발급
  const map = lsGet<Record<string, StoredExhibition>>(KEY_EXHIBITIONS_MAP, {});
  const order = lsGet<string[]>(KEY_EXHIBITIONS_ORDER, []);

  if (Object.keys(map).length === 0) {
    const ticket_code = `EXH_${uid("code")}`;
    const ex: StoredExhibition = {
      _version: 1,
      ticket_code,
      exhibition_id: uid("exh"),
      title: "Mock Exhibition",
      place: "Seoul",
      startDate: todayYMD(),
      endDate: todayYMD(),
      feeType: "free",
      posterUrl: "/art/a5.jpg",
      description: "목업 전시입니다.",
      createdAt: now,
      updatedAt: now,
    };
    map[ticket_code] = ex;
    lsSet(KEY_EXHIBITIONS_MAP, map);
    lsSet(KEY_EXHIBITIONS_ORDER, [ticket_code, ...order.filter((c) => c !== ticket_code)]);

    // 5) 티켓북에 “등록된 상태”까지 바로 만들기(유저 관점 데모)
    const cb = lsGet<CollectBookItem[]>(KEY_COLLECTBOOK, []);
    if (cb.length === 0) {
      const item: CollectBookItem = {
        id: uid("cb"),
        ticketCode: ticket_code,
        exhibition: {
          title: ex.title,
          place: ex.place,
          startDate: ex.startDate,
          endDate: ex.endDate,
          posterUrl: ex.posterUrl,
          description: ex.description,
        },
        memo: "첫 방문!",
        visitedAt: todayYMD(),
        visibility: "private",
        scannedAt: now,
        ownerId: "mock-user-0001",
      };
      lsSet(KEY_COLLECTBOOK, [item]);
    }
  }

  // 6) 팔로우(유저 → 작가)
  const follows = lsGet<FollowEdge[]>(KEY_FOLLOWS, []);
  if (follows.length === 0) {
    lsSet(KEY_FOLLOWS, [
      { from: "mock-user-0001", to: "mock-artist-0001", createdAt: now },
    ]);
  }

  // ✅ seed 완료 마킹
  lsSet(KEY_SEEDED, true);
}
