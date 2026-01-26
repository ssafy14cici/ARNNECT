// Vanilla JavaScript 버전 ArtworkDetail
import "./ArtworkDetail.css";

export function mountArtworkDetail(root: HTMLElement): { unmount: () => void } {
  const params = new URLSearchParams(window.location.search);
  const roomIdx = parseInt(params.get("room") ?? "0");
  const side = params.get("side") ?? "back";
  const src = params.get("src") ?? "";

  const container = document.createElement("div");
  container.className = "art-detail";
  container.innerHTML = `
    <div class="art-detail__topbar">
      <button class="art-detail__back" type="button">
        ← Back to Exhibition
      </button>
      <div class="art-detail__meta">
        <div>room: ${roomIdx + 1}</div>
        <div>side: ${side}</div>
      </div>
    </div>

    <div class="art-detail__body">
      <button class="art-detail__nav art-detail__nav--prev" type="button">◀</button>
      ${src ? `<img class="art-detail__img" src="${src}" alt="artwork" />` : "<div>No src</div>"}
      <button class="art-detail__nav art-detail__nav--next" type="button">▶</button>
    </div>

    <div class="art-detail__footer">
      <div class="art-detail__hint">
        Use arrow keys or buttons to navigate between artworks
      </div>
    </div>
  `;

  root.appendChild(container);

  // Back 버튼 이벤트 - 전시장으로 복귀 (루트 경로로 이동)
  const backBtn = container.querySelector<HTMLButtonElement>(".art-detail__back")!;
  backBtn.addEventListener("click", () => {
    // ✅ 전시장 다시 표시
    const exhRoot = document.querySelector<HTMLElement>(".exh-root");
    if (exhRoot) exhRoot.classList.add("is-visible");

    // ✅ 캔버스 다시 표시 (navigate가 켜지만 명시적으로 설정)
    const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
    if (canvas) canvas.style.display = "block";

    // ✅ 전시장 복귀 시 scene 배경/모드 강제 복구
    (window as any).__SCENE_API__?.restoreExhibitionFromDetail?.();

    // 루트로 이동
    history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  // ✅ 룸별 작품 순서 정의 (DB 구조와 동일하게)
  // defaultRooms에서 정의된 순서: back -> left -> right
  const roomArtworks = [
    // 룸1: scene/index.ts의 defaultRooms[0]과 동일한 순서
    // back: [a9, a10], left: [a1, a2, a3], right: [a4, a5, a6]
    [
      { side: "back", artNum: 9, index: 0 },
      { side: "back", artNum: 10, index: 1 },
      { side: "left", artNum: 1, index: 0 },
      { side: "left", artNum: 2, index: 1 },
      { side: "left", artNum: 3, index: 2 },
      { side: "right", artNum: 4, index: 0 },
      { side: "right", artNum: 5, index: 1 },
      { side: "right", artNum: 6, index: 2 },
    ],
    // 룸2: scene/index.ts의 defaultRooms[1]과 동일한 순서
    // back: [a11, a12], left: [a7, a8, a1], right: [a2, a3, a4]
    [
      { side: "back", artNum: 11, index: 0 },
      { side: "back", artNum: 12, index: 1 },
      { side: "left", artNum: 7, index: 0 },
      { side: "left", artNum: 8, index: 1 },
      { side: "left", artNum: 1, index: 2 },
      { side: "right", artNum: 2, index: 0 },
      { side: "right", artNum: 3, index: 1 },
      { side: "right", artNum: 4, index: 2 },
    ],
  ];

  const artworkOrder = roomArtworks[roomIdx] || roomArtworks[0];

  console.log("=== 디테일 페이지 정보 ===");
  console.log("Room:", roomIdx, "Side:", side, "Src:", src);
  console.log("작품 순서:", artworkOrder);

  // 현재 위치 찾기
  let currentIdx = artworkOrder.findIndex((art) => {
    const currentSrc = new URL(src, window.location.origin).pathname;
    const pattern = `a${art.artNum}.jpg`;
    return art.side === side && currentSrc.includes(pattern);
  });

  if (currentIdx === -1) currentIdx = 0;

  console.log("현재 인덱스:", currentIdx, "총 작품 수:", artworkOrder.length);

  function navigateToArtwork(delta: number) {
    const prevIdx = currentIdx;
    currentIdx = (currentIdx + delta + artworkOrder.length) % artworkOrder.length;
    const next = artworkOrder[currentIdx];

    console.log("네비게이션:", prevIdx, "->", currentIdx, "작품:", next);

    // 새로운 이미지 URL 생성
    const newSrc = src.replace(/a\d+\.jpg/, `a${next.artNum}.jpg`);

    const q = new URLSearchParams({
      room: String(roomIdx),
      side: next.side,
      src: newSrc,
    });

    console.log("새 URL:", `/artwork?${q.toString()}`);

    history.pushState(null, "", `/artwork?${q.toString()}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  // 버튼 이벤트
  const prevBtn = container.querySelector<HTMLButtonElement>(".art-detail__nav--prev")!;
  const nextBtn = container.querySelector<HTMLButtonElement>(".art-detail__nav--next")!;

  prevBtn.addEventListener("click", () => navigateToArtwork(-1));
  nextBtn.addEventListener("click", () => navigateToArtwork(1));

  // 키보드 이벤트
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateToArtwork(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      navigateToArtwork(1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      backBtn.click();
    }
  };

  window.addEventListener("keydown", handleKeydown);

  return {
    unmount: () => {
      window.removeEventListener("keydown", handleKeydown);
      container.remove();
    },
  };
}
