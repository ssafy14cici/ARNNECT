import gsap from "gsap";

export function createIntroUI() {
  const root = document.createElement("div");
  root.id = "intro-ui";
  root.dataset.state = "loading";

  const loader = document.createElement("div");
  loader.id = "loader-container";

  const track = document.createElement("div");
  track.className = "progress-track";
  const bar = document.createElement("div");
  bar.className = "progress-bar";
  track.appendChild(bar);

  const percent = document.createElement("div");
  percent.className = "percent-text";
  percent.textContent = "0%";

  loader.appendChild(track);
  loader.appendChild(percent);

  const textReveal = document.createElement("div");
  textReveal.className = "intro-text-reveal";

  const lines = ["art", "user", "connect", "arnnect"] as const;
  const lineTexts = { art: "ART", user: "ARTIST and USER", connect: "CONNECT", arnnect: "ARNNECT" };
  const lineEls: HTMLElement[] = [];

  for (const key of lines) {
    const el = document.createElement("div");
    el.className = `intro-line intro-line--${key}`;
    el.textContent = lineTexts[key];
    textReveal.appendChild(el);
    lineEls.push(el);
  }

  const menuBtn = document.createElement("button");
  menuBtn.className = "intro-menu-btn";
  menuBtn.type = "button";
  menuBtn.innerHTML = `<span>MENU</span><span class="intro-menu-icon"><span></span><span></span></span>`;

  const heroOverlay = document.createElement("div");
  heroOverlay.className = "intro-hero";

  const heroLine1 = document.createElement("div");
  heroLine1.className = "intro-hero__line intro-hero__line--main";
  heroLine1.textContent = "당신의 예술가를 발견하고\n당신의 취향을 완성하세요";
  heroLine1.style.whiteSpace = "pre-line";

  const heroLine2 = document.createElement("div");
  heroLine2.className = "intro-hero__line intro-hero__line--sub";
  heroLine2.textContent = "예술가와 당신이 연결되는 곳";

  const heroLine3 = document.createElement("div");
  heroLine3.className = "intro-hero__line intro-hero__line--brand";
  heroLine3.textContent = "ARNNECT";

  heroOverlay.appendChild(heroLine1);
  heroOverlay.appendChild(heroLine2);
  heroOverlay.appendChild(heroLine3);

  const content = document.createElement("div");
  content.className = "intro-content";

  const subtitle = document.createElement("div");
  subtitle.className = "intro-subtitle";
  subtitle.textContent = "Hold to enter";

  const enterBtn = document.createElement("button");
  enterBtn.className = "intro-enter";
  enterBtn.type = "button";

  const ring = document.createElement("div");
  ring.className = "intro-ring";
  ring.style.setProperty("--p", "0");

  const enterText = document.createElement("div");
  enterText.className = "intro-enter__label";
  enterText.textContent = "Enter";

  enterBtn.appendChild(ring);
  enterBtn.appendChild(enterText);

  content.appendChild(subtitle);
  content.appendChild(enterBtn);

  const fade = document.createElement("div");
  fade.className = "intro-fade";
  fade.style.position = "fixed";
  fade.style.inset = "0";
  fade.style.background = "#ffffff";
  fade.style.opacity = "0";
  fade.style.display = "none";
  fade.style.pointerEvents = "none";
  fade.style.zIndex = "99999";

  const backdrop = document.createElement("div");
  backdrop.className = "intro-backdrop";
  backdrop.appendChild(loader);
  backdrop.appendChild(textReveal);

  root.appendChild(backdrop);
  root.appendChild(menuBtn);
  root.appendChild(heroOverlay);
  root.appendChild(content);
  root.appendChild(fade);

  document.body.appendChild(root);

  const api = {
    root,
    enterBtn,
    fadeEl: fade,

    heroOverlay,
    menuBtn,

    carryFadeToBody: () => {
      fade.id = "intro-fade-carry";
      fade.classList.add("intro-fade--carry");
      if (fade.parentElement) fade.parentElement.removeChild(fade);
      document.body.appendChild(fade);
      fade.style.display = "block";
      fade.style.opacity = "1";
      return fade;
    },

    setState: (s: "loading" | "ready" | "entering", skipLoading?: boolean) => {
      if (s === "ready" && skipLoading) {
        loader.style.display = "none";
        backdrop.style.display = "none";
        root.dataset.state = "enter-ready";

        heroOverlay.style.opacity = "1";
        menuBtn.style.opacity = "1";
      } else if (s === "ready") {
        gsap.to(loader, {
          opacity: 0,
          duration: 0.6,
          onComplete: () => {
            loader.style.display = "none";

            textReveal.style.opacity = "1";
            const [art, user, connect, arnnect] = lineEls;

            const tl = gsap.timeline({
              onComplete: () => {
                gsap.to(backdrop, {
                  opacity: 0,
                  duration: 1.4,
                  delay: 0.6,
                  ease: "power2.inOut",
                  onComplete: () => {
                    backdrop.style.display = "none";
                    root.dataset.state = "enter-ready";

                    gsap.fromTo(heroOverlay, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" });
                    gsap.fromTo(menuBtn, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out", delay: 0.3 });
                  },
                });
              },
            });

            tl.fromTo(art, { opacity: 0, scale: 0.92, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out" }, 0);
            tl.fromTo(user, { opacity: 0, x: 120, filter: "blur(8px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" }, 0.3);
            tl.fromTo(connect, { opacity: 0, x: -120, filter: "blur(8px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" }, 0.6);
            tl.fromTo(arnnect, { opacity: 0, y: 50, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power2.out" }, 1.0);
          },
        });
      } else {
        root.dataset.state = s;
      }
    },

    setProgress: (p01: number, _text: string) => {
      const pct = Math.round(Math.max(0, Math.min(1, p01)) * 100);
      bar.style.width = `${pct}%`;
      percent.textContent = `${pct}%`;
    },

    setHoldProgress: (p01: number) => ring.style.setProperty("--p", String(Math.max(0, Math.min(1, p01)))),

    disableEnter: () => {
      enterBtn.disabled = true;
      enterBtn.classList.add("is-disabled");
      enterText.textContent = "Entering…";
    },

    beginEnter: () => {
      gsap.to(content, { opacity: 0, duration: 0.2, ease: "power1.out" });
      gsap.to(heroOverlay, { opacity: 0, duration: 0.3, ease: "power1.out" });
      gsap.to(menuBtn, { opacity: 0, duration: 0.3, ease: "power1.out" });
      root.dataset.state = "entering";
    },
  };

  return api;
}
