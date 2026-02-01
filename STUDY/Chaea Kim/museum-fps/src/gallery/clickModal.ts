export type ClickModalPayload = {
  id: string;      // 예: "ART_3"
  index: number;   // 예: 3
  src?: string;    // 예: "/art/a3.jpg"
};

export function createClickModal() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.55)";
  overlay.style.zIndex = "10000";

  const card = document.createElement("div");
  card.style.minWidth = "260px";
  card.style.maxWidth = "78vw";
  card.style.padding = "16px 18px";
  card.style.borderRadius = "12px";
  card.style.background = "rgba(20,20,20,0.92)";
  card.style.color = "#fff";
  card.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  card.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)";

  const title = document.createElement("div");
  title.style.fontSize = "14px";
  title.style.opacity = "0.85";
  title.textContent = "CLICK DETECTED";

  const value = document.createElement("div");
  value.style.marginTop = "10px";
  value.style.fontSize = "18px";
  value.style.fontWeight = "700";

  const sub = document.createElement("div");
  sub.style.marginTop = "8px";
  sub.style.fontSize = "13px";
  sub.style.opacity = "0.8";

  const hint = document.createElement("div");
  hint.style.marginTop = "14px";
  hint.style.fontSize = "12px";
  hint.style.opacity = "0.65";
  hint.textContent = "Click outside or press ESC to close";

  card.appendChild(title);
  card.appendChild(value);
  card.appendChild(sub);
  card.appendChild(hint);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = () => (overlay.style.display = "none");

  overlay.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return {
    open(payload: ClickModalPayload) {
      value.textContent = payload.id;
      sub.textContent = `index=${payload.index}` + (payload.src ? ` | src=${payload.src}` : "");
      overlay.style.display = "flex";
    },
    close,
    isOpen() {
      return overlay.style.display !== "none";
    },
  };
}
