// src/exhibition/mount.ts
import "./css/normalize.css";
import "./css/demo.css";

import receptionDeskPng from "./img/desk_cat.png"; // ✅ desk_cat.png (1280x728)

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

function isReceptionRoom(room: RoomSet | undefined, idx: number) {
  if (!room) return false;
  return idx === 0 || room.subject === "reception" || room.subject === "room0";
}

export function mountExhibition(root: HTMLElement, opts: ExhibitionOptions): ExhibitionApi {
  // =========================================================
  // 0) CSS override
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

      /* content overlay가 클릭 먹지 않게 */
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

      /* ✅ room / side / frame / img는 클릭 가능 */
      .exh-root .room,
      .exh-root .room__side,
      .exh-root .room__frame,
      .exh-root img.room__img{
        pointer-events:auto !important;
      }
      .exh-root .room__frame{ cursor:pointer; }
      .exh-root img.room__img{ cursor:pointer; }

      /* =====================================================
       * ✅ Reception prop layer
       * ===================================================== */
      .exh-root .room{ position: relative; }
      .exh-root .reception-prop-layer{
        position:absolute;
        inset:0;
        pointer-events:none;
        z-index: 6;
      }

      /* =====================================================
       * ✅ 액자 Wrapper - 3D 프레임 두께감 시스템
       * ===================================================== */
      .exh-root .room__frame{
        flex: none;
        max-width: 50%;
        max-height: 70%;
        margin: 0 5%;
        transform: translate3d(0,0,100px);
        backface-visibility: hidden;
        position: relative;
        transform-style: preserve-3d;
        pointer-events: auto;
      }

      .exh-root .room__frame-side{
        position: absolute;
        backface-visibility: hidden;
      }

      /* ✅ 위쪽 측면 - 밝은 면 */
      .exh-root .room__frame-side--top{
        top: 0;
        left: 0;
        width: 100%;
        height: 19px; /* ✅ 38px → 19px (절반) */
        transform-origin: top center;
        transform: rotateX(90deg);
        background: linear-gradient(to bottom,
          #d4c4a8 0%,
          #c0ad88 40%,
          #b39d70 100%
        );
      }
      /* ✅ 오른쪽 측면 - 어두운 면 */
      .exh-root .room__frame-side--right{
        top: 0;
        right: 0;
        width: 19px; /* ✅ 38px → 19px (절반) */
        height: 100%;
        transform-origin: right center;
        transform: rotateY(90deg);
        background: linear-gradient(to right,
          #8b7544 0%,
          #7a6438 50%,
          #6d5a35 100%
        );
      }
      /* ✅ 아래쪽 측면 - 가장 어두운 면 */
      .exh-root .room__frame-side--bottom{
        bottom: 0;
        left: 0;
        width: 100%;
        height: 19px; /* ✅ 38px → 19px (절반) */
        transform-origin: bottom center;
        transform: rotateX(-90deg);
        background: linear-gradient(to top,
          #6d5a35 0%,
          #7a6438 40%,
          #8b7544 100%
        );
      }
      /* ✅ 왼쪽 측면 - 중간 밝기 */
      .exh-root .room__frame-side--left{
        top: 0;
        left: 0;
        width: 19px; /* ✅ 38px → 19px (절반) */
        height: 100%;
        transform-origin: left center;
        transform: rotateY(-90deg);
        background: linear-gradient(to left,
          #9e8655 0%,
          #8b7544 50%,
          #7a6438 100%
        );
      }

      /* =====================================================
       * ✅ Reception Desk Cat (1280x728)
       * - 바닥에 "붙어있는" 느낌: top 위치 + shadow + 약한 원근
       * - 과한 회전 제거(합성 티 줄임)
       * ===================================================== */
      .exh-root .reception-desk{
        position:absolute;
        left: 50%;
        top: 84%;
        width: 780px;
        max-width: 78vw;

        aspect-ratio: 1280 / 728; /* ✅ desk_cat.png 비율 고정 */
        height: auto;

        pointer-events:auto;
        border: 0;
        padding: 0;
        background: transparent;
        cursor: pointer;

        /* ✅ '바닥 접지'를 살리기 위해: translateY를 거의 안 쓰고,
           rotateX를 아주 약하게(바닥면과 평행한 느낌) */
        transform-origin: 50% 92%;
        transform:
          translate(-50%, -100%)
          perspective(1600px)
          rotateX(1.2deg)
          rotateY(-2.2deg)
          translateZ(10px);

        filter: none;
      }

      /* ✅ 접지 그림자(바닥에 붙어 보이게) */
      .exh-root .reception-desk::after{
        content:"";
        position:absolute;
        left: 50%;
        bottom: 6px;

        width: 72%;
        height: 18px;

        transform: translateX(-50%);
        background: rgba(0,0,0,0.20);
        filter: blur(12px);
        border-radius: 999px;

        pointer-events:none;
      }

      .exh-root .reception-desk img{
        width:100%;
        height:auto;
        display:block;
        user-select:none;
        -webkit-user-drag:none;

        /* ✅ 살짝만 공간 톤에 맞춤(과하면 인위적이니까 최소) */
        filter: saturate(0.98) brightness(1.01);
      }

      /* =====================================================
       * ✅ Cat wave (hover / first-enter)
       * ===================================================== */
      @keyframes catWave {
        0%   { transform: translate(-50%, -100%) perspective(1600px) rotateX(1.2deg) rotateY(-2.2deg) translateZ(10px) rotate(0deg); }
        20%  { transform: translate(-50%, -100%) perspective(1600px) rotateX(1.2deg) rotateY(-2.2deg) translateZ(10px) rotate(-1.6deg); }
        40%  { transform: translate(-50%, -100%) perspective(1600px) rotateX(1.2deg) rotateY(-2.2deg) translateZ(10px) rotate(1.6deg); }
        60%  { transform: translate(-50%, -100%) perspective(1600px) rotateX(1.2deg) rotateY(-2.2deg) translateZ(10px) rotate(-1.2deg); }
        80%  { transform: translate(-50%, -100%) perspective(1600px) rotateX(1.2deg) rotateY(-2.2deg) translateZ(10px) rotate(0.8deg); }
        100% { transform: translate(-50%, -100%) perspective(1600px) rotateX(1.2deg) rotateY(-2.2deg) translateZ(10px) rotate(0deg); }
      }
      .exh-root .reception-desk.wave{
        animation: catWave 1.2s ease-in-out;
      }

      /* =====================================================
       * ✅ Artwork Detail modal
       * ===================================================== */
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
      .exh-detailActions{ display:flex; gap: 8px; align-items:center; }
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

      /* =====================================================
       * ✅ Reception welcome modal
       * ===================================================== */
      .exh-receptionBackdrop{
        position: fixed; inset:0;
        display:none;
        align-items:center; justify-content:center;
        background: rgba(0,0,0,0.28);
        z-index: 2147483647;
        pointer-events:auto;
      }
      .exh-receptionBackdrop.is-open{ display:flex; }
      .exh-receptionCard{
        width: min(560px, 92vw);
        background:#1b1b1b;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        overflow:hidden;
      }
      .exh-receptionTop{
        padding: 14px 16px;
        color:#fff;
        font-size: 15px;
        font-weight: 700;
        border-bottom: 1px solid rgba(255,255,255,0.12);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap: 12px;
      }
      .exh-receptionBody{
        padding: 16px;
        color: rgba(255,255,255,0.88);
        font-size: 14px;
        line-height: 1.5;
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
            `<div class="room__frame">
              <img class="room__img" decoding="async" loading="eager" data-side="${side}" data-src="${src}" src="${src}" alt="image" draggable="false" />
              <div class="room__frame-side room__frame-side--top"></div>
              <div class="room__frame-side room__frame-side--right"></div>
              <div class="room__frame-side room__frame-side--bottom"></div>
              <div class="room__frame-side room__frame-side--left"></div>
            </div>`
        )
        .join("");

    const roomClass = `room room--current room--${room.subject || `room${index + 1}`}`;
    const roomEl = el("div", roomClass);

    roomEl.innerHTML = `
      <div class="room__side room__side--back">${renderImgs("back", room.back)}</div>
      <div class="room__side room__side--left">${renderImgs("left", room.left)}</div>
      <div class="room__side room__side--right">${renderImgs("right", room.right)}</div>
      <div class="room__side room__side--bottom"></div>
      <div class="room__side room__side--top"></div>
    `;

    // ✅ reception: overlay로 데스크(고양이) 추가
    if (isReceptionRoom(room, index)) {
      const layer = el("div", "reception-prop-layer");
      layer.innerHTML = `
        <button class="reception-desk" type="button" aria-label="Reception desk">
          <img src="${receptionDeskPng}" alt="Reception desk cat" draggable="false" />
        </button>
      `;
      roomEl.appendChild(layer);

      // ✅ 첫 진입 1회 웨이브 + hover 웨이브
      const deskBtn = layer.querySelector<HTMLButtonElement>(".reception-desk")!;
      // first wave
      requestAnimationFrame(() => {
        deskBtn.classList.remove("wave");
        void deskBtn.offsetWidth;
        deskBtn.classList.add("wave");
      });
      // hover wave
      deskBtn.addEventListener("mouseenter", () => {
        deskBtn.classList.remove("wave");
        void deskBtn.offsetWidth;
        deskBtn.classList.add("wave");
      });
    }

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
  // 3) Exit
  // =========================================================
  function handleBackOrExit(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    opts.onExit();
  }
  backLink.addEventListener("click", handleBackOrExit);
  exitLink.addEventListener("click", handleBackOrExit);

  // =========================================================
  // 4) Detail modal
  // =========================================================
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
    detailImg.src = "";
  }

  detailBackdrop.addEventListener("pointerdown", (e) => {
    if (e.target === detailBackdrop) closeDetail();
  });
  detailClose.addEventListener("click", closeDetail);
  detailGoPage.addEventListener("click", () => {
    console.log("📄 작품 상세 페이지로 이동:", { src: detailImg.src, meta: detailMeta.textContent || "" });
  });

  // =========================================================
  // 4.5) Reception welcome modal
  // =========================================================
  const receptionBackdrop = el("div", "exh-receptionBackdrop");
  receptionBackdrop.innerHTML = `
    <div class="exh-receptionCard" role="dialog" aria-modal="true">
      <div class="exh-receptionTop">
        <div>Welcome</div>
        <button class="exh-miniBtn exh-receptionClose" type="button">Close</button>
      </div>
      <div class="exh-receptionBody">
        리셉션입니다.<br/>
        벽의 작품 이미지를 클릭하면 작품을 크게 볼 수 있어요.
      </div>
    </div>
  `;
  exh.appendChild(receptionBackdrop);

  const receptionClose = receptionBackdrop.querySelector<HTMLButtonElement>(".exh-receptionClose")!;
  function openReception() {
    receptionBackdrop.classList.add("is-open");
  }
  function closeReception() {
    receptionBackdrop.classList.remove("is-open");
  }
  receptionBackdrop.addEventListener("pointerdown", (e) => {
    if (e.target === receptionBackdrop) closeReception();
  });
  receptionClose.addEventListener("click", closeReception);

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

  // =========================================================
  // 5) 클릭/포인터 처리
  // =========================================================
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

  function onPointerMove(e: PointerEvent) {
    if (!exh.classList.contains("is-visible")) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest?.(".reception-desk")) {
      exh.style.cursor = "pointer";
      return;
    }

    const img = getImgFromPoint(e.clientX, e.clientY);
    exh.style.cursor = img ? "pointer" : "";
  }

  function shield(e: Event) {
    if (!exh.classList.contains("is-visible")) return;

    const target = e.target as HTMLElement | null;
    const insideExh = !!target?.closest?.(".exh-root");
    if (!insideExh) return;

    if (isAllowedUiTarget(target)) return;
    killEvent(e);
  }

  function onPointerDownCapture(e: PointerEvent) {
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

    const payload: OpenArtworkPayload = { roomIndex: index, side, src };
    if (opts.onOpenArtwork) opts.onOpenArtwork(payload);
    else openDetail(payload);
  }

  exh.addEventListener("pointermove", onPointerMove, { passive: true });

  // =========================================================
  // 5.5) ✅ 커서 따라 룸 흔들리는 모션 (parallax wobble)
  // ✅ 리셉션 룸은 제외, 다른 전시장만 적용
  // =========================================================
  function onMouseMoveWobble(e: MouseEvent) {
    if (!exh.classList.contains("is-visible")) return;

    const roomEl = scroller.querySelector<HTMLElement>(".room--current");
    if (!roomEl) return;

    // ✅ 리셉션 룸은 모션 제외
    const currentRoom = rooms[index];
    if (isReceptionRoom(currentRoom, index)) {
      roomEl.style.transform = ""; // 리셉션은 transform 제거
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const offsetX = (e.clientX - centerX) / centerX;
    const offsetY = (e.clientY - centerY) / centerY;

    const maxRotateY = 3;
    const maxRotateX = 2.5;

    const rotateY = offsetX * maxRotateY;
    const rotateX = -offsetY * maxRotateX;

    roomEl.style.transition = "transform 0.3s ease-out";
    roomEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }
  exh.addEventListener("mousemove", onMouseMoveWobble, { passive: true });

  // ✅ 전역 캡처 실드
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

  // ✅ #ui 레이어 pointer-events off
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
    closeReception();
    restoreUiLayer();
  }

  return { show, hide, setRooms };
}
