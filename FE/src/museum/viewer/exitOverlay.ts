// src/viewer/exitOverlay.ts
export function mountExitOverlay(args: {
  label?: string;
  onExit: () => void;
  uiMount?: HTMLElement; // ✅ 추가
}) {
  const uiMount = args.uiMount ?? document.body;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "exit-overlay-btn";
  btn.textContent = args.label ?? "Back";

  // ✅ 표식 (DevTools에서 바로 찾기)
  btn.dataset.museumUi = "1";
  btn.style.pointerEvents = "auto";

  const onClick = () => args.onExit();
  btn.addEventListener("click", onClick);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") args.onExit();
  };
  window.addEventListener("keydown", onKey);

  uiMount.appendChild(btn);

  return () => {
    btn.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKey);
    btn.remove();
  };
}
