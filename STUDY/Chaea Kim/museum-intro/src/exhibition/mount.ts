/**
 * src/exhibition/mount.ts
 * - React/TSX 없이 "내부 전시회 UI"를 DOM으로 마운트
 * - ui.ts에서 dynamic import("./exhibition/mount") 로 불러서 사용
 */

export type ExhibitionMountApi = {
  // 필요하면 ui.ts가 연결해서 scene 쪽으로 브릿지할 때 사용
  onUpload?: (file: File) => void;
  onClose?: () => void;
};

let styleInjected = false;

function injectStyleOnce() {
  if (styleInjected) return;
  styleInjected = true;

  const css = `
  .exhRoot{
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 30;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  .exhHud{
    position: absolute;
    top: 18px;
    right: 18px;
    display: flex;
    gap: 10px;
    align-items: center;
    pointer-events: auto;
  }
  .exhBtn{
    border: 1px solid rgba(0,0,0,0.18);
    background: rgba(255,255,255,0.82);
    color: rgba(0,0,0,0.86);
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
    letter-spacing: 0.06em;
    backdrop-filter: blur(10px);
  }
  .exhBtn:hover{ background: rgba(0,0,0,0.78); color: #fff; }
  .exhHint{
    position: absolute;
    right: 18px;
    top: 60px;
    max-width: 320px;
    pointer-events: auto;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.14);
    background: rgba(255,255,255,0.72);
    color: rgba(0,0,0,0.78);
    font-size: 12.5px;
    line-height: 1.4;
    backdrop-filter: blur(10px);
  }
  .exhFile{
    display:none;
  }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

export function mountExhibition(host: HTMLElement, api: ExhibitionMountApi = {}) {
  injectStyleOnce();

  const root = document.createElement("div");
  root.className = "exhRoot";

  const hud = document.createElement("div");
  hud.className = "exhHud";

  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.className = "exhFile";

  const uploadBtn = document.createElement("button");
  uploadBtn.className = "exhBtn";
  uploadBtn.type = "button";
  uploadBtn.textContent = "Upload artwork";

  const closeBtn = document.createElement("button");
  closeBtn.className = "exhBtn";
  closeBtn.type = "button";
  closeBtn.textContent = "Close UI";

  const hint = document.createElement("div");
  hint.className = "exhHint";
  hint.textContent =
    "Upload artwork 버튼으로 이미지를 선택하면, scene 쪽(Three)에 연결된 업로드 핸들러로 전달할 수 있습니다. (연결은 ui.ts에서 onUpload 브릿지로 처리)";

  uploadBtn.addEventListener("click", () => file.click());
  file.addEventListener("change", () => {
    const f = file.files?.[0];
    if (!f) return;
    api.onUpload?.(f);
    // 같은 파일 재업로드 가능하게 초기화
    file.value = "";
  });

  closeBtn.addEventListener("click", () => api.onClose?.());

  hud.appendChild(uploadBtn);
  hud.appendChild(closeBtn);
  hud.appendChild(file);

  root.appendChild(hud);
  root.appendChild(hint);

  host.appendChild(root);

  return () => {
    root.remove();
  };
}
