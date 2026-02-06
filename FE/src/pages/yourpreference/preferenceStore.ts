import { create } from "zustand";

export type Selection = {
  round: number;
  selectedId: string;
  type: string;
};

export type ResultData = {
  mbti: string;
  title: string;
  desc: string;
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
