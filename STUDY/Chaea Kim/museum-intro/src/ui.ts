export type UiWaypoint = {
  id: string;
  x: number; // screen px
  y: number; // screen px
  label?: string;
  active?: boolean;
  hidden?: boolean;
};

export type UiApi = {
  // Loading
  setLoadingVisible(v: boolean): void;
  setLoadingProgress(p01: number): void;

  // Hero/Brand
  setHeroVisible(v: boolean): void;

  // Enter (hold)
  setEnterEnabled(enabled: boolean, hint?: string): void;
  onEnterHold(cb: () => void): void;

  // Exit
  setExitVisible(v: boolean): void;
  onExit(cb: () => void): void;

  // Flash overlay
  flash(alpha01: number): void;

  // Panel (optional)
  openPanel(title: string, body: string): void;
  closePanel(): void;

  // Interior nav + upload
  setWaypoints(points: UiWaypoint[]): void;
  onWaypointClick(cb: (id: string) => void): void;

  setNavVisible(v: boolean): void;
  onPrev(cb: () => void): void;
  onNext(cb: () => void): void;
  onUpload(cb: () => void): void;

  setNavHint(text: string): void;

  // Helpers used by scene/index.ts
  setNavHint(text: string): void;
};

export function mountUI(root: HTMLElement): UiApi {
  // ----- style injection -----
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --ui-bg: rgba(255,255,255,0.82);
      --ui-fg: rgba(20,20,20,0.92);
      --ui-muted: rgba(20,20,20,0.55);
      --ui-line: rgba(20,20,20,0.14);
      --ui-shadow: 0 18px 60px rgba(0,0,0,0.12);
      --ui-radius: 18px;
      --ui-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", Arial;
    }
    .ui-layer{
      position: fixed; inset: 0; pointer-events: none; z-index: 50;
      font-family: var(--ui-font);
    }
    .ui-brand{
      position: fixed; left: 28px; top: 18px;
      letter-spacing: 0.28em;
      font-size: 14px;
      color: rgba(20,20,20,0.85);
      pointer-events: none;
      user-select: none;
    }

    /* Loading */
    .ui-loading{
      position: fixed; left: 28px; bottom: 22px;
      padding: 10px 12px;
      border: 1px solid var(--ui-line);
      background: rgba(255,255,255,0.55);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      box-shadow: var(--ui-shadow);
      display: flex; gap: 10px; align-items: center;
      pointer-events: none;
    }
    .ui-loading__bar{
      width: 180px; height: 6px; border-radius: 999px;
      background: rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .ui-loading__bar > i{
      display: block; height: 100%; width: 0%;
      background: rgba(0,0,0,0.55);
    }
    .ui-loading__txt{
      font-size: 12px; color: var(--ui-muted);
      letter-spacing: 0.06em;
    }

    /* Flash */
    .ui-flash{
      position: fixed; inset: 0;
      background: #fff;
      opacity: 0;
      pointer-events: none;
      z-index: 60;
      transition: opacity 80ms linear;
    }

    /* Enter Hold Button */
    .ui-enterWrap{
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 55;
    }
    .ui-enterBtn{
      width: 88px; height: 88px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.14);
      background: rgba(255,255,255,0.82);
      backdrop-filter: blur(10px);
      box-shadow: var(--ui-shadow);
      display: grid; place-items: center;
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
      position: relative;
      overflow: hidden;
      touch-action: none;
    }
    .ui-enterBtn[aria-disabled="true"]{
      opacity: 0.45;
      cursor: not-allowed;
    }
    .ui-enterBtn strong{
      font-size: 12px;
      letter-spacing: 0.12em;
      color: rgba(20,20,20,0.88);
    }
    .ui-enterHint{
      margin-top: 10px;
      text-align: center;
      font-size: 12px;
      color: rgba(20,20,20,0.55);
      letter-spacing: 0.06em;
      user-select: none;
      pointer-events: none;
    }
    .ui-holdProg{
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.10);
      transform: translateY(100%);
      transition: transform 0ms linear;
    }

    /* Exit */
    .ui-exitBtn{
      position: fixed; right: 22px; top: 18px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid var(--ui-line);
      background: rgba(255,255,255,0.72);
      backdrop-filter: blur(10px);
      box-shadow: var(--ui-shadow);
      pointer-events: auto;
      cursor: pointer;
      letter-spacing: 0.10em;
      font-size: 12px;
      color: rgba(20,20,20,0.82);
      display: none;
      user-select: none;
    }

    /* Panel */
    .ui-panel{
      position: fixed;
      right: 18px; bottom: 18px;
      width: min(360px, calc(100vw - 36px));
      border-radius: var(--ui-radius);
      border: 1px solid var(--ui-line);
      background: rgba(255,255,255,0.86);
      backdrop-filter: blur(12px);
      box-shadow: var(--ui-shadow);
      padding: 16px;
      pointer-events: auto;
      display: none;
    }
    .ui-panel h3{
      margin: 0 0 10px;
      font-size: 14px;
      letter-spacing: 0.06em;
      color: rgba(20,20,20,0.88);
    }
    .ui-panel p{
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: rgba(20,20,20,0.62);
      white-space: pre-wrap;
    }
    .ui-panel .ui-panelClose{
      position: absolute;
      right: 10px; top: 10px;
      width: 30px; height: 30px;
      border-radius: 999px;
      border: 1px solid var(--ui-line);
      background: rgba(255,255,255,0.9);
      cursor: pointer;
    }

    /* Interior Nav */
    .ui-nav{
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translateX(-50%);
      display: none;
      gap: 10px;
      pointer-events: auto;
      align-items: center;
      z-index: 55;
    }
    .ui-navBtn{
      width: 44px; height: 44px;
      border-radius: 999px;
      border: 1px solid var(--ui-line);
      background: rgba(255,255,255,0.78);
      backdrop-filter: blur(10px);
      box-shadow: var(--ui-shadow);
      cursor: pointer;
      display: grid; place-items: center;
      user-select: none;
    }
    .ui-navBtn:active{ transform: translateY(1px); }
    .ui-navHint{
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid var(--ui-line);
      background: rgba(255,255,255,0.65);
      backdrop-filter: blur(10px);
      box-shadow: var(--ui-shadow);
      font-size: 12px;
      letter-spacing: 0.06em;
      color: rgba(20,20,20,0.68);
      user-select: none;
      pointer-events: none;
      min-width: 220px;
      text-align: center;
    }
    .ui-uploadBtn{
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid var(--ui-line);
      background: rgba(255,255,255,0.78);
      backdrop-filter: blur(10px);
      box-shadow: var(--ui-shadow);
      cursor: pointer;
      font-size: 12px;
      letter-spacing: 0.08em;
      color: rgba(20,20,20,0.82);
      user-select: none;
    }

    /* Waypoints */
    .ui-waypoints{
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 56;
    }
    .ui-waypoint{
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: auto;
      width: 26px; height: 26px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.16);
      background: rgba(255,255,255,0.72);
      backdrop-filter: blur(8px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.10);
      cursor: pointer;
      display: grid; place-items: center;
      user-select: none;
    }
    .ui-waypoint i{
      width: 8px; height: 8px;
      border-radius: 999px;
      background: rgba(0,0,0,0.55);
      display: block;
    }
    .ui-waypoint[data-active="true"]{
      border-color: rgba(0,0,0,0.28);
      background: rgba(255,255,255,0.92);
    }
  `;
  document.head.appendChild(style);

  // ----- DOM -----
  const layer = document.createElement("div");
  layer.className = "ui-layer";
  root.appendChild(layer);

  const brand = document.createElement("div");
  brand.className = "ui-brand";
  brand.textContent = "ARNNECT";
  layer.appendChild(brand);

  const loading = document.createElement("div");
  loading.className = "ui-loading";
  loading.innerHTML = `
    <div class="ui-loading__bar"><i></i></div>
    <div class="ui-loading__txt">Loading…</div>
  `;
  layer.appendChild(loading);
  const loadingBar = loading.querySelector<HTMLDivElement>(".ui-loading__bar > i")!;

  const flash = document.createElement("div");
  flash.className = "ui-flash";
  layer.appendChild(flash);

  // Enter Hold
  const enterWrap = document.createElement("div");
  enterWrap.className = "ui-enterWrap";
  enterWrap.innerHTML = `
    <div class="ui-enterBtn" role="button" aria-label="Enter" aria-disabled="true" tabindex="0">
      <div class="ui-holdProg"></div>
      <strong>ENTER</strong>
    </div>
    <div class="ui-enterHint">Hold for 1s</div>
  `;
  layer.appendChild(enterWrap);
  const enterBtn = enterWrap.querySelector<HTMLDivElement>(".ui-enterBtn")!;
  const holdProg = enterWrap.querySelector<HTMLDivElement>(".ui-holdProg")!;
  const enterHint = enterWrap.querySelector<HTMLDivElement>(".ui-enterHint")!;

  // Exit
  const exitBtn = document.createElement("button");
  exitBtn.className = "ui-exitBtn";
  exitBtn.type = "button";
  exitBtn.textContent = "EXIT";
  layer.appendChild(exitBtn);

  // Panel
  const panel = document.createElement("div");
  panel.className = "ui-panel";
  panel.innerHTML = `
    <button class="ui-panelClose" aria-label="Close"></button>
    <h3></h3>
    <p></p>
  `;
  layer.appendChild(panel);
  const panelTitle = panel.querySelector<HTMLHeadingElement>("h3")!;
  const panelBody = panel.querySelector<HTMLParagraphElement>("p")!;
  const panelClose = panel.querySelector<HTMLButtonElement>(".ui-panelClose")!;
  panelClose.addEventListener("click", () => {
    panel.style.display = "none";
  });

  // Interior Nav
  const nav = document.createElement("div");
  nav.className = "ui-nav";
  nav.innerHTML = `
    <button class="ui-navBtn" data-act="prev" aria-label="Prev">←</button>
    <div class="ui-navHint">← / → : move focus</div>
    <button class="ui-navBtn" data-act="next" aria-label="Next">→</button>
    <button class="ui-uploadBtn" data-act="upload" aria-label="Upload">UPLOAD</button>
  `;
  layer.appendChild(nav);
  const navHint = nav.querySelector<HTMLDivElement>(".ui-navHint")!;
  const prevBtn = nav.querySelector<HTMLButtonElement>('[data-act="prev"]')!;
  const nextBtn = nav.querySelector<HTMLButtonElement>('[data-act="next"]')!;
  const uploadBtn = nav.querySelector<HTMLButtonElement>('[data-act="upload"]')!;

  // Waypoints
  const wpLayer = document.createElement("div");
  wpLayer.className = "ui-waypoints";
  layer.appendChild(wpLayer);

  // ----- callbacks -----
  let enterEnabled = false;
  let onEnterHoldCb: (() => void) | null = null;
  let onExitCb: (() => void) | null = null;
  let onWpClickCb: ((id: string) => void) | null = null;

  let onPrevCb: (() => void) | null = null;
  let onNextCb: (() => void) | null = null;
  let onUploadCb: (() => void) | null = null;

  // ----- hold logic -----
  const HOLD_MS = 1000;
  let holding = false;
  let holdStart = 0;
  let raf = 0;

  function setHoldProgress(p01: number) {
    const y = (1 - Math.max(0, Math.min(1, p01))) * 100;
    holdProg.style.transform = `translateY(${y}%)`;
  }

  function stopHold() {
    holding = false;
    holdStart = 0;
    setHoldProgress(0);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function tickHold() {
    if (!holding) return;
    const t = performance.now();
    const p = (t - holdStart) / HOLD_MS;
    setHoldProgress(p);
    if (p >= 1) {
      stopHold();
      onEnterHoldCb?.();
      return;
    }
    raf = requestAnimationFrame(tickHold);
  }

  function startHold() {
    if (!enterEnabled) return;
    if (holding) return;
    holding = true;
    holdStart = performance.now();
    raf = requestAnimationFrame(tickHold);
  }

  enterBtn.addEventListener("pointerdown", (e) => {
    if (!enterEnabled) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startHold();
  });
  enterBtn.addEventListener("pointerup", stopHold);
  enterBtn.addEventListener("pointercancel", stopHold);
  enterBtn.addEventListener("pointerleave", stopHold);

  // Exit click
  exitBtn.addEventListener("click", () => onExitCb?.());

  // Nav buttons
  prevBtn.addEventListener("click", () => onPrevCb?.());
  nextBtn.addEventListener("click", () => onNextCb?.());
  uploadBtn.addEventListener("click", () => onUploadCb?.());

  // ----- API impl -----
  function setLoadingVisible(v: boolean) {
    loading.style.display = v ? "flex" : "none";
  }

  function setLoadingProgress(p01: number) {
    const p = Math.max(0, Math.min(1, p01));
    loadingBar.style.width = `${Math.round(p * 100)}%`;
    const txt = loading.querySelector<HTMLDivElement>(".ui-loading__txt")!;
    txt.textContent = `Loading… ${Math.round(p * 100)}%`;
  }

  function setHeroVisible(v: boolean) {
    brand.style.display = v ? "block" : "none";
  }

  function setEnterEnabled(enabled: boolean, hint?: string) {
    enterEnabled = enabled;

    // Keep the control visible only when enabled (matches your existing UX).
    enterWrap.style.display = enabled ? "block" : "none";

    enterBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (hint) enterHint.textContent = hint;
    stopHold();
  }

  function onEnterHold(cb: () => void) {
    onEnterHoldCb = cb;
  }

  function setExitVisible(v: boolean) {
    exitBtn.style.display = v ? "inline-flex" : "none";
  }

  function onExit(cb: () => void) {
    onExitCb = cb;
  }

  function flashAlpha(alpha01: number) {
    const a = Math.max(0, Math.min(1, alpha01));
    flash.style.opacity = String(a);
  }

  function openPanel(title: string, body: string) {
    panelTitle.textContent = title;
    panelBody.textContent = body;
    panel.style.display = "block";
  }

  function closePanel() {
    panel.style.display = "none";
  }

  function setWaypoints(points: UiWaypoint[]) {
    wpLayer.innerHTML = "";
    for (const p of points) {
      if (p.hidden) continue;
      const b = document.createElement("button");
      b.className = "ui-waypoint";
      b.type = "button";
      b.style.left = `${p.x}px`;
      b.style.top = `${p.y}px`;
      b.dataset.id = p.id;
      b.dataset.active = p.active ? "true" : "false";
      b.innerHTML = `<i></i>`;
      b.addEventListener("click", () => onWpClickCb?.(p.id));
      wpLayer.appendChild(b);
    }
  }

  function onWaypointClick(cb: (id: string) => void) {
    onWpClickCb = cb;
  }

  function setNavVisible(v: boolean) {
    nav.style.display = v ? "flex" : "none";
  }

  function onPrev(cb: () => void) {
    onPrevCb = cb;
  }

  function onNext(cb: () => void) {
    onNextCb = cb;
  }

  function onUpload(cb: () => void) {
    onUploadCb = cb;
  }

  function setNavHint(text: string) {
    navHint.textContent = text;
  }

  // defaults
  setLoadingVisible(false);
  setEnterEnabled(false);
  setExitVisible(false);
  setNavVisible(false);

  return {
    setLoadingVisible,
    setLoadingProgress,
    setHeroVisible,
    setEnterEnabled,
    onEnterHold,
    setExitVisible,
    onExit,
    flash: flashAlpha,
    openPanel,
    closePanel,
    setWaypoints,
    onWaypointClick,
    setNavVisible,
    onPrev,
    onNext,
    onUpload,
    setNavHint,
  };
}
