// src/exhibition/mount.ts
// ✅ Vite 번들에 CSS 포함 (public로 옮기기 전까지는 이 방식이 정답)
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
type ViewMode = "ROOM" | "FOCUS";
type CamT = { txPx: number; tyPx: number; tzPx: number; rxDeg: number; ryDeg: number };

// ✅ 여기 값만 바꾸면 “참고사이트 1:1 포커스” 튜닝 가능
const PRESET: Record<Side, { ryDeg: number; tzPx: number; shift: number }> = {
  back: { ryDeg: 180, tzPx: 1240, shift: 0.68 },
  left: { ryDeg: -92, tzPx: 980, shift: 0.60 },
  right: { ryDeg: 92, tzPx: 980, shift: 0.60 },
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function mountExhibition(root: HTMLElement, opts: ExhibitionOptions): ExhibitionApi {
  const styleId = "exh-override-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .exh-root{ position: fixed; inset: 0; z-index: 9999; display: none; }
      .exh-root.is-visible{ display: block; }

      /* Layering */
      .exh-root .container{ position:absolute; inset:0; z-index:1; pointer-events:auto; }
      /* ✅ content is full-screen overlay -> must NOT eat clicks */
      .exh-root .content{ position:absolute; inset:0; z-index:10; pointer-events:none !important; }

      .exh-root .exh-camera{
        position:absolute; inset:0;
        transform-style:preserve-3d;
        will-change:transform;
        transition:transform 760ms cubic-bezier(.18,.9,.2,1);
        pointer-events:auto;
      }
      .exh-root.is-focus .exh-camera{
        transition:transform 720ms cubic-bezier(.18,.9,.2,1);
      }

      /* overlays */
      .exh-root .overlay{ pointer-events:none !important; }
      .exh-root .overlay.overlay--open{ pointer-events:auto !important; }

      /* hide big slide texts */
      .exh-root .slides{ display:none !important; }
      .exh-root .location{ display:none !important; }

      /* ✅ re-enable only interactive UI */
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

      /* Artworks clickable */
      .exh-root .scroller,
      .exh-root .room,
      .exh-root .room__side,
      .exh-root .room__img{
        pointer-events:auto !important;
      }
      .exh-root .room__img{ cursor: pointer; }

      /* reduce transform blur a bit */
      .exh-root .room__img{
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        will-change: transform;
      }
    `;
    document.head.appendChild(style);
  }

  const exh = el("div", "exh-root");
  root.appendChild(exh);

  // SVG symbols (원본 유지)
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

  // 3D container/scroller
  const container = el("div", "container");
  const scroller = el("div", "scroller");
  const cameraWrap = el("div", "exh-camera");
  cameraWrap.appendChild(scroller);
  container.appendChild(cameraWrap);
  exh.appendChild(container);

  // UI content (overlay)
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
    <div class="subject">モダンアート</div>
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
        <li class="menu__item"><a class="menu__link" href="#">Discover</a></li>
        <li class="menu__item"><a class="menu__link" href="#">Visit us</a></li>
        <li class="menu__item"><a class="menu__link" href="#">Shop</a></li>
      </ul>
    </div>
    <div class="overlay overlay--info">
      <p class="info">&ldquo;Life in Pieces&rdquo; ...</p>
    </div>
  `;
  content.appendChild(header);

  const location = el("h4", "location");
  content.appendChild(location);

  const slides = el("div", "slides");
  content.appendChild(slides);

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

  let rooms: RoomSet[] = [];
  let index = 0;
  let viewMode: ViewMode = "ROOM";
  let pointerX = 0;
  let pointerY = 0;

  let focusedKey: string | null = null;
  let focusTarget: CamT = { txPx: 0, tyPx: 0, tzPx: 0, rxDeg: 0, ryDeg: 0 };

  // ✅ FIX: tz sign (Codrops는 "장면을 음수 Z로 밀어야" 줌이 걸림)
  function applyCam(t: CamT) {
    cameraWrap.style.transform =
      `translate3d(${t.txPx}px, ${t.tyPx}px, ${-t.tzPx}px) rotateX(${t.rxDeg}deg) rotateY(${t.ryDeg}deg)`;
    // ❌ scroller에 같은 transform을 주면 codrops transform과 충돌/상쇄될 수 있음
    // scroller.style.transform = cameraWrap.style.transform;
  }

  function scheduleCameraUpdate() {
    requestAnimationFrame(() => {
      if (!exh.classList.contains("is-visible")) return;

      if (viewMode === "FOCUS") {
        applyCam(focusTarget);
        return;
      }

      const ry = clamp(pointerX * 8, -10, 10);
      const rx = clamp(-pointerY * 5, -8, 8);
      applyCam({ txPx: 0, tyPx: 0, tzPx: 0, rxDeg: rx, ryDeg: ry });
    });
  }

  function computeFocusTarget(side: Side, imgEl: HTMLImageElement): CamT {
    const preset = PRESET[side];
    const r = imgEl.getBoundingClientRect();

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = window.innerWidth / 2 - cx;
    const dy = window.innerHeight / 2 - cy;

    return {
      txPx: dx * preset.shift,
      tyPx: dy * preset.shift,
      tzPx: preset.tzPx,
      rxDeg: 0,
      ryDeg: preset.ryDeg,
    };
  }

  function enterFocus(side: Side, src: string, imgEl: HTMLImageElement) {
    overlayInfo.classList.remove("overlay--open");
    overlayMenu.classList.remove("overlay--open");
    btnInfo.classList.remove("btn--active");
    btnMenu.classList.remove("btn--active");

    viewMode = "FOCUS";
    exh.classList.add("is-focus");

    focusTarget = computeFocusTarget(side, imgEl);
    focusedKey = `${side}:${src}`;

    // ✅ 확인용 로그 (focusTarget이 제대로 계산되는지)
    console.log("[FOCUS]", side, focusTarget);

    scheduleCameraUpdate();
  }

  function exitFocus() {
    if (viewMode !== "FOCUS") return;
    viewMode = "ROOM";
    exh.classList.remove("is-focus");
    focusedKey = null;
    focusTarget = { txPx: 0, tyPx: 0, tzPx: 0, rxDeg: 0, ryDeg: 0 };
    scheduleCameraUpdate();
  }

  function renderCurrentRoom() {
    scroller.innerHTML = "";
    focusedKey = null;
    viewMode = "ROOM";
    exh.classList.remove("is-focus");

    const room = rooms[index];
    if (!room) return;

    subjectEl.textContent = room.subject ?? "モダンアート";
    location.textContent = room.location ?? "";

    const renderImgs = (side: Side, arr: string[]) =>
      arr
        .map(
          (src) =>
            `<img class="room__img" decoding="async" loading="eager" data-side="${side}" data-src="${src}" src="${src}" alt="image" />`
        )
        .join("");

    const roomEl = el("div", "room room--current");
    roomEl.innerHTML = `
      <div class="room__side room__side--back">${renderImgs("back", room.back)}</div>
      <div class="room__side room__side--left">${renderImgs("left", room.left)}</div>
      <div class="room__side room__side--right">${renderImgs("right", room.right)}</div>
      <div class="room__side room__side--bottom"></div>
    `;
    scroller.appendChild(roomEl);

    scheduleCameraUpdate();
  }

  function go(delta: number) {
    if (!rooms.length) return;
    if (viewMode === "FOCUS") return;
    index = (index + delta + rooms.length) % rooms.length;
    renderCurrentRoom();
  }

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  function handleBackOrExit(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (viewMode === "FOCUS") {
      exitFocus();
      return;
    }
    opts.onExit();
  }
  backLink.addEventListener("click", handleBackOrExit);
  exitLink.addEventListener("click", handleBackOrExit);

  function onPointerMove(e: PointerEvent) {
    if (!exh.classList.contains("is-visible")) return;

    // cursor
    const elAtPoint = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const img = elAtPoint?.closest?.("img.room__img") as HTMLImageElement | null;
    exh.style.cursor = img ? "pointer" : "";

    if (viewMode !== "ROOM") return;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    pointerX = (e.clientX / w) * 2 - 1;
    pointerY = (e.clientY / h) * 2 - 1;
    scheduleCameraUpdate();
  }
  exh.addEventListener("pointermove", onPointerMove, { passive: true });

  // ✅ click: 1클릭=focus, focus 상태에서 같은 이미지 2클릭=디테일 콜백
  function onClickCapture(e: MouseEvent) {
    if (!exh.classList.contains("is-visible")) return;

    console.log("[exh click]", e.clientX, e.clientY);

    const elAtPoint = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const img = elAtPoint?.closest?.("img.room__img") as HTMLImageElement | null;
    if (!img) return;

    e.preventDefault();
    e.stopPropagation();

    const side = (img.dataset.side as Side) || "back";
    const src = img.dataset.src || img.getAttribute("src") || "";
    if (!src) return;

    const key = `${side}:${src}`;

    // 2nd click -> detail
    if (viewMode === "FOCUS" && focusedKey === key) {
      opts.onOpenArtwork?.({ roomIndex: index, side, src });
      return;
    }

    // 1st click -> focus
    enterFocus(side, src, img);
  }
  exh.addEventListener("click", onClickCapture, true);

  window.addEventListener("keydown", (e) => {
    if (!exh.classList.contains("is-visible")) return;

    if (e.key === "Escape") {
      if (viewMode === "FOCUS") exitFocus();
      else opts.onExit();
      return;
    }

    if (viewMode !== "ROOM") return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  function setRooms(nextRooms: RoomSet[]) {
    rooms = nextRooms.slice(0);
    index = 0;
    renderCurrentRoom();
  }

  setRooms(opts.defaultRooms);

  function show() {
    exh.classList.add("is-visible");
    exh.style.cursor = "";
    scheduleCameraUpdate();
  }

  function hide() {
    exh.classList.remove("is-visible");
    exh.classList.remove("is-focus");
    viewMode = "ROOM";
    focusedKey = null;
    exh.style.cursor = "";

    overlayInfo.classList.remove("overlay--open");
    overlayMenu.classList.remove("overlay--open");
    btnInfo.classList.remove("btn--active");
    btnMenu.classList.remove("btn--active");

    applyCam({ txPx: 0, tyPx: 0, tzPx: 0, rxDeg: 0, ryDeg: 0 });
  }

  return { show, hide, setRooms };
}
