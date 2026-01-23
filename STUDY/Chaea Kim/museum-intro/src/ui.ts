// src/ui.ts
export type UiApi = {
  // 로딩
  setLoadingVisible: (v: boolean) => void;
  setLoadingProgress: (p01: number) => void;

  // 히어로(타이틀)
  setHeroVisible: (v: boolean) => void;

  // Enter
  setEnterEnabled: (enabled: boolean, label?: string) => void;
  onEnterHold: (cb: () => void) => void;

  // Exit
  setExitVisible: (v: boolean) => void;
  onExit: (cb: () => void) => void;

  // Flash
  flash: (v01: number) => void;

  // Panel (선택)
  openPanel: (title: string, desc: string) => void;
  closePanel: () => void;
};

export function createUi(): UiApi {
  const host = document.querySelector("#app") ?? document.body;

  // UI layer
  const layer = document.createElement("div");
  layer.id = "ui-layer";
  layer.style.position = "fixed";
  layer.style.inset = "0";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "9990";
  host.appendChild(layer);

  // Flash
  const flash = document.createElement("div");
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.background = "#fff";
  flash.style.opacity = "0";
  flash.style.pointerEvents = "none";
  flash.style.transition = "opacity 180ms linear";
  flash.style.zIndex = "9997";
  layer.appendChild(flash);

  // Hero
  const hero = document.createElement("div");
  hero.style.position = "fixed";
  hero.style.left = "24px";
  hero.style.top = "18px";
  hero.style.pointerEvents = "none";
  hero.style.zIndex = "9996";
  hero.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto";
  hero.style.letterSpacing = "0.18em";
  hero.style.fontWeight = "700";
  hero.style.fontSize = "16px";
  hero.style.textTransform = "uppercase";
  hero.style.color = "rgba(0,0,0,0.75)";
  hero.textContent = "ARNNECT";
  layer.appendChild(hero);

  // Loading
  const loading = document.createElement("div");
  loading.style.position = "fixed";
  loading.style.left = "24px";
  loading.style.bottom = "24px";
  loading.style.padding = "10px 12px";
  loading.style.border = "1px solid rgba(0,0,0,0.14)";
  loading.style.background = "rgba(255,255,255,0.82)";
  loading.style.backdropFilter = "blur(6px)";
  loading.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto";
  loading.style.fontSize = "12px";
  loading.style.letterSpacing = "0.06em";
  loading.style.pointerEvents = "none";
  loading.style.zIndex = "9996";
  loading.style.display = "none";
  loading.textContent = "Loading… 0%";
  layer.appendChild(loading);

  // Enter Button
  const enterBtn = document.createElement("button");
  enterBtn.type = "button";
  enterBtn.textContent = "Hold ENTER for 1s";
  enterBtn.style.position = "fixed";
  enterBtn.style.left = "50%";
  enterBtn.style.bottom = "26px";
  enterBtn.style.transform = "translateX(-50%)";
  enterBtn.style.padding = "12px 14px";
  enterBtn.style.border = "1px solid rgba(0,0,0,0.18)";
  enterBtn.style.background = "rgba(255,255,255,0.86)";
  enterBtn.style.cursor = "pointer";
  enterBtn.style.letterSpacing = "0.10em";
  enterBtn.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto";
  enterBtn.style.fontSize = "12px";
  enterBtn.style.pointerEvents = "auto";
  enterBtn.style.display = "none";
  enterBtn.style.zIndex = "9996";
  layer.appendChild(enterBtn);

  // Exit Button
  const exitBtn = document.createElement("button");
  exitBtn.type = "button";
  exitBtn.textContent = "EXIT";
  exitBtn.style.position = "fixed";
  exitBtn.style.right = "24px";
  exitBtn.style.bottom = "26px";
  exitBtn.style.padding = "12px 14px";
  exitBtn.style.border = "1px solid rgba(0,0,0,0.18)";
  exitBtn.style.background = "rgba(255,255,255,0.86)";
  exitBtn.style.cursor = "pointer";
  exitBtn.style.letterSpacing = "0.10em";
  exitBtn.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto";
  exitBtn.style.fontSize = "12px";
  exitBtn.style.pointerEvents = "auto";
  exitBtn.style.display = "none";
  exitBtn.style.zIndex = "9996";
  layer.appendChild(exitBtn);

  // Simple Panel
  const panel = document.createElement("div");
  panel.style.position = "fixed";
  panel.style.top = "70px";
  panel.style.right = "24px";
  panel.style.width = "min(360px, 86vw)";
  panel.style.padding = "14px 14px";
  panel.style.border = "1px solid rgba(0,0,0,0.14)";
  panel.style.background = "rgba(255,255,255,0.88)";
  panel.style.boxShadow = "0 16px 60px rgba(0,0,0,0.18)";
  panel.style.display = "none";
  panel.style.pointerEvents = "auto";
  panel.style.zIndex = "9996";
  panel.innerHTML = `<div style="font-weight:700;letter-spacing:.06em;margin-bottom:8px" id="p-title"></div>
                     <div style="opacity:.78;line-height:1.5" id="p-desc"></div>
                     <div style="margin-top:12px;display:flex;justify-content:flex-end">
                       <button id="p-close" style="border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.86);padding:8px 10px;cursor:pointer">Close</button>
                     </div>`;
  layer.appendChild(panel);

  const pTitle = panel.querySelector("#p-title") as HTMLDivElement;
  const pDesc = panel.querySelector("#p-desc") as HTMLDivElement;
  const pClose = panel.querySelector("#p-close") as HTMLButtonElement;
  pClose.addEventListener("click", () => (panel.style.display = "none"));

  // Exhibition React mount root (DOM)
  const exhRoot = document.createElement("div");
  exhRoot.id = "exhibition-root";
  exhRoot.style.position = "fixed";
  exhRoot.style.inset = "0";
  exhRoot.style.zIndex = "9998";
  exhRoot.style.pointerEvents = "none"; // 내부에서 실제 클릭은 컴포넌트가 처리
  host.appendChild(exhRoot);

  // mount controller (lazy)
  let exhMounted: null | {
    show: (onClose: () => void) => void;
    hide: () => void;
  } = null;

  async function ensureExhibitionMounted() {
    if (exhMounted) return;
    const mod = await import("./exhibition/mount");
    const m = mod.mountExhibition(exhRoot);
    exhMounted = {
      show: (onClose) => {
        exhRoot.style.pointerEvents = "auto";
        m.show(onClose);
      },
      hide: () => {
        exhRoot.style.pointerEvents = "none";
        m.hide();
      },
    };
  }

  // Events
  let enterHoldCb: null | (() => void) = null;
  let exitCb: null | (() => void) = null;

  // Hold logic (1s)
  let holdT: number | null = null;

  const startHold = () => {
    if (!enterHoldCb) return;
    if (holdT) window.clearTimeout(holdT);
    enterBtn.textContent = "Holding…";
    holdT = window.setTimeout(() => {
      holdT = null;
      enterBtn.textContent = "Entering…";
      enterHoldCb?.();
    }, 1000);
  };

  const endHold = () => {
    if (holdT) window.clearTimeout(holdT);
    holdT = null;
    // label은 setEnterEnabled에서 다시 세팅됨
  };

  enterBtn.addEventListener("pointerdown", startHold);
  enterBtn.addEventListener("pointerup", endHold);
  enterBtn.addEventListener("pointerleave", endHold);
  enterBtn.addEventListener("pointercancel", endHold);

  exitBtn.addEventListener("click", () => {
    // ✅ 오버레이 먼저 닫고
    exhMounted?.hide();
    // ✅ 패널도 닫고
    panel.style.display = "none";
    // ✅ scene exit 실행
    exitCb?.();
  });

  return {
    setLoadingVisible(v) {
      loading.style.display = v ? "block" : "none";
    },
    setLoadingProgress(p01) {
      const pct = Math.round(Math.max(0, Math.min(1, p01)) * 100);
      loading.textContent = `Loading… ${pct}%`;
    },
    setHeroVisible(v) {
      hero.style.display = v ? "block" : "none";
    },
    setEnterEnabled(enabled, label) {
      enterBtn.style.display = enabled ? "block" : "none";
      enterBtn.disabled = !enabled;
      enterBtn.textContent = label ?? "Hold ENTER for 1s";
    },
    onEnterHold(cb) {
      enterHoldCb = cb;
    },
    async setExitVisible(v) {
      exitBtn.style.display = v ? "block" : "none";

      // ✅ 내부 진입 완료 시점(scene에서 true 호출)
      if (v) {
        await ensureExhibitionMounted();
        exhMounted?.show(() => {
          // 오버레이 Exit 버튼(컴포넌트)에서 닫을 때도 여기로 들어옴
          exhMounted?.hide();
          panel.style.display = "none";
          exitCb?.();
        });
      } else {
        exhMounted?.hide();
      }
    },
    onExit(cb) {
      exitCb = cb;
    },
    flash(v01) {
      flash.style.opacity = String(Math.max(0, Math.min(1, v01)));
    },
    openPanel(title, desc) {
      pTitle.textContent = title;
      pDesc.textContent = desc;
      panel.style.display = "block";
    },
    closePanel() {
      panel.style.display = "none";
    },
  };
}
