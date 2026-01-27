// src/exhibition/utils.ts

import type { RoomSet } from "./types";

/**
 * HTML 엘리먼트를 생성하는 헬퍼 함수
 */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/**
 * 리셉션 룸인지 확인
 */
export function isReceptionRoom(room: RoomSet | undefined, idx: number): boolean {
  if (!room) return false;
  return idx === 0 || room.subject === "reception" || room.subject === "room0";
}

/**
 * 이벤트 중단
 */
export function killEvent(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
  (e as any).stopImmediatePropagation?.();
}
