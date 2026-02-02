// src/features/feed/api/index.ts (스위치)

import { getFeedListMock } from "./mock";
import { getFeedListReal } from "./real";

const API_MODE = import.meta.env.VITE_API_MODE ?? (import.meta.env.DEV ? "mock" : "real");
// VITE_API_MODE=mock|real 추천

export const getFeedList = async () => {
  return API_MODE === "real" ? getFeedListReal() : getFeedListMock();
};
