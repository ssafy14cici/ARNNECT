// src/exhibition/mount.ts
import "./css/normalize.css";
import "./css/demo.css";

export type RoomSet = {
  back: string[];
  left: string[];
  right: string[];
  slide: {
    nameLines: [string, string];
    title: string;
    roomLabel: string;
    date: string;
  };
  subject?: string;
  location?: string;
};

export type OpenArtworkPayload = {
  roomIndex: number;
  side: "back" | "left" | "right";
  src: string;
};

export type ExhibitionOptions = {
  defaultRooms: RoomSet[];
  onExit: () => void;
  onOpenArtwork?: (payload: OpenArtworkPayload) => void;
};

export type ExhibitionApi = {
  show(): void;
  hide(): void;
  setRooms(rooms: RoomSet[]): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

type Side = "back" | "left" | "right";

export function mountExhibition(root: HTMLElement, opts: ExhibitionOptions): ExhibitionApi {
  // =========================================================
  // 0) CSS override: 전시장 레이어가 클릭을 확실히 "먹게" 만들기
  // =========================================================
  const styleId = "exh-override-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .exh-root{
        position: fixed; inset: 0;
        z-index: 2147483647;
        display:none;
        pointer-events:auto;
      }
      .exh-root.is-visible{ display:block; }

      /* content overlay가 클릭을 먹지 않게 */
      .exh-root .content{ pointer-events:none !important; }

      /* overlay는 열렸을 때만 클릭 */
      .exh-root .overlay{ pointer-events:none !important; }
      .exh-root .overlay.overlay--open{ pointer-events:auto !important; }

      /* 버튼류만 클릭 */
      .exh-root .codrops-header,
      .exh-root .codrops-links,
      .exh-root .codrops-icon,
      .exh-root .btn,
      .exh-root .nav,
      .exh-root .btn--nav,
      .exh-root .btn--toggle,
      .exh-root .overlay.overlay--open,
      .exh-root .overlay.overlay--open *{
        pointer-events:auto !important;
      }

      /* ✅ 핵심: room / side / img는 무조건 클릭 가능 */
      .exh-root .room,
      .exh-root .room__side,
      .exh-root img.room__img{
        pointer-events:auto !important;
      }
      .exh-root img.room__img{ cursor:pointer; }

      /* ✅ 임시 디테일 모달 */
      .exh-detailBackdrop{
        position: fixed; inset:0;
        display:none;
        align-items:center; justify-content:center;
        background: rgba(0,0,0,0.55);
        z-index: 2147483647;
        pointer-events:auto;
      }
      .exh-detailBackdrop.is-open{ display:flex; }
      .exh-detailCard{
        width: min(920px, 92vw);
        height: min(680px, 86vh);
        background: #111;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        overflow:hidden;
        display:flex;
        flex-direction:column;
      }
      .exh-detailTop{
        padding: 12px 14px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        color:#fff;
        font-size: 14px;
        border-bottom: 1px solid rgba(255,255,255,0.12);
      }
      .exh-detailActions{
        display:flex;
        gap: 8px;
        align-items:center;
      }
      .exh-detailBody{
        flex:1;
        display:flex;
        align-items:center;
        justify-content:center;
        padding: 14px;
      }
      .exh-detailImg{
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 10px;
      }
      .exh-miniBtn{
        background: rgba(255,255,255,0.10);
        color:#fff;
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 10px;
        padding: 8px 12px;
        cursor:pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .exh-miniBtn:hover{
        background: rgba(255,255,255,0.16);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .exh-detailGoPage{
        background: linear-gradient(135deg, #5a9a48, #4a8a38);
        border: 1px solid rgba(255,255,255,0.25);
        font-weight: 600;
      }
      .exh-detailGoPage:hover{
        background: linear-gradient(135deg, #6db84d, #5a9a48);
        box-shadow: 0 6px 16px rgba(90, 154, 72, 0.4);
      }
    `;
    document.head.appendChild(style);
  }

  // =========================================================
  // 1) Root
  // =========================================================
  const exh = el("div", "exh-root");
  root.appendChild(exh);

  // SVG symbols
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

  const btnInfo = header.querySelector<HTMLButtonElement>(".btn--info")!;
  const btnMenu = header.querySelector<HTMLButtonElement>(".btn--menu")!;
  const overlayInfo = header.querySelector<HTMLDivElement>(".overlay--info")!;
  const overlayMenu = header.querySelector<HTMLDivElement>(".overlay--menu")!;
  const subjectEl = header.querySelector<HTMLDivElement>(".subject")!;
  const exitLink = header.querySelector<HTMLAnchorElement>(".codrops-icon--drop")!;
  const backLink = header.querySelector<HTMLAnchorElement>(".codrops-icon--prev")!;
  const prevBtn = nav.querySelector<HTMLButtonElement>(".btn--nav-left")!;
  const nextBtn = nav.querySelector<HTMLButtonElement>(".btn--nav-right")!;

  function toggleOverlay(which: "info" | "menu") {
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

  // =========================================================
  // 2) Rooms render
  // =========================================================
  let rooms: RoomSet[] = [];
  let index = 0;

  function renderCurrentRoom() {
    scroller.innerHTML = "";
    const room = rooms[index];
    if (!room) return;

    subjectEl.textContent = room.subject ?? `room${index + 1}`;

    const renderImgs = (side: Side, arr: string[]) =>
      arr
        .map(
          (src) =>
            `<img class="room__img" decoding="async" loading="eager" data-side="${side}" data-src="${src}" src="${src}" alt="image" draggable="false" />`
        )
        .join("");

    // ✅ 룸별 클래스 추가 (room--room1, room--room2)
    const roomClass = `room room--current room--${room.subject || `room${index + 1}`}`;
    const roomEl = el("div", roomClass);
    roomEl.innerHTML = `
      <div class="room__side room__side--back">${renderImgs("back", room.back)}</div>
      <div class="room__side room__side--left">${renderImgs("left", room.left)}</div>
      <div class="room__side room__side--right">${renderImgs("right", room.right)}</div>
      <div class="room__side room__side--bottom"></div>
      <div class="room__side room__side--top"></div>
    `;
    scroller.appendChild(roomEl);
  }

  function go(delta: number) {
    if (!rooms.length) return;
    index = (index + delta + rooms.length) % rooms.length;
    renderCurrentRoom();
  }
  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  // =========================================================
  // 3) Exit (ONLY buttons)
  // =========================================================
  function handleBackOrExit(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    opts.onExit();
  }
  backLink.addEventListener("click", handleBackOrExit);
  exitLink.addEventListener("click", handleBackOrExit);

  // =========================================================
  // 4) Detail modal (라우팅 대신 내부 모달)
  // =========================================================
  // ✅ 라우터 연결 가이드:
  //    - onOpenArtwork 콜백이 제공되면 내부 모달 대신 외부 라우팅 사용
  //    - scene/index.ts에서 onOpenArtwork 콜백으로 history.pushState 호출
  //    - main.ts의 라우터가 /artwork 경로를 감지하여 ArtworkDetail 페이지 렌더링
  //    - 콜백이 없으면 아래 내부 모달 사용 (fallback)

  const detailBackdrop = el("div", "exh-detailBackdrop");
  detailBackdrop.innerHTML = `
    <div class="exh-detailCard" role="dialog" aria-modal="true">
      <div class="exh-detailTop">
        <div class="exh-detailMeta"></div>
        <div class="exh-detailActions">
          <button class="exh-miniBtn exh-detailGoPage" type="button">작품 상세 페이지로 가기</button>
          <button class="exh-miniBtn exh-detailClose" type="button">Close</button>
        </div>
      </div>
      <div class="exh-detailBody">
        <img class="exh-detailImg" alt="artwork" />
      </div>
    </div>
  `;
  exh.appendChild(detailBackdrop);

  const detailMeta = detailBackdrop.querySelector<HTMLDivElement>(".exh-detailMeta")!;
  const detailImg = detailBackdrop.querySelector<HTMLImageElement>(".exh-detailImg")!;
  const detailClose = detailBackdrop.querySelector<HTMLButtonElement>(".exh-detailClose")!;
  const detailGoPage = detailBackdrop.querySelector<HTMLButtonElement>(".exh-detailGoPage")!;

  function openDetail(payload: OpenArtworkPayload) {
    detailMeta.textContent = `room: ${payload.roomIndex + 1} / side: ${payload.side}`;
    detailImg.src = payload.src;
    detailBackdrop.classList.add("is-open");
  }
  function closeDetail() {
    detailBackdrop.classList.remove("is-open");
    // src 비우기(메모리/플리커 방지)
    detailImg.src = "";
  }

  detailBackdrop.addEventListener("pointerdown", (e) => {
    // 바깥 클릭 시 닫기
    if (e.target === detailBackdrop) closeDetail();
  });
  detailClose.addEventListener("click", closeDetail);

  // ✅ 작품 상세 페이지로 가기 버튼 (나중에 라우팅 연결)
  detailGoPage.addEventListener("click", () => {
    const src = detailImg.src;
    const meta = detailMeta.textContent || "";
    console.log("📄 작품 상세 페이지로 이동:", { src, meta });
    // TODO: 실제 라우팅 로직 연결 (예: history.pushState + popstate 이벤트)
    // 예시: window.location.href = `/artwork-detail?src=${encodeURIComponent(src)}`;
  });

  function isAllowedUiTarget(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    if (!el) return false;

    // 전시장 UI 버튼/링크는 동작해야 함
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
      ].join(",")
    );
  }

  function killEvent(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    // ✅ 다른 캡처 리스너까지 차단
    // (TS에서 Event에 없을 수 있으니 any로)
    (e as any).stopImmediatePropagation?.();
  }

  // =========================================================
  // 5) 클릭/포인터 처리 (전파 차단 + img 탐색)
  // =========================================================
  function getImgFromPoint(x: number, y: number): HTMLImageElement | null {
    const stack = document.elementsFromPoint(x, y) as HTMLElement[];
    for (const n of stack) {
      const img = n?.closest?.("img.room__img") as HTMLImageElement | null;
      if (img) return img;
      // 버튼/헤더 위면 즉시 중단(이미지 클릭이 아님)
      if (n.closest?.(".codrops-header") || n.closest?.(".nav") || n.closest?.(".overlay.overlay--open")) return null;
    }
    return null;
  }

  function onPointerMove(e: PointerEvent) {
    if (!exh.classList.contains("is-visible")) return;
    const img = getImgFromPoint(e.clientX, e.clientY);
    exh.style.cursor = img ? "pointer" : "";
  }

  // ✅ 가장 중요: 전시장 열렸을 때, 전시장 내부 클릭은 무조건 "먹어서" 외부로 전파 안 되게
  function onWindowPointerDownCapture(e: PointerEvent) {
    if (!exh.classList.contains("is-visible")) return;

    // detail 모달 열린 상태면 모달 처리만
    if (detailBackdrop.classList.contains("is-open")) {
      // 모달 자체가 처리하므로 여기서는 전파만 차단
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const target = e.target as HTMLElement | null;
    const insideExh = !!target?.closest?.(".exh-root");
    if (!insideExh) return;

    // 전시장 내부면 일단 전파 차단(Three/UI로 안 내려가게)
    e.preventDefault();
    e.stopPropagation();

    // 이미지면 디테일 오픈
    const img = getImgFromPoint(e.clientX, e.clientY);
    if (!img) return;

    const side = (img.dataset.side as Side) || "back";
    const src = img.dataset.src || img.getAttribute("src") || "";
    if (!src) return;

    const payload: OpenArtworkPayload = { roomIndex: index, side, src };

    // 콜백도 살려둠(원하면 외부에서 연결)
    opts.onOpenArtwork?.(payload);

    // 지금은 무조건 내부 임시 디테일 모달
    openDetail(payload);
  }

  exh.addEventListener("pointermove", onPointerMove, { passive: true });
  function shield(e: Event) {
  if (!exh.classList.contains("is-visible")) return;

  const target = e.target as HTMLElement | null;
  const insideExh = !!target?.closest?.(".exh-root");
  if (!insideExh) return;

  // 전시장 UI 버튼은 통과
  if (isAllowedUiTarget(target)) return;

  // ✅ 전시장 내부 클릭/터치는 전부 먹어서 바깥(Three/기존 UI)로 절대 안 내려가게
  killEvent(e);
}

function onPointerDownCapture(e: PointerEvent) {
  shield(e);

  // shield가 먹었는데도, 이미지면 디테일 열기 또는 삭제
  if (!exh.classList.contains("is-visible")) return;

  const target = e.target as HTMLElement | null;
  const insideExh = !!target?.closest?.(".exh-root");
  if (!insideExh) return;
  if (isAllowedUiTarget(target)) return;

  const img = getImgFromPoint(e.clientX, e.clientY);
  if (!img) return;

  const side = (img.dataset.side as Side) || "back";
  const src = img.dataset.src || img.getAttribute("src") || "";
  if (!src) return;

  const payload: OpenArtworkPayload = { roomIndex: index, side, src };

  // ✅ onOpenArtwork 콜백이 있으면 외부 라우팅 사용 (내부 모달 열지 않음)
  if (opts.onOpenArtwork) {
    opts.onOpenArtwork(payload);
  } else {
    // 콜백이 없으면 내부 모달 사용 (fallback)
    openDetail(payload);
  }
}

// ✅ 전역 캡처 실드: pointer/mouse/touch/click 전부
window.addEventListener("pointerdown", onPointerDownCapture, true);
window.addEventListener("pointerup", shield, true);
window.addEventListener("click", shield, true);
window.addEventListener("mousedown", shield, true);
window.addEventListener("mouseup", shield, true);
window.addEventListener("touchstart", shield, { capture: true, passive: false } as any);
window.addEventListener("touchend", shield, { capture: true, passive: false } as any);
window.addEventListener("contextmenu", shield, true);


  // =========================================================
  // 6) Rooms API
  // =========================================================
  function setRooms(nextRooms: RoomSet[]) {
    rooms = nextRooms.slice(0);
    index = 0;
    renderCurrentRoom();
  }
  setRooms(opts.defaultRooms);

  // ✅ #ui 레이어가 덮는 경우가 있어 전시장 show 때 pointer-events off
  const uiLayer = document.getElementById("ui") as HTMLElement | null;
  const uiPrev = { pointerEvents: "" };

  function disableUiLayer() {
    if (!uiLayer) return;
    uiPrev.pointerEvents = uiLayer.style.pointerEvents;
    uiLayer.style.pointerEvents = "none";
  }
  function restoreUiLayer() {
    if (!uiLayer) return;
    uiLayer.style.pointerEvents = uiPrev.pointerEvents;
  }

  function show() {
    disableUiLayer();
    exh.classList.add("is-visible");
    exh.style.cursor = "";
  }

  function hide() {
    exh.classList.remove("is-visible");
    exh.style.cursor = "";
    overlayInfo.classList.remove("overlay--open");
    overlayMenu.classList.remove("overlay--open");
    btnInfo.classList.remove("btn--active");
    btnMenu.classList.remove("btn--active");
    closeDetail();
    restoreUiLayer();

    // ✅ 이벤트 리스너를 제거하지 않음
    // shield와 onPointerDownCapture에서 is-visible 체크로 이미 필터링됨
    // 이벤트 리스너를 제거하면 재진입 시 클릭이 안 먹힘
  }

  return { show, hide, setRooms };
}
