import { create } from "zustand";
import { persist } from "zustand/middleware";

type BadgeState = {
  featured: string[]; // 대표 뱃지 id (최대 3개)
  toggleFeatured: (id: string) => void;
  setFeatured: (ids: string[]) => void;
  clearFeatured: () => void;
};

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      featured: [],
      setFeatured: (ids) => set({ featured: ids.slice(0, 3) }),
      clearFeatured: () => set({ featured: [] }),
      toggleFeatured: (id) => {
        const cur = get().featured;
        const has = cur.includes(id);

        if (has) {
          set({ featured: cur.filter((x) => x !== id) });
          return;
        }

        if (cur.length >= 3) return; // 3개 제한
        set({ featured: [...cur, id] });
      },
    }),
    { name: "arnnect_badges_v1" }
  )
);
