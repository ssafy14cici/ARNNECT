// src/intro/ui.ts
import gsap from "gsap";

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

export function createIntroUI(mount: HTMLElement = document.body): IntroUI {
  const root = document.createElement("div");
  root.id = "intro-ui";
  root.dataset.state = "loading";
  mount.appendChild(root);


  /* ---------- menu ---------- */
  const menuBtn = document.createElement("button");
  menuBtn.className = "intro-menu-btn";
  menuBtn.type = "button";

  // ✅ 포커스/클릭 자체도 불가하게
  menuBtn.tabIndex = -1;
  menuBtn.setAttribute("aria-hidden", "true");
  menuBtn.style.display = "none";
  menuBtn.style.pointerEvents = "none";

// ❌ root.appendChild(menuBtn);  <- 이 줄은 제거(또는 주석)

  /* ---------- loading backdrop ---------- */
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

  // ✅ 로딩바 이후 나오는 텍스트 리빌(ART/USER/CONNECT/ARNNECT)
  const textReveal = document.createElement("div");
  textReveal.className = "intro-text-reveal";
  textReveal.style.opacity = "0";
  backdrop.appendChild(textReveal);

  const lines = ["art", "user", "connect", "arnnect"] as const;
  const lineTexts = {
    art: "ART",
    user: "ARTIST and USER",
    connect: "CONNECT",
    arnnect: "ARNNECT",
  } as const;

  const lineEls: HTMLElement[] = [];
  for (const key of lines) {
    const el = document.createElement("div");
    el.className = `intro-line intro-line--${key}`;
    el.textContent = lineTexts[key];
    textReveal.appendChild(el);
    lineEls.push(el);
  }

  /* ---------- hero overlay (MAIN only) ---------- */
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

  

  /* ---------- enter content ---------- */
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

  /* ---------- fade ---------- */
  const fadeEl = document.createElement("div");
  fadeEl.className = "intro-fade";
  root.appendChild(fadeEl);

  /* ---------- transitions ---------- */
  heroMain.style.transition = "opacity 650ms ease, transform 650ms ease";
  heroSub.style.transition = "opacity 650ms ease, transform 650ms ease";

  // 전체 UI 기본 숨김
  heroOverlay.style.opacity = "0";
  menuBtn.style.opacity = "0";
  content.style.opacity = "0";

  // ✅ hero 텍스트는 기본적으로 완전 숨김(특히 sub)
  const resetHeroText = () => {
    // main
    heroMain.style.opacity = "0";
    heroMain.style.transform = "translateY(-6px)";
    heroMain.style.display = "none";

    // sub (중요: ready 재진입 시 먼저 떠있는 버그 방지)
    heroSub.style.opacity = "0";
    heroSub.style.transform = "translateY(-4px)";
    heroSub.style.display = "none";
  };
  resetHeroText();

  // ready 진입 시 메인→서브 순서 타이머(중복 방지)
  let mainTimer = 0;
  let subTimer = 0;
  const clearHeroTimers = () => {
    if (mainTimer) window.clearTimeout(mainTimer);
    if (subTimer) window.clearTimeout(subTimer);
    mainTimer = 0;
    subTimer = 0;
  };

  const showEnterUi = () => {
    root.dataset.state = "enter-ready";
    backdrop.style.display = "none";
    backdrop.style.opacity = "1";

    heroOverlay.style.opacity = "1";
    menuBtn.style.opacity = "1";
    content.style.opacity = "1";

    // ✅ 매번 ready 들어올 때 리셋하고 순서 고정
    clearHeroTimers();
    resetHeroText();

    // 1) MAIN 먼저
    heroMain.style.display = "block";
    mainTimer = window.setTimeout(() => {
      heroMain.style.opacity = "1";
      heroMain.style.transform = "translateY(0)";
    }, 120);

    // 2) SUB는 나중에 (display도 이때 켬)
    subTimer = window.setTimeout(() => {
      heroSub.style.display = "block";
      heroSub.style.opacity = "1";
      heroSub.style.transform = "translateY(0)";
    }, 520);
  };

  const runTextReveal = () => {
    textReveal.style.opacity = "1";
    lineEls.forEach((el) => {
      el.style.opacity = "0";
      (el.style as any).filter = "blur(12px)";
      el.style.transform = "none";
    });

    const [art, user, connect, arnnect] = lineEls;
    const tl = gsap.timeline();

    tl.fromTo(
      art,
      { opacity: 0, scale: 0.92, filter: "blur(16px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out" },
      0,
    );
    tl.fromTo(
      user,
      { opacity: 0, x: 120, filter: "blur(8px)" },
      { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" },
      0.3,
    );
    tl.fromTo(
      connect,
      { opacity: 0, x: -120, filter: "blur(8px)" },
      { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" },
      0.6,
    );
    tl.fromTo(
      arnnect,
      { opacity: 0, y: 50, filter: "blur(12px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power2.out" },
      1.0,
    );

    tl.to(backdrop, {
      opacity: 0,
      duration: 1.4,
      delay: 0.6,
      ease: "power2.inOut",
      onComplete: () => {
        backdrop.style.display = "none";
        backdrop.style.opacity = "1";
        showEnterUi();
      },
    });

    return tl;
  };

  const setState = (state: IntroUIState, skipLoading?: boolean) => {
    if (state === "loading") {
      root.dataset.state = "loading";

      clearHeroTimers();
      resetHeroText();

      backdrop.style.display = "flex";
      backdrop.style.opacity = "1";

      loader.style.display = "flex";
      loader.style.opacity = "1";

      textReveal.style.opacity = "0";

      heroOverlay.style.opacity = "0";
      menuBtn.style.opacity = "0";
      content.style.opacity = "0";

      gsap.killTweensOf(loader);
      gsap.killTweensOf(backdrop);
      gsap.killTweensOf(textReveal);
      gsap.killTweensOf(lineEls);
      return;
    }

    // READY
    if (skipLoading) {
      loader.style.display = "none";
      textReveal.style.opacity = "0";
      showEnterUi();
      return;
    }

    // 로딩바 -> 리빌 -> enter UI
    root.dataset.state = "loading";

    clearHeroTimers();
    resetHeroText();

    backdrop.style.display = "flex";
    backdrop.style.opacity = "1";

    loader.style.display = "flex";
    loader.style.opacity = "1";

    textReveal.style.opacity = "0";

    heroOverlay.style.opacity = "0";
    menuBtn.style.opacity = "0";
    content.style.opacity = "0";

    gsap.killTweensOf(loader);
    gsap.killTweensOf(backdrop);
    gsap.killTweensOf(textReveal);
    gsap.killTweensOf(lineEls);

    gsap.to(loader, {
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        loader.style.display = "none";
        runTextReveal();
      },
    });
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
