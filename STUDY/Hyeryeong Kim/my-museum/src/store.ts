import { create } from 'zustand';

// ★ 여기를 고쳤습니다.
// ? (물음표)는 있어도 되고 없어도 된다는 뜻입니다. (Optional)
export interface ArtData {
  id: number;
  title: string;
  desc: string;
  image: string;
  position?: [number, number, number]; // 렌더링용 (선택)
  rotation?: [number, number, number]; // 렌더링용 (선택)
  // ★ 카메라 이동용 좌표 추가 (필수 아님)
  cameraPos?: [number, number, number];
  targetPos?: [number, number, number];
}

export type ViewState = 'WALK' | 'FOCUS' | 'POPUP';

interface StoreState {
  viewState: ViewState;
  activeArt: ArtData | null;
  
  focusArt: (data: ArtData) => void;
  openPopup: () => void;
  closePopup: () => void;
  backToWalk: () => void;
}

export const useStore = create<StoreState>((set) => ({
  viewState: 'WALK',
  activeArt: null,

  focusArt: (data) => set({ viewState: 'FOCUS', activeArt: data }),
  openPopup: () => set({ viewState: 'POPUP' }),
  closePopup: () => set({ viewState: 'FOCUS' }),
  backToWalk: () => set({ viewState: 'WALK', activeArt: null }),
}));