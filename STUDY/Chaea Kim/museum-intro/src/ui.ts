export type UiWaypoint = {
  id: string;
  x: number;
  y: number;
  label?: string;
  active?: boolean;
  hidden?: boolean;
};

export type UiApi = {
  setLoadingVisible(v: boolean): void;
  setLoadingProgress(p01: number): void;

  setHeroVisible(v: boolean): void;

  setEnterEnabled(enabled: boolean, hint?: string): void;
  onEnterHold(cb: () => void): void;

  // Optional (some scenes may call)
  setExitVisible?(v: boolean): void;
  onExit?(cb: () => void): void;

  flash(alpha01: number): void;

  openPanel?(title: string, body: string): void;
  closePanel?(): void;

  setWaypoints?(points: UiWaypoint[]): void;
  onWaypointClick?(cb: (id: string) => void): void;

  setNavVisible?(v: boolean): void;
  onPrev?(cb: () => void): void;
  onNext?(cb: () => void): void;
  onUpload?(cb: () => void): void;

  setNavHint?(text: string): void;
};

export function mountUI(root: HTMLElement): UiApi {
  // ------------------------------------------------------
  // Styles (NO template literals to avoid ` syntax issues)
  // ------------------------------------------------------
  const style = document.createElement("style");
  style.textContent = [
    ":root{",
    "  --ui-line: rgba(20,20,20,0.14);",
    "  --ui-shadow: 0 18px 60px rgba(0,0,0,0.12);",
    '  --ui-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", Arial;',
    "}",
    ".ui-layer{ position: fixed; inset:0; pointer-events:none; z-index:70; font-family: var(--ui-font); }",
    ".ui-brand{ position: fixed; left: 28px; top: 18px; letter-spacing:0.28em; font-size:14px; color: rgba(20,20,20,0.85); user-select:none; }",
    ".ui-loading{",
    "  position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);",
    "  padding: 40px 50px;",
    "  border: 1px solid var(--ui-line);",
    "  background: rgba(255,255,255,0.95);",
    "  backdrop-filter: blur(20px);",
    "  border-radius: 20px;",
    "  box-shadow: 0 8px 32px rgba(0,0,0,0.08);",
    "  display: none; flex-direction: column; gap: 24px; align-items: center;",
    "}",
    ".ui-loading__bar{ width: 280px; height: 8px; border-radius: 999px; background: rgba(0,0,0,0.08); overflow: hidden; }",
    ".ui-loading__bar > i{ display:block; height:100%; width:0%; background: linear-gradient(90deg, #5a9a48, #6db84d); transition: width 0.3s ease; }",
    ".ui-loading__txt{ font-size: 16px; color: rgba(20,20,20,0.7); letter-spacing:0.08em; font-weight: 500; }",
    ".ui-flash{ position: fixed; inset:0; background:#fff; opacity:0; pointer-events:none; z-index:90; transition: opacity 80ms linear; }",
    "",
    ".ui-enterWrap{",
    "  position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%);",
    "  pointer-events:none; z-index:75; display:none;",
    "}",
    ".ui-enterBtn{",
    "  width: 88px; height: 88px; border-radius: 999px;",
    "  border: 1px solid rgba(0,0,0,0.14);",
    "  background: rgba(255,255,255,0.82);",
    "  backdrop-filter: blur(10px);",
    "  box-shadow: var(--ui-shadow);",
    "  display:grid; place-items:center;",
    "  pointer-events:auto; cursor:pointer; user-select:none;",
    "  position:relative; overflow:hidden;",
    "}",
    ".ui-enterBtn[aria-disabled='true']{ opacity:0.45; cursor:not-allowed; }",
    ".ui-enterBtn strong{ font-size: 12px; letter-spacing:0.12em; color: rgba(20,20,20,0.88); }",
    ".ui-enterHint{ margin-top:10px; text-align:center; font-size:12px; color: rgba(20,20,20,0.55); letter-spacing:0.06em; user-select:none; }",
    ".ui-holdProg{ position:absolute; inset:0; background: rgba(0,0,0,0.10); transform: translateY(100%); }",
  ].join("\n");
  document.head.appendChild(style);

  // ------------------------------------------------------
  // DOM
  // ------------------------------------------------------
  const layer = document.createElement("div");
  layer.className = "ui-layer";
  root.appendChild(layer);

  const brand = document.createElement("div");
  brand.className = "ui-brand";
  brand.textContent = "ARNNECT";
  layer.appendChild(brand);

  const loading = document.createElement("div");
  loading.className = "ui-loading";
  loading.innerHTML =
    '<div class="ui-loading__txt">Loading Museum...</div>' +
    '<div class="ui-loading__bar"><i></i></div>';
  layer.appendChild(loading);
  const loadingBar = loading.querySelector<HTMLDivElement>(".ui-loading__bar > i")!;

  const flash = document.createElement("div");
  flash.className = "ui-flash";
  layer.appendChild(flash);

  const enterWrap = document.createElement("div");
  enterWrap.className = "ui-enterWrap";
  enterWrap.innerHTML =
    '<div class="ui-enterBtn" role="button" aria-label="Enter" aria-disabled="true" tabindex="0">' +
    '  <div class="ui-holdProg"></div>' +
    "  <strong>ENTER</strong>" +
    "</div>" +
    '<div class="ui-enterHint">Hold for 1s</div>';
  layer.appendChild(enterWrap);

  const enterBtn = enterWrap.querySelector<HTMLDivElement>(".ui-enterBtn")!;
  const holdProg = enterWrap.querySelector<HTMLDivElement>(".ui-holdProg")!;
  const enterHint = enterWrap.querySelector<HTMLDivElement>(".ui-enterHint")!;

  // ------------------------------------------------------
  // State + Callbacks
  // ------------------------------------------------------
  let enterEnabled = false;
  let onEnterHoldCb: (() => void) | null = null;

  // ------------------------------------------------------
  // Hold-to-enter
  // ------------------------------------------------------
  const HOLD_MS = 1000;
  let holding = false;
  let holdStart = 0;
  let raf = 0;

  function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
  }

  function setHoldProgress(p01: number) {
    const y = (1 - clamp01(p01)) * 100;
    holdProg.style.transform = "translateY(" + y + "%)";
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
      if (onEnterHoldCb) onEnterHoldCb();
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

  // ------------------------------------------------------
  // API
  // ------------------------------------------------------
  function setLoadingVisible(v: boolean) {
    loading.style.display = v ? "flex" : "none";
  }

  function setLoadingProgress(p01: number) {
    const p = clamp01(p01);
    loadingBar.style.width = String(Math.round(p * 100)) + "%";
    const txt = loading.querySelector<HTMLDivElement>(".ui-loading__txt")!;
    const percent = Math.round(p * 100);
    txt.textContent = percent < 100 ? `Loading Museum... ${percent}%` : "Ready!";
  }

  function setHeroVisible(v: boolean) {
    brand.style.display = v ? "block" : "none";
  }

  function setEnterEnabled(enabled: boolean, hint?: string) {
    enterEnabled = enabled;
    enterWrap.style.display = enabled ? "block" : "none";
    enterBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (hint) enterHint.textContent = hint;
    stopHold();
  }

  function onEnterHold(cb: () => void) {
    onEnterHoldCb = cb;
  }

  function flashAlpha(alpha01: number) {
    flash.style.opacity = String(clamp01(alpha01));
  }

  // Defaults
  setLoadingVisible(false);
  setEnterEnabled(false);

  return {
    setLoadingVisible,
    setLoadingProgress,
    setHeroVisible,
    setEnterEnabled,
    onEnterHold,
    flash: flashAlpha,
  };
}
