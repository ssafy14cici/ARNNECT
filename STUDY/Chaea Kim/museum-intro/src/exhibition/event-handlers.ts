// src/exhibition/event-handlers.ts
import type { OpenArtworkPayload } from "./types";

type Side = "back" | "left" | "right";

type CreateEventHandlersArgs = {
  exh: HTMLElement;
  scroller: HTMLElement;

  getCurrentRoom: () => any; // RoomSet 타입을 여기서 강제하지 않음(순환/경로 꼬임 방지)
  getCurrentIndex: () => number;

  openDetail: (payload: OpenArtworkPayload) => void;
  openReception: () => void;

  onOpenArtwork?: (payload: OpenArtworkPayload) => void;
};

export type ExhibitionEventHandlers = {
  onPointerMove: (e: PointerEvent) => void;

  // (wobble은 mount.ts에서 등록 안 하니까 굳이 안 만들어도 되지만,
  // 기존 코드가 호출할 수도 있어서 빈 함수로 제공)
  onMouseMoveWobble: (e: MouseEvent) => void;

  registerGlobalListeners: () => void;
  unregisterGlobalListeners: () => void;
};

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

      // ✅ 모달은 실드 통과
      ".exh-detailBackdrop",
      ".exh-detailBackdrop *",
      ".exh-receptionBackdrop",
      ".exh-receptionBackdrop *",
    ].join(",")
  );
}

function killEvent(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  (e as any).stopImmediatePropagation?.();
}

/**
 * 마우스 위치에서 작품 이미지 찾기
 */
function getImgFromPoint(x: number, y: number): HTMLImageElement | null {
  const stack = document.elementsFromPoint(x, y) as HTMLElement[];

  for (const n of stack) {
    // frame 안쪽을 먼저 우선
    const frame = n?.closest?.(".room__frame") as HTMLElement | null;
    if (frame) {
      const img = frame.querySelector("img.room__img") as HTMLImageElement | null;
      if (img) return img;
    }

    const img = n?.closest?.("img.room__img") as HTMLImageElement | null;
    if (img) return img;

    // UI 위에선 작품 판정 중단
    if (
      n.closest?.(".codrops-header") ||
      n.closest?.(".nav") ||
      n.closest?.(".overlay.overlay--open")
    ) {
      return null;
    }
  }

  return null;
}

/**
 * 전역 캡처 실드(바깥으로 이벤트 새는 것 방지)
 */
function shieldFactory(exh: HTMLElement) {
  return function shield(e: Event) {
    if (!exh.classList.contains("is-visible")) return;

    const target = e.target as HTMLElement | null;
    const insideExh = !!target?.closest?.(".exh-root");
    if (!insideExh) return;

    if (isAllowedUiTarget(target)) return;
    killEvent(e);
  };
}

/**
 * ✅ named export로 반드시 제공
 */
export function createEventHandlers(args: CreateEventHandlersArgs): ExhibitionEventHandlers {
  const { exh, scroller, getCurrentIndex, openDetail, openReception, onOpenArtwork } = args;

  const shield = shieldFactory(exh);

  function onPointerMove(e: PointerEvent) {
    if (!exh.classList.contains("is-visible")) return;

    const target = e.target as HTMLElement | null;

    // ✅ 리셉션 데스크 커서
    if (target?.closest?.(".reception-desk")) {
      exh.style.cursor = "pointer";
      return;
    }

    const img = getImgFromPoint(e.clientX, e.clientY);
    exh.style.cursor = img ? "pointer" : "";
  }

  // wobble 미사용: 안전하게 빈 함수 제공
  function onMouseMoveWobble(_: MouseEvent) {
    // intentionally empty
  }

  function onPointerDownCapture(e: PointerEvent) {
    shield(e);

    if (!exh.classList.contains("is-visible")) return;

    const target = e.target as HTMLElement | null;
    const insideExh = !!target?.closest?.(".exh-root");
    if (!insideExh) return;
    if (isAllowedUiTarget(target)) return;

    // ✅ 데스크 클릭 → 리셉션 모달
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

    const payload: OpenArtworkPayload = {
      roomIndex: getCurrentIndex(),
      side,
      src,
    };

    if (onOpenArtwork) onOpenArtwork(payload);
    else openDetail(payload);
  }

  // 전역 리스너 핸들 보관(해제 가능하게)
  const globalListeners: Array<() => void> = [];

  function addGlobal<K extends keyof WindowEventMap>(
    type: K,
    handler: (ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ) {
    window.addEventListener(type, handler as any, options as any);
    globalListeners.push(() => window.removeEventListener(type, handler as any, options as any));
  }

  function registerGlobalListeners() {
    // ✅ 캡처 실드
    addGlobal("pointerdown", onPointerDownCapture as any, true);
    addGlobal("pointerup", shield as any, true);
    addGlobal("click", shield as any, true);
    addGlobal("mousedown", shield as any, true);
    addGlobal("mouseup", shield as any, true);
    addGlobal("contextmenu", shield as any, true);

    // 터치에서 preventDefault 필요할 수 있어 passive:false
    addGlobal("touchstart", shield as any, { capture: true, passive: false } as any);
    addGlobal("touchend", shield as any, { capture: true, passive: false } as any);
  }

  function unregisterGlobalListeners() {
    while (globalListeners.length) {
      const off = globalListeners.pop();
      off?.();
    }
  }

  return {
    onPointerMove,
    onMouseMoveWobble,
    registerGlobalListeners,
    unregisterGlobalListeners,
  };
}
