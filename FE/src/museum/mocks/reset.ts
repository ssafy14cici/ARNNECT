// src/mocks/reset.ts
const KEYS = [
  "comet_mock_users_v1",
  "arnnect_mock_artworks_v1",
  "arnnect_mock_reviews_v1",
  "arnnect_mock_exhibitions_v1",
  "arnnect_mock_exhibitions_order_v1",
  "arnnect_collectbook_v1",
  "arnnect_mock_follows_v1",
  "arnnect_mock_seeded_v1",
];

export function resetMockDB() {
  for (const k of KEYS) localStorage.removeItem(k);
}
