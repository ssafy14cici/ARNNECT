import * as THREE from "three";
import { loadHdriWithPmrem } from "../intro/hdri"; // 네 파일 경로에 맞게

type HdriBundle = {
  background: THREE.Texture;
  environment: THREE.Texture;
  dispose: () => void;
};

// renderer가 같다는 가정(=viewer 1개)에서 캐싱
const cache = new Map<string, Promise<HdriBundle>>();

export function getHdri(renderer: THREE.WebGLRenderer, url: string): Promise<HdriBundle> {
  if (!cache.has(url)) {
    cache.set(url, loadHdriWithPmrem(renderer, url));
  }
  return cache.get(url)!;
}

// 앱 종료 시 한번만 정리하고 싶으면
export async function disposeAllHdri() {
  for (const p of cache.values()) {
    const b = await p;
    b.dispose();
  }
  cache.clear();
}
