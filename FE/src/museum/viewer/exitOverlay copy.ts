// src/viewer/exitOverlay.ts
export function mountExitOverlay(args: { label?: string; onExit: () => void; mount?: HTMLElement }) {
  const mount = args.mount ?? document.body;
  const btn = document.createElement("button");
  mount.appendChild(btn);

  btn.type = "button";
  btn.className = "exit-overlay-btn";
  btn.textContent = args.label ?? "Back";

  const onClick = () => args.onExit();
  btn.addEventListener("click", onClick);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") args.onExit();
  };
  window.addEventListener("keydown", onKey);

  document.body.appendChild(btn);

  return () => {
    btn.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKey);
    btn.remove();
  };
}
