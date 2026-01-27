// src/exhibition/room-renderer.ts
import receptionDeskPng from "./img/desk_cat_ssafy.png";
import type { RoomSet } from "./types";
import { el, isReceptionRoom } from "./utils";

/**
 * Side 타입이 ./types에서 누락되어도 안 터지게 로컬로 고정
 */
export type Side = "back" | "left" | "right";

/**
 * room.subject가 클래스 이름으로 쓰일 때 깨지지 않도록 sanitize
 * - 공백/특수문자 제거
 * - 비어있으면 fallback
 */
function toRoomClassToken(subject: string | undefined, fallback: string): string {
  const raw = (subject ?? "").trim();
  if (!raw) return fallback;

  // 허용: a-z A-Z 0-9 _ -
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  return safe || fallback;
}

/**
 * 룸 렌더링 로직
 */
export function createRoomRenderer(scroller: HTMLElement, subjectEl: HTMLElement) {
  let rooms: RoomSet[] = [];
  let index = 0;

  /**
   * 작품 이미지들을 렌더링
   * - frame-side는 CSS에서 display:none 처리해도 되지만,
   *   나중에 입체 프레임 복구할 수도 있으니 마크업은 유지
   */
  function renderImgs(side: Side, arr: string[]): string {
    if (!arr?.length) return "";
    return arr
      .map((src) => {
        const safeSrc = String(src ?? "");
        return `
          <div class="room__frame">
            <img
              class="room__img"
              decoding="async"
              loading="eager"
              data-side="${side}"
              data-src="${safeSrc}"
              src="${safeSrc}"
              alt="image"
              draggable="false"
            />
            <div class="room__frame-side room__frame-side--top"></div>
            <div class="room__frame-side room__frame-side--right"></div>
            <div class="room__frame-side room__frame-side--bottom"></div>
            <div class="room__frame-side room__frame-side--left"></div>
          </div>
        `;
      })
      .join("");
  }

  /**
   * 현재 룸 렌더링
   */
  function renderCurrentRoom(): void {
    scroller.innerHTML = "";
    const room = rooms[index];
    if (!room) return;

    subjectEl.textContent = room.subject ?? `room${index + 1}`;

    // ✅ room.subject가 "reception" / "room0" / "room 1" 등 어떤 값이든 안전하게 class token 생성
    const token = toRoomClassToken(room.subject, `room${index + 1}`);
    const roomClass = `room room--current room--${token}`;
    const roomEl = el("div", roomClass);

    roomEl.innerHTML = `
      <div class="room__side room__side--back">${renderImgs("back", room.back)}</div>
      <div class="room__side room__side--left">${renderImgs("left", room.left)}</div>
      <div class="room__side room__side--right">${renderImgs("right", room.right)}</div>
      <div class="room__side room__side--bottom"></div>
      <div class="room__side room__side--top"></div>
    `;

    // ✅ reception: overlay로 데스크(고양이) 추가
    // - 여기서는 "애니메이션 제거"만 담당 (실제 흔들림/모션은 CSS/다른 로직에서 제어)
    if (isReceptionRoom(room, index)) {
      const layer = el("div", "reception-prop-layer");
      layer.innerHTML = `
        <button class="reception-desk" data-no-motion="1" type="button" aria-label="Reception desk">
          <img src="${receptionDeskPng}" alt="Reception desk cat" draggable="false" />
        </button>
      `;
      roomEl.appendChild(layer);

      // 혹시 이전 룸에서 이벤트가 남아있을 수 있으니 안전 처리
      const deskBtn = layer.querySelector<HTMLButtonElement>(".reception-desk");
      if (deskBtn) {
        deskBtn.classList.remove("wave");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (deskBtn as any).onmouseenter = null;
      }
    }

    scroller.appendChild(roomEl);
  }

  /**
   * 룸 이동 (delta: +1 또는 -1)
   */
  function go(delta: number): void {
    if (!rooms.length) return;
    index = (index + delta + rooms.length) % rooms.length;
    renderCurrentRoom();
  }

  /**
   * 룸 목록 설정
   */
  function setRooms(nextRooms: RoomSet[]): void {
    rooms = (nextRooms ?? []).slice(0);
    index = 0;
    renderCurrentRoom();
  }

  /**
   * 현재 룸 정보 반환
   */
  function getCurrentRoom(): RoomSet | undefined {
    return rooms[index];
  }

  /**
   * 현재 룸 인덱스 반환
   */
  function getCurrentIndex(): number {
    return index;
  }

  return {
    setRooms,
    go,
    getCurrentRoom,
    getCurrentIndex,
    // 필요하면 외부에서 강제로 다시 그리기 가능
    renderCurrentRoom,
  };
}
