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

export type ExhibitionOptions = {
  defaultRooms: RoomSet[];
  onExit: () => void;
};

export type ExhibitionApi = {
  show(): void;
  hide(): void;
  setRooms(rooms: RoomSet[]): void;
};

const CODROPS_NORMALIZE = "https://tympanus.net/Development/Exhibition/css/normalize.css";
const CODROPS_DEMO = "https://tympanus.net/Development/Exhibition/css/demo.css";
const JOSEFIN = "https://fonts.googleapis.com/css?family=Josefin+Sans:400,700";

function ensureLink(href: string) {
  const id = "exh-link-" + btoa(href).replace(/=+/g, "");
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function mountExhibition(root: HTMLElement, opts: ExhibitionOptions): ExhibitionApi {
  ensureLink(JOSEFIN);
  ensureLink(CODROPS_NORMALIZE);
  ensureLink(CODROPS_DEMO);

  // ✅ scoped helpers only (avoid breaking your outside background)
  const scopedStyleId = "exh-scoped-style";
  if (!document.getElementById(scopedStyleId)) {
    const style = document.createElement("style");
    style.id = scopedStyleId;
    style.textContent = `
/* ===== Exhibition root visibility (scoped) ===== */
.exh-root{
  position: fixed;
  inset: 0;
  z-index: 999;
  display: none;
}
.exh-root.is-visible{ display:block; }

/* We add 2 rigs to avoid overriding Codrops transforms */
.exh-moveRig, .exh-cameraRig{
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}
.exh-moveRig{ will-change: transform; }
.exh-cameraRig{ will-change: transform; }

/* Lightbox (only on click) */
.exh-lightbox{
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: none;
  place-items: center;
  background: rgba(0,0,0,0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.exh-lightbox.is-open{ display:grid; }
.exh-lightbox__img{
  max-width: min(92vw, 1100px);
  max-height: 88vh;
  border-radius: 10px;
  box-shadow: 0 30px 120px rgba(0,0,0,0.45);
}
.exh-lightbox__hint{
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", Arial;
  font-size: 12px;
  letter-spacing: .06em;
  color: rgba(255,255,255,0.82);
}
    `.trim();
    document.head.appendChild(style);
  }

  const exh = el("div", "exh-root");
  root.appendChild(exh);

  // SVG symbols (icons)
  const svgWrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgWrap.setAttribute("class", "hidden");
  svgWrap.innerHTML = `
    <symbol id="icon-arrow" viewBox="0 0 24 24">
      <polygon points="6.3,12.8 20.9,12.8 20.9,11.2 6.3,11.2 10.2,7.2 9,6 3.1,12 9,18 10.2,16.8 "/>
    </symbol>
    <symbol id="icon-drop" viewBox="0 0 24 24">
      <path d="M12,21c-3.6,0-6.6-3-6.6-6.6C5.4,11,10.8,4,11.4,3.2C11.6,3.1,11.8,3,12,3s0.4,0.1,0.6,0.3c0.6,0.8,6.1,7.8,6.1,11.2C18.6,18.1,15.6,21,12,21zM12,4.8c-1.8,2.4-5.2,7.4-5.2,9.6c0,2.9,2.3,5.2,5.2,5.2s5.2-2.3,5.2-5.2C17.2,12.2,13.8,7.3,12,4.8z"/><path d="M12,18.2c-0.4,0-0.7-0.3-0.7-0.7s0.3-0.7,0.7-0.7c1.3,0,2.4-1.1,2.4-2.4c0-0.4,0.3-0.7,0.7-0.7c0.4,0,0.7,0.3,0.7,0.7C15.8,16.5,14.1,18.2,12,18.2z"/>
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

  // container / scroller
  const container = el("div", "container");

  // ✅ two rigs so we can add camera/parallax without breaking Codrops transforms
  const moveRig = el("div", "exh-moveRig");
  const cameraRig = el("div", "exh-cameraRig");

  const scroller = el("div", "scroller");
  cameraRig.appendChild(scroller);
  moveRig.appendChild(cameraRig);
  container.appendChild(moveRig);
  exh.appendChild(container);

  // content
  const content = el("div", "content");
  exh.appendChild(content);

  // loader overlay (Codrops class)
  const loaderOverlay = el("div", "overlay overlay--loader overlay--active");
  loaderOverlay.innerHTML = `<div class="loader"><div></div><div></div><div></div></div>`;
  exh.appendChild(loaderOverlay);

  // Lightbox for image click zoom
  const lightbox = el("div", "exh-lightbox");
  const lightboxImg = el("img", "exh-lightbox__img") as HTMLImageElement;
  const lightboxHint = el("div", "exh-lightbox__hint");
  lightboxHint.textContent = "Click anywhere to close · Esc to close";
  lightbox.appendChild(lightboxImg);
  lightbox.appendChild(lightboxHint);
  exh.appendChild(lightbox);

  function openLightbox(src: string) {
    lightboxImg.src = src;
    lightbox.classList.add("is-open");
  }
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightboxImg.src = "";
  }
  lightbox.addEventListener("click", closeLightbox);

  // Build header+slides+nav
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
      <p class="info">&ldquo;Life in Pieces&rdquo; is the subject of all exhibitions taking place in the Mirai Art Gallery in 2017. Fragments of lost memories, fleeting moments and the breaking apart of human nature are this year's highlighted topics.</p>
    </div>
  `;
  content.appendChild(header);

  const location = el("h4", "location");
  location.textContent = "Mirai Art Gallery & Exhibition Center, Sapporo, Japan";
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

  backLink.addEventListener("click", (e) => {
    e.preventDefault();
    opts.onExit();
  });
  exitLink.addEventListener("click", (e) => {
    e.preventDefault();
    opts.onExit();
  });

  function toggleOverlay(which: "info" | "menu") {
    if (which === "info") {
      overlayInfo.classList.toggle("overlay--open");
      btnInfo.classList.toggle("btn--active");
      // close other
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
  let locked = false;

  /* ======================================================
   * Cursor-based camera/parallax (only affects cameraRig)
   * ====================================================== */
  let pointerX = 0;
  let pointerY = 0;
  let targetRx = 0;
  let targetRy = 0;
  let targetZ = 0;

  let curRx = 0;
  let curRy = 0;
  let curZ = 0;

  // tune (do not affect CSS files)
  const CAM = {
    maxRotX: 3.2, // deg
    maxRotY: 7.0, // deg
    maxZ: 140, // px
    lerp: 0.08,
  };

  function onPointerMove(e: PointerEvent) {
    if (!exh.classList.contains("is-visible")) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    // normalized to [-1..1]
    pointerX = (e.clientX / w) * 2 - 1;
    pointerY = (e.clientY / h) * 2 - 1;

    targetRy = clamp(pointerX, -1, 1) * CAM.maxRotY;
    targetRx = clamp(-pointerY, -1, 1) * CAM.maxRotX;
    // small "lean in" when near center
    const centerPull = 1 - Math.min(1, Math.sqrt(pointerX * pointerX + pointerY * pointerY));
    targetZ = centerPull * CAM.maxZ;
  }

  function applyCameraRig() {
    // smooth
    curRx += (targetRx - curRx) * CAM.lerp;
    curRy += (targetRy - curRy) * CAM.lerp;
    curZ += (targetZ - curZ) * CAM.lerp;

    cameraRig.style.transform = `translateZ(${curZ.toFixed(1)}px) rotateX(${curRx.toFixed(
      2
    )}deg) rotateY(${curRy.toFixed(2)}deg)`;
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });

  /* ======================================================
   * Room rendering
   * ====================================================== */
  function clearRooms() {
    scroller.innerHTML = "";
    slides.innerHTML = "";
  }

  function renderRooms() {
    clearRooms();

    rooms.forEach((room, i) => {
      const roomEl = el("div", "room" + (i === index ? " room--current" : ""));
      roomEl.innerHTML = `
        <div class="room__side room__side--back">
          ${room.back.map((src) => `<img class="room__img" src="${src}" alt="image" />`).join("")}
        </div>
        <div class="room__side room__side--left">
          ${room.left.map((src) => `<img class="room__img" src="${src}" alt="image" />`).join("")}
        </div>
        <div class="room__side room__side--right">
          ${room.right.map((src) => `<img class="room__img" src="${src}" alt="image" />`).join("")}
        </div>
        <div class="room__side room__side--bottom"></div>
      `;
      scroller.appendChild(roomEl);

      const slide = el("div", "slide");
      slide.innerHTML = `
        <h2 class="slide__name">${room.slide.nameLines[0]} <br/>${room.slide.nameLines[1]}</h2>
        <h3 class="slide__title">
          <span>&ldquo;${room.slide.title}&rdquo;</span>
          <div class="slide__number">Room <strong>${room.slide.roomLabel}</strong></div>
        </h3>
        <p class="slide__date">${room.slide.date}</p>
      `;
      slides.appendChild(slide);
    });

    applyRoomState();
  }

  function applyRoomState() {
    const roomEls = Array.from(scroller.querySelectorAll(".room"));
    roomEls.forEach((r, i) => r.classList.toggle("room--current", i === index));

    const slideEls = Array.from(slides.querySelectorAll(".slide"));
    slideEls.forEach((s, i) => s.classList.toggle("slide--current", i === index));

    const room = rooms[index];
    if (room?.subject) subjectEl.textContent = room.subject;
    if (room?.location) location.textContent = room.location;
  }

  /* ======================================================
   * Navigation motion (more depth / acceleration)
   * - animate moveRig only (does not conflict with Codrops transforms)
   * ====================================================== */
  function animateGo(direction: -1 | 1) {
    // direction: -1 = left, 1 = right (meaning index change)
    // quick, no delays
    const x = direction === 1 ? -28 : 28;

    // cancel existing by setting style
    moveRig.getAnimations().forEach((a) => a.cancel());

    // keyframes (corridor-like push)
    // keep it short to feel snappy
    const anim = moveRig.animate(
      [
        { transform: "translate3d(0px,0px,0px)", offset: 0 },
        { transform: `translate3d(${x}px, 0px, 90px)`, offset: 0.35 },
        { transform: `translate3d(${x * 0.6}px, 0px, 40px)`, offset: 0.65 },
        { transform: "translate3d(0px,0px,0px)", offset: 1 },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.2,.9,.2,1)",
      }
    );

    return anim;
  }

  function go(delta: number) {
    if (!rooms.length) return;
    if (locked) return;
    locked = true;

    // close lightbox if open
    if (lightbox.classList.contains("is-open")) closeLightbox();

    const dir = delta > 0 ? (1 as const) : (-1 as const);
    animateGo(dir);

    // switch index immediately (no delay)
    index = (index + delta + rooms.length) % rooms.length;
    applyRoomState();

    // loader off quickly (no delay)
    loaderOverlay.classList.remove("overlay--active");

    // unlock quickly after motion peak
    window.setTimeout(() => {
      locked = false;
    }, 220);
  }

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  /* ======================================================
   * Image click -> zoom (event delegation)
   * ====================================================== */
  scroller.addEventListener("click", (e) => {
    if (!exh.classList.contains("is-visible")) return;
    const t = e.target as HTMLElement | null;
    if (!t) return;
    if (t.classList.contains("room__img") && t instanceof HTMLImageElement) {
      openLightbox(t.currentSrc || t.src);
    }
  });

  /* ======================================================
   * Keyboard
   * ====================================================== */
  window.addEventListener("keydown", (e) => {
    if (!exh.classList.contains("is-visible")) return;

    if (e.key === "Escape") {
      if (lightbox.classList.contains("is-open")) {
        closeLightbox();
        return;
      }
      opts.onExit();
      return;
    }

    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  function setRooms(nextRooms: RoomSet[]) {
    rooms = nextRooms.slice(0);
    index = 0;
    renderRooms();
    loaderOverlay.classList.remove("overlay--active");
  }

  // init
  setRooms(opts.defaultRooms);

  /* ======================================================
   * RAF loop for cameraRig only
   * ====================================================== */
  let rafId = 0;
  function raf() {
    if (exh.classList.contains("is-visible")) {
      applyCameraRig();
    }
    rafId = requestAnimationFrame(raf);
  }
  raf();

  function show() {
    exh.classList.add("is-visible");
  }

  function hide() {
    exh.classList.remove("is-visible");

    // close overlays
    overlayInfo.classList.remove("overlay--open");
    overlayMenu.classList.remove("overlay--open");
    btnInfo.classList.remove("btn--active");
    btnMenu.classList.remove("btn--active");

    // close lightbox
    closeLightbox();
  }

  // cleanup note:
  // (this module likely lives for app lifetime; if you need hard cleanup later, add removeEventListener + cancelAnimationFrame)

  return { show, hide, setRooms };
}
