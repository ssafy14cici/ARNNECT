export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type MountIntroOptions = {
  uiMount?: HTMLElement; // ✅ intro UI를 여기에 붙임
  lockWobbleY?: boolean;   // ✅ true면 위아래 흔들림 막음
  wobbleYBias?: number;    // ✅ 위아래 고정값(커서 아래 느낌)
  glbUrl: string;
  doorName: string;
  holdMs?: number;
  prefetchUrl?: string;

  startPose?: CameraPose;
  onReady?: (pose: CameraPose) => void;
  onEntered: () => void;

  hdriUrl?: string;

  exposure?: number; // default 0.75
  envIntensity?: number; // default 0.65
  lightIntensity?: number; // default 0.85

  skipLoading?: boolean;

  /**
   * 프레이밍 스케일:
   * - 1.0 = 기본
   * - >1.0 = 더 크게(가까이)
   * - <1.0 = 더 작게(멀리) => 레퍼런스(여백 큰 레이아웃)에 유리
   */
  framingScale?: number; // default 1.0

  /** 히어로 오버레이 위로 더 많은 여백을 강제(0~0.75 권장) */
  topWhitespaceRatio?: number;

  /** safe-area 패딩(px) */
  safeAreaPadPx?: number; // default 16

  /** 하단 여백 비율 */
  bottomSafeRatio?: number; // default 0.02

  /** 기본 카메라 거리 배수(작을수록 가까이=크게) */
  distanceFactor?: number; // default 0.4

  /** focus bbox outlier 필터 강도 */
  focusBoxOutlierFactor?: number; // default 8

  /**
   * 높은 건물일 때 레퍼런스처럼 "하단 띠"만 보이게 하는 클립(0~1)
   * 예) 0.48 => bbox 하단 48%만 프레이밍 기준으로 사용
   */
  focusYClip?: number;
};

export type IntroRuntime = {
  dispose: () => void;
  setPose: (pose: CameraPose, duration?: number) => void;
};
