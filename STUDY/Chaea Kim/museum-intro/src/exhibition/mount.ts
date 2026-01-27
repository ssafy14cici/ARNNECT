// src/exhibition/mount.ts
import "./css/normalize.css";
import "./css/demo.css";

import type { ExhibitionOptions, ExhibitionApi } from "./types";
import { createExhibitionStyles } from "./styles";
import { el } from "./utils";
import { createRoomRenderer } from "./room-renderer";
import { createDetailModal, createReceptionModal } from "./modals";
import { createEventHandlers } from "./event-handlers";

export * from "./types";

/**
 * 전시관 UI를 마운트합니다.
 */
export function mountExhibition(root: HTMLElement, opts: ExhibitionOptions): ExhibitionApi {
  // =========================================================
  // 1) CSS 스타일 주입
  // =========================================================
  const styleId = "exh-override-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = createExhibitionStyles();
    document.head.appendChild(style);
  }

  // =========================================================
  // 2) Root 엘리먼트 생성
  // =========================================================
  const exh = el("div", "exh-root");
  root.appendChild(exh);

  // SVG 아이콘
  const svgWrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgWrap.setAttribute("class", "hidden");
  svgWrap.innerHTML = `
    <symbol id="icon-arrow" viewBox="0 0 24 24">
      <polygon points="6.3,12.8 20.9,12.8 20.9,11.2 6.3,11.2 10.2,7.2 9,6 3.1,12 9,18 10.2,16.8 "/>
    </symbol>
    <symbol id="icon-drop" viewBox="0 0 24 24">
      <path d="M12,21c-3.6,0-6.6-3-6.6-6.6C5.4,11,10.8,4,11.4,3.2C11.6,3.1,11.8,3,12,3s0.4,0.1,0.6,0.3c0.6,0.8,6.1,7.8,6.1,11.2C18.6,18.1,15.6,21,12,21zM12,4.8c-1.8,2.4-5.2,7.4-5.2,9.6c0,2.9,2.3,5.2,5.2,5.2s5.2-2.3,5.2-5.2C17.2,12.2,13.8,7.3,12,4.8z"/>
      <path d="M12,18.2c-0.4,0-0.7-0.3-0.7-0.7s0.3-0.7,0.7-0.7c1.3,0,2.4-1.1,2.4-2.4c0-0.4,0.3-0.7,0.7-0.7c0.4,0,0.7,0.3,0.7,0.7C15.8,16.5,14.1,18.2,12,18.2z"/>
    </symbol>
    <symbol id="icon-menu" viewBox="0 0 24 24">
      <path d="M24,5.8H0v-2h24V5.8z M19.8,11H4.2v2h15.6V11z M24,18.2H0v2h24V18.2z"/>
    </symbol>
    <symbol id="icon-cross" viewBox="0 0 24 24">
      <path d="M13.4,12l7.8,7.8l-1.4,1.4l-7.8-7.8l-7.8,7.8l-1.4-1.4l7.8-7.8L2.7,4.2l1.4-1.4l7.8,7.8l7.8-7.8l1.4,1.4L13.4,12z"/>
    </symbol>
    <symbol id="icon-info" viewBox="0 0 20 20">
      <circle style="fill:#fff" cx="10" cy="10" r="9.1"/>
      <path d="M10,0C4.5,0,0,4.5,0,10s4.5,10,10,10s10-4.5,10-10S15.5,0,10,0z M10,18.6c-4.7,0-8.6-3.9-8.6-8.6S5.3,1.4,10,1.4s8.6,3.9,8.6,8.6S14.7,18.6,10,18.6z M10.7,5C10.9,5.2,11,5.5,11,5.7s-0.1,0.5-0.3,0.7c-0.2,0.2-0.4,0.3-0.7,0.3c-0.3,0-0.5-0.1-0.7-0.3C9.1,6.2,9,6,9,5.7S9.1,5.2,9.3,5C9.5,4.8,9.7,4.7,10,4.7C10.3,4.7,10.5,4.8,10.7,5z M9.3,8.3h1.4v7.2H9.3V8.3z"/>
    </symbol>
  `;
  exh.appendChild(svgWrap as any);

  // container/scroller
  const container = el("div", "container");
  const scroller = el("div", "scroller");
  container.appendChild(scroller);
  exh.appendChild(container);

  // UI content
  const content = el("div", "content");
  exh.appendChild(content);

  // Header
  const header = el("header", "codrops-header");
  header.innerHTML = `
    <div class="codrops-links">
      <a class="codrops-icon codrops-icon--prev" href="#" title="Back">
        <svg class="icon icon--arrow"><use xlink:href="#icon-arrow"></use></svg>
      </a>
      <a class="codrops-icon codrops-icon--drop" href="#" title="Exit">
        <svg class="icon icon--drop"><use xlink:href="#icon-drop"></use></svg>
      </a>
    </div>
    <h1 class="codrops-header__title">3D Room Exhibition</h1>
    <div class="subject">room</div>
    <button class="btn btn--info btn--toggle" type="button">
      <svg class="icon icon--info"><use xlink:href="#icon-info"></use></svg>
      <svg class="icon icon--cross"><use xlink:href="#icon-cross"></use></svg>
    </button>
    <button class="btn btn--menu btn--toggle" type="button">
      <svg class="icon icon--menu"><use xlink:href="#icon-menu"></use></svg>
      <svg class="icon icon--cross"><use xlink:href="#icon-cross"></use></svg>
    </button>
    <div class="overlay overlay--menu">
      <ul class="menu">
        <li class="menu__item menu__item--current"><a class="menu__link" href="#">Exhibitions</a></li>
      </ul>
    </div>
    <div class="overlay overlay--info">
      <p class="info">Temporary overlay</p>
    </div>
  `;
  content.appendChild(header);

  // Navigation
  const nav = el("nav", "nav");
  nav.innerHTML = `
    <button class="btn btn--nav btn--nav-left" type="button" aria-label="Prev room">
      <svg class="nav-icon nav-icon--left" width="42px" height="12px" viewBox="0 0 70 20">
        <path class="nav__triangle" d="M52.5,10L70,0v20L52.5,10z"/>
        <path class="nav__line" d="M55.1,11.4H0V8.6h55.1V11.4z"/>
      </svg>
    </button>
    <button class="btn btn--nav btn--nav-right" type="button" aria-label="Next room">
      <svg class="nav-icon nav-icon--right" width="42px" height="12px" viewBox="0 0 70 20">
        <path class="nav__triangle" d="M52.5,10L70,0v20L52.5,10z"/>
        <path class="nav__line" d="M55.1,11.4H0V8.6h55.1V11.4z"/>
      </svg>
    </button>
  `;
  content.appendChild(nav);

  // UI 요소들
  const btnInfo = header.querySelector<HTMLButtonElement>(".btn--info")!;
  const btnMenu = header.querySelector<HTMLButtonElement>(".btn--menu")!;
  const overlayInfo = header.querySelector<HTMLDivElement>(".overlay--info")!;
  const overlayMenu = header.querySelector<HTMLDivElement>(".overlay--menu")!;
  const subjectEl = header.querySelector<HTMLDivElement>(".subject")!;
  const exitLink = header.querySelector<HTMLAnchorElement>(".codrops-icon--drop")!;
  const backLink = header.querySelector<HTMLAnchorElement>(".codrops-icon--prev")!;
  const prevBtn = nav.querySelector<HTMLButtonElement>(".btn--nav-left")!;
  const nextBtn = nav.querySelector<HTMLButtonElement>(".btn--nav-right")!;

  // =========================================================
  // 3) 룸 렌더러 생성
  // =========================================================
  const roomRenderer = createRoomRenderer(scroller, subjectEl);
  roomRenderer.setRooms(opts.defaultRooms);

  // =========================================================
  // 4) 모달 생성
  // =========================================================
  const { openDetail, closeDetail } = createDetailModal(exh);
  const { openReception, closeReception } = createReceptionModal(exh);

  // =========================================================
  // 5) 이벤트 핸들러 생성
  // =========================================================
  const eventHandlers = createEventHandlers({
    exh,
    scroller,
    getCurrentRoom: roomRenderer.getCurrentRoom,
    getCurrentIndex: roomRenderer.getCurrentIndex,
    openDetail,
    openReception,
    onOpenArtwork: opts.onOpenArtwork,
  });

  // 이벤트 등록
  exh.addEventListener("pointermove", eventHandlers.onPointerMove, { passive: true });
  exh.addEventListener("mousemove", eventHandlers.onMouseMoveWobble, { passive: true });
  eventHandlers.registerGlobalListeners();

  // =========================================================
  // 6) UI 버튼 이벤트
  // =========================================================
  function toggleOverlay(which: "info" | "menu"): void {
    if (which === "info") {
      overlayInfo.classList.toggle("overlay--open");
      btnInfo.classList.toggle("btn--active");
      overlayMenu.classList.remove("overlay--open");
      btnMenu.classList.remove("btn--active");
    } else {
      overlayMenu.classList.toggle("overlay--open");
      btnMenu.classList.toggle("btn--active");
      overlayInfo.classList.remove("overlay--open");
      btnInfo.classList.remove("btn--active");
    }
  }

  btnInfo.addEventListener("click", () => toggleOverlay("info"));
  btnMenu.addEventListener("click", () => toggleOverlay("menu"));

  prevBtn.addEventListener("click", () => roomRenderer.go(-1));
  nextBtn.addEventListener("click", () => roomRenderer.go(1));

  // Exit
  function handleBackOrExit(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    opts.onExit();
  }
  backLink.addEventListener("click", handleBackOrExit);
  exitLink.addEventListener("click", handleBackOrExit);

  // =========================================================
  // 7) UI 레이어 제어
  // =========================================================
  const uiLayer = document.getElementById("ui") as HTMLElement | null;
  const uiPrev = { pointerEvents: "" };

  function disableUiLayer(): void {
    if (!uiLayer) return;
    uiPrev.pointerEvents = uiLayer.style.pointerEvents;
    uiLayer.style.pointerEvents = "none";
  }

  function restoreUiLayer(): void {
    if (!uiLayer) return;
    uiLayer.style.pointerEvents = uiPrev.pointerEvents;
  }

  // =========================================================
  // 8) Public API
  // =========================================================
  function show(): void {
    disableUiLayer();
    exh.classList.add("is-visible");
    exh.style.cursor = "";
  }

  function hide(): void {
    exh.classList.remove("is-visible");
    exh.style.cursor = "";
    overlayInfo.classList.remove("overlay--open");
    overlayMenu.classList.remove("overlay--open");
    btnInfo.classList.remove("btn--active");
    btnMenu.classList.remove("btn--active");
    closeDetail();
    closeReception();
    restoreUiLayer();
  }

  return {
    show,
    hide,
    setRooms: roomRenderer.setRooms,
  };
}
