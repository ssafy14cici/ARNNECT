// FE/src/features/badge/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BadgeState {
  featured: string[]; // 대표 뱃지 ID 목록 (최대 3개)
  toggleFeatured: (id: string) => void;
  setFeatured: (ids: string[]) => void;
  clearFeatured: () => void;
}

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      featured: [],

      // 1. 뱃지 하나를 넣고 빼는 함수 (즉시 반영 시 사용)
      toggleFeatured: (id) => {
        const cur = get().featured;
        const has = cur.includes(id);

        if (has) {
          // 이미 있으면 제거
          set({ featured: cur.filter((x) => x !== id) });
        } else {
          // 없으면 추가 (3개 미만일 때만)
          if (cur.length >= 3) return;
          set({ featured: [...cur, id] });
        }
      },

      // 2. 뱃지 목록을 통째로 교체하는 함수 (모달 '저장' 버튼용)
      setFeatured: (ids) => {
        // 혹시 모를 오버플로우 방지 (앞에서 3개만 자름)
        set({ featured: ids.slice(0, 3) });
      },

      // 3. 전체 초기화 함수
      clearFeatured: () => set({ featured: [] }),
    }),
    {
      name: "arnnect_badges_v1", // LocalStorage에 저장될 키 이름
    }
  )
);