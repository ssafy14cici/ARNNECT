// src/exhibition/event-handlers.ts

import type { Side, OpenArtworkPayload, RoomSet } from "./types";
import { isReceptionRoom, killEvent } from "./utils";

export interface EventHandlerDeps {
  exh: HTMLElement;
  scroller: HTMLElement;
  getCurrentRoom: () => RoomSet | undefined;
  getCurrentIndex: () => number;
  openDetail: (payload: OpenArtworkPayload) => void;
  openReception: () => void;
  onOpenArtwork?: (payload: OpenArtworkPayload) => void;
}

/**
 * 이벤트 핸들러 생성
 */
export function createEventHandlers(deps: EventHandlerDeps) {
  const { exh, scroller, getCurrentRoom, getCurrentIndex, openDetail, openReception, onOpenArtwork } = deps;

  /**
   * 포인트에서 이미지 엘리먼트 찾기
   */
  function getImgFromPoint(x: number, y: number): HTMLImageElement | null {
    const stack = document.elementsFromPoint(x, y) as HTMLElement[];
    for (const n of stack) {
      const frame = n?.closest?.(".room__frame") as HTMLElement | null;
      if (frame) {
        const img = frame.querySelector("img.room__img") as HTMLImageElement | null;
        if (img) return img;
      }
      const img = n?.closest?.("img.room__img") as HTMLImageElement | null;
      if (img) return img;
      if (n.closest?.(".codrops-header") || n.closest?.(".nav") || n.closest?.(".overlay.overlay--open")) return null;
    }
    return null;
  }

  /**
   * 허용된 UI 타겟인지 확인
   */
  function isAllowedUiTarget(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    if (!el) return false;

    return !!el.closest?.(
      [
        ".codrops-icon--drop",
        ".codrops-icon--prev",
        ".btn--nav-left",
        ".btn--nav-right",
        ".btn--info",
        ".btn--menu",
        ".overlay.overlay--open",
        ".overlay.overlay--open *",
        ".exh-detailBackdrop",
        ".exh-detailBackdrop *",
        ".exh-receptionBackdrop",
        ".exh-receptionBackdrop *",
      ].join(",")
    );
  }

  /**
   * 이벤트 차단
   */
  function shield(e: Event): void {
    if (!exh.classList.contains("is-visible")) return;

    const target = e.target as HTMLElement | null;
    const insideExh = !!target?.closest?.(".exh-root");
    if (!insideExh) return;

    if (isAllowedUiTarget(target)) return;
    killEvent(e);
  }

  /**
   * 포인터 이동 핸들러
   */
  function onPointerMove(e: PointerEvent): void {
    if (!exh.classList.contains("is-visible")) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest?.(".reception-desk")) {
      exh.style.cursor = "pointer";
      return;
    }

    const img = getImgFromPoint(e.clientX, e.clientY);
    exh.style.cursor = img ? "pointer" : "";
  }

  /**
   * 포인터 다운 캡처 핸들러
   */
  function onPointerDownCapture(e: PointerEvent): void {
    shield(e);

    if (!exh.classList.contains("is-visible")) return;
    const target = e.target as HTMLElement | null;
    const insideExh = !!target?.closest?.(".exh-root");
    if (!insideExh) return;
    if (isAllowedUiTarget(target)) return;

    // ✅ 데스크 클릭
    if (target?.closest?.(".reception-desk")) {
      openReception();
      return;
    }

    // ✅ 작품 클릭
    const img = getImgFromPoint(e.clientX, e.clientY);
    if (!img) return;

    const side = (img.dataset.side as Side) || "back";
    const src = img.dataset.src || img.getAttribute("src") || "";
    if (!src) return;

    const payload: OpenArtworkPayload = { roomIndex: getCurrentIndex(), side, src };
    if (onOpenArtwork) onOpenArtwork(payload);
    else openDetail(payload);
  }

  /**
   * 마우스 움직임에 따른 룸 흔들림 효과 (parallax wobble)
   * 리셉션 룸은 제외
   */
  function onMouseMoveWobble(e: MouseEvent): void {
    if (!exh.classList.contains("is-visible")) return;

    const roomEl = scroller.querySelector<HTMLElement>(".room--current");
    if (!roomEl) return;

    const currentRoom = getCurrentRoom();
    const currentIndex = getCurrentIndex();

    if (isReceptionRoom(currentRoom, currentIndex)) {
      // ✅ 리셉션은 흔들림 완전 제거(transition도 제거해서 잔상 방지)
      roomEl.style.transition = "";
      roomEl.style.transform = "";
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const offsetX = (e.clientX - centerX) / centerX;
    const offsetY = (e.clientY - centerY) / centerY;

    // ✅ 각도 제한 (외부가 보이지 않도록 최소화)
    const maxRotateY = 1.2; // 좌우 흔들림 최소화
    const maxRotateX = 0.8; // 상하 흔들림 최소화

    const rotateY = offsetX * maxRotateY;
    const rotateX = -offsetY * maxRotateX;

    roomEl.style.transition = "transform 0.3s ease-out";
    roomEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  /**
   * 전역 이벤트 리스너 등록
   */
  function registerGlobalListeners(): void {
    window.addEventListener("pointerdown", onPointerDownCapture, true);
    window.addEventListener("pointerup", shield, true);
    window.addEventListener("click", shield, true);
    window.addEventListener("mousedown", shield, true);
    window.addEventListener("mouseup", shield, true);
    window.addEventListener("touchstart", shield, { capture: true, passive: false } as any);
    window.addEventListener("touchend", shield, { capture: true, passive: false } as any);
    window.addEventListener("contextmenu", shield, true);
  }

  return {
    onPointerMove,
    onMouseMoveWobble,
    registerGlobalListeners,
  };
}
