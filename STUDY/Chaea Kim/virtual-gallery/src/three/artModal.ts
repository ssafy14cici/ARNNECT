export function createArtModal() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.75)";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "10000";

  const img = document.createElement("img");
  img.style.maxWidth = "92vw";
  img.style.maxHeight = "90vh";
  img.style.objectFit = "contain";
  img.style.borderRadius = "10px";
  img.style.boxShadow = "0 20px 60px rgba(0,0,0,0.45)";

  const close = () => {
    overlay.style.display = "none";
    img.src = "";
  };

  overlay.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  overlay.appendChild(img);
  document.body.appendChild(overlay);

  return {
    open: (src: string) => {
      img.src = src;
      overlay.style.display = "flex";
    },
    close,
    isOpen: () => overlay.style.display !== "none",
  };
}
