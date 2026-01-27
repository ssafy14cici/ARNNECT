// src/exhibition/modals.ts

import type { OpenArtworkPayload } from "./types";
import { el } from "./utils";

/**
 * 작품 상세 모달 생성
 */
export function createDetailModal(exh: HTMLElement) {
  const detailBackdrop = el("div", "exh-detailBackdrop");
  detailBackdrop.innerHTML = `
    <div class="exh-detailCard" role="dialog" aria-modal="true">
      <div class="exh-detailTop">
        <div class="exh-detailMeta"></div>
        <div class="exh-detailActions">
          <button class="exh-miniBtn exh-detailGoPage" type="button">작품 상세 페이지로 가기</button>
          <button class="exh-miniBtn exh-detailClose" type="button">Close</button>
        </div>
      </div>
      <div class="exh-detailBody">
        <img class="exh-detailImg" alt="artwork" />
      </div>
    </div>
  `;
  exh.appendChild(detailBackdrop);

  const detailMeta = detailBackdrop.querySelector<HTMLDivElement>(".exh-detailMeta")!;
  const detailImg = detailBackdrop.querySelector<HTMLImageElement>(".exh-detailImg")!;
  const detailClose = detailBackdrop.querySelector<HTMLButtonElement>(".exh-detailClose")!;
  const detailGoPage = detailBackdrop.querySelector<HTMLButtonElement>(".exh-detailGoPage")!;

  function openDetail(payload: OpenArtworkPayload): void {
    detailMeta.textContent = `room: ${payload.roomIndex + 1} / side: ${payload.side}`;
    detailImg.src = payload.src;
    detailBackdrop.classList.add("is-open");
  }

  function closeDetail(): void {
    detailBackdrop.classList.remove("is-open");
    detailImg.src = "";
  }

  detailBackdrop.addEventListener("pointerdown", (e) => {
    if (e.target === detailBackdrop) closeDetail();
  });
  detailClose.addEventListener("click", closeDetail);
  detailGoPage.addEventListener("click", () => {
    console.log("📄 작품 상세 페이지로 이동:", { src: detailImg.src, meta: detailMeta.textContent || "" });
  });

  return { openDetail, closeDetail };
}

/**
 * 리셉션 환영 모달 생성
 */
export function createReceptionModal(exh: HTMLElement) {
  const receptionBackdrop = el("div", "exh-receptionBackdrop");
  receptionBackdrop.innerHTML = `
    <div class="exh-receptionCard" role="dialog" aria-modal="true">
      <div class="exh-receptionTop">
        <div>Welcome</div>
        <button class="exh-miniBtn exh-receptionClose" type="button">Close</button>
      </div>
      <div class="exh-receptionBody">
        리셉션입니다.<br/>
        벽의 작품 이미지를 클릭하면 작품을 크게 볼 수 있어요.
      </div>
    </div>
  `;
  exh.appendChild(receptionBackdrop);

  const receptionClose = receptionBackdrop.querySelector<HTMLButtonElement>(".exh-receptionClose")!;

  function openReception(): void {
    receptionBackdrop.classList.add("is-open");
  }

  function closeReception(): void {
    receptionBackdrop.classList.remove("is-open");
  }

  receptionBackdrop.addEventListener("pointerdown", (e) => {
    if (e.target === receptionBackdrop) closeReception();
  });
  receptionClose.addEventListener("click", closeReception);

  return { openReception, closeReception };
}
