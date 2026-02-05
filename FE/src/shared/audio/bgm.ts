// FE/src/shared/audio/bgm.ts
// 전역 싱글톤 BGM — 페이지 전환(HomePC → Hall 등)에서도 끊김 없이 재생

function getAssetUrl(path: string) {
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

let audio: HTMLAudioElement | null = null;
let _on = true; // 기본 ON

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(getAssetUrl("bgm/intro.mp3"));
    audio.loop = true;
    audio.volume = 0.4;
  }
  return audio;
}

/** BGM 재생 시도 (브라우저 정책으로 막히면 조용히 실패) */
export function bgmPlay() {
  if (!_on) return;
  getAudio().play().catch(() => {});
}

/** BGM 정지 */
export function bgmPause() {
  audio?.pause();
}

/** 현재 ON/OFF 상태 */
export function bgmIsOn() {
  return _on;
}

/** ON/OFF 토글 → 새 상태를 반환 */
export function bgmToggle(): boolean {
  _on = !_on;
  if (_on) bgmPlay();
  else bgmPause();
  return _on;
}

/** 명시적 ON/OFF 세팅 */
export function bgmSetOn(on: boolean) {
  _on = on;
  if (on) bgmPlay();
  else bgmPause();
}

/**
 * 첫 유저 인터랙션에서 강제 재생 (autoplay policy 우회)
 * 컴포넌트 mount 시 1회 호출하면 됨.
 * 반환된 cleanup 함수를 unmount 시 호출.
 */
export function bgmForcePlayOnInteraction(): () => void {
  const handler = () => {
    bgmPlay();
    window.removeEventListener("click", handler);
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("click", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });

  // 즉시도 시도
  bgmPlay();

  return () => {
    window.removeEventListener("click", handler);
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("keydown", handler);
  };
}
