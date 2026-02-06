import { create } from "zustand";

export type Selection = {
  round: number;

  // ✅ 백엔드가 주는 진짜 artworkId
  artworkId: number;

  // 기존 호환(필요 없으면 삭제 가능)
  selectedId: string;
  type: string; // 보통 genreName 넣으면 됨

  // optional meta
  genreId?: number;
  genreName?: string;
  tags?: string[];
};

export type ResultData = {
  mbti: string;
  title: string;
  tagline: string;
  description: string;
  strengths: string[];
  watchouts: string[];
  tip: string;

  // UI 배지용(원하면 제거 가능)
  keywords: string[];

  recommendArtist?: string;
};

type PreferenceState = {
  currentRoundIdx: number;
  selections: Selection[];
  resultData: ResultData | null;

  setRoundIdx: (idx: number) => void;
  addSelection: (sel: Selection) => void;
  setResultData: (data: ResultData | null) => void;
  reset: () => void;
};

export const usePreferenceStore = create<PreferenceState>((set) => ({
  currentRoundIdx: 0,
  selections: [],
  resultData: null,

  setRoundIdx: (idx) => set({ currentRoundIdx: idx }),
  addSelection: (sel) => set((s) => ({ selections: [...s.selections, sel] })),
  setResultData: (data) => set({ resultData: data }),
  reset: () => set({ currentRoundIdx: 0, selections: [], resultData: null }),
}));
