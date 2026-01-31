// src/intro/ui.ts
export type IntroUIState = "loading" | "ready";

export type IntroUI = {
  root: HTMLElement;

  heroOverlay: HTMLElement;
  heroMain: HTMLElement;
  heroSub: HTMLElement;

  menuBtn: HTMLButtonElement;

  backdrop: HTMLDivElement;
  progressBar: HTMLDivElement;
  percentText: HTMLDivElement;

  content: HTMLDivElement;
  enterBtn: HTMLDivElement;
  ringEl: HTMLDivElement;
  labelEl: HTMLDivElement;

  fadeEl: HTMLDivElement;

  setState: (state: IntroUIState, skipLoading?: boolean) => void;
  setProgress: (p: number, label?: string) => void;
  setHoldProgress: (p: number) => void;

  disableEnter: () => void;
  beginEnter: () => void;
  carryFadeToBody: () => HTMLDivElement;
};

export function createIntroUI(): IntroUI {
  const root = document.createElement("div");
  root.id = "intro-ui";
  root.dataset.state = "loading";
  document.body.appendChild(root);

  // loading
  const backdrop = document.createElement("div");
  backdrop.className = "intro-backdrop";
  root.appendChild(backdrop);

  const loader = document.createElement("div");
  loader.id = "loader-container";
  backdrop.appendChild(loader);

  const track = document.createElement("div");
  track.className = "progress-track";
  loader.appendChild(track);

  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  track.appendChild(progressBar);

  const percentText = document.createElement("div");
  percentText.className = "percent-text";
  percentText.textContent = "Loading…";
  loader.appendChild(percentText);

  // hero overlay (MAIN만 여기)
  const heroOverlay = document.createElement("div");
  heroOverlay.className = "intro-hero";
  root.appendChild(heroOverlay);

  const heroMain = document.createElement("p");
  heroMain.className = "intro-hero__line intro-hero__line--main";
  heroMain.textContent = "당신의 예술가를 발견하고\n당신의 취향을 완성하세요";
  heroOverlay.appendChild(heroMain);

  // ✅ SUB는 transform 부모 밖(root에 직접)
  const heroSub = document.createElement("p");
  heroSub.className = "intro-hero__line intro-hero__line--sub";
  heroSub.textContent = "예술가와 당신이 연결되는 곳";
  root.appendChild(heroSub);

  // menu
  const menuBtn = document.createElement("button");
  menuBtn.className = "intro-menu-btn";
  menuBtn.type = "button";
  menuBtn.innerHTML = `
    <span class="intro-menu-label">MENU</span>
    <span class="intro-menu-icon" aria-hidden="true">
      <span></span><span></span>
    </span>
  `;
  root.appendChild(menuBtn);

  // enter content
  const content = document.createElement("div");
  content.className = "intro-content";
  root.appendChild(content);

  const subtitle = document.createElement("div");
  subtitle.className = "intro-subtitle";
  subtitle.textContent = "";
  content.appendChild(subtitle);

  const enterBtn = document.createElement("div");
  enterBtn.className = "intro-enter";
  enterBtn.setAttribute("role", "button");
  enterBtn.setAttribute("tabindex", "0");
  content.appendChild(enterBtn);

  const ringEl = document.createElement("div");
  ringEl.className = "intro-ring";
  ringEl.style.setProperty("--p", "0");
  enterBtn.appendChild(ringEl);

  const labelEl = document.createElement("div");
  labelEl.className = "intro-enter__label";
  labelEl.textContent = "Enter";
  enterBtn.appendChild(labelEl);

  // fade
  const fadeEl = document.createElement("div");
  fadeEl.className = "intro-fade";
  root.appendChild(fadeEl);

  // transitions
  heroMain.style.transition = "opacity 650ms ease, transform 650ms ease";
  heroSub.style.transition = "opacity 650ms ease, transform 650ms ease";

  heroOverlay.style.opacity = "0";
  menuBtn.style.opacity = "0";
  content.style.opacity = "0";

  heroMain.style.opacity = "0";
  heroSub.style.opacity = "0";
  heroMain.style.transform = "translateY(-6px)";
  heroSub.style.transform = "translateY(-4px)";

  const setState = (state: IntroUIState, skipLoading?: boolean) => {
    root.dataset.state = state === "ready" ? "enter-ready" : "loading";

    if (state === "loading") {
      backdrop.style.display = "flex";
      heroOverlay.style.opacity = "0";
      menuBtn.style.opacity = "0";
      content.style.opacity = "0";
      heroMain.style.opacity = "0";
      heroSub.style.opacity = "0";
      return;
    }

    backdrop.style.display = skipLoading ? "none" : "none";
    heroOverlay.style.opacity = "1";
    menuBtn.style.opacity = "1";
    content.style.opacity = "1";

    // 메인 -> 서브 순서
    setTimeout(() => {
      heroMain.style.opacity = "1";
      heroMain.style.transform = "translateY(0)";
    }, 120);

    setTimeout(() => {
      heroSub.style.opacity = "1";
      heroSub.style.transform = "translateY(0)";
    }, 420);
  };

  const setProgress = (p: number, label = "") => {
    const v = Math.max(0, Math.min(1, p));
    progressBar.style.width = `${Math.round(v * 100)}%`;
    percentText.textContent = label || `${Math.round(v * 100)}%`;
  };

  const setHoldProgress = (p: number) => {
    const v = Math.max(0, Math.min(1, p));
    ringEl.style.setProperty("--p", String(v));
  };

  const disableEnter = () => enterBtn.classList.add("is-disabled");

  const beginEnter = () => {
    fadeEl.style.display = "block";
    fadeEl.style.opacity = "0";
  };

  const carryFadeToBody = () => {
    const el = fadeEl;
    el.style.display = "block";
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.zIndex = "999999";
    document.body.appendChild(el);
    return el;
  };

  return {
    root,
    heroOverlay,
    heroMain,
    heroSub,
    menuBtn,
    backdrop,
    progressBar,
    percentText,
    content,
    enterBtn,
    ringEl,
    labelEl,
    fadeEl,
    setState,
    setProgress,
    setHoldProgress,
    disableEnter,
    beginEnter,
    carryFadeToBody,
  };
}
