// 나중에 백엔드에서 이미지 받아오는 용도
import * as THREE from "three";

/**
 * 네트워크 텍스처 로딩 유틸
 * - 일반 URL(CDN/공개 URL): loadTexture()
 * - 인증 필요(Authorization 헤더 필요): loadTextureWithFetch()
 *
 * ✅ 캐시 포함: 같은 URL은 한 번만 로드
 * ✅ sRGB 설정: 사진/이미지 계열 텍스처는 보통 sRGB
 */

const textureCache = new Map<string, Promise<THREE.Texture>>();

/** 공개 URL(CDN 등)용: TextureLoader로 직접 로드 */
export function loadTexture(
  url: string,
  opts?: { renderer?: THREE.WebGLRenderer; anisotropy?: number }
): Promise<THREE.Texture> {
  if (!textureCache.has(url)) {
    textureCache.set(
      url,
      new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;

            const renderer = opts?.renderer;
            const aniso =
              opts?.anisotropy ??
              (renderer ? renderer.capabilities.getMaxAnisotropy() : 1);

            tex.anisotropy = Math.max(1, aniso);
            resolve(tex);
          },
          undefined,
          (err) => reject(err)
        );
      })
    );
  }
  return textureCache.get(url)!;
}

/**
 * 인증 필요 URL용: fetch로 blob을 받은 뒤 TextureLoader로 로드
 * - Authorization 헤더를 넣을 수 있어서 JWT/세션 기반 이미지에 대응 가능
 */
export function loadTextureWithFetch(
  url: string,
  opts: { accessToken: string; renderer?: THREE.WebGLRenderer; anisotropy?: number }
): Promise<THREE.Texture> {
  const key = `auth:${url}`;

  if (!textureCache.has(key)) {
    textureCache.set(
      key,
      (async () => {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${opts.accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error(`image fetch failed: ${res.status} ${res.statusText}`);
        }

        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);

        try {
          const tex = await new Promise<THREE.Texture>((resolve, reject) => {
            new THREE.TextureLoader().load(objUrl, resolve, undefined, reject);
          });

          tex.colorSpace = THREE.SRGBColorSpace;

          const renderer = opts?.renderer;
          const aniso =
            opts?.anisotropy ??
            (renderer ? renderer.capabilities.getMaxAnisotropy() : 1);

          tex.anisotropy = Math.max(1, aniso);
          return tex;
        } finally {
          // TextureLoader가 로드 끝나면 objUrl은 더 이상 필요 없음
          URL.revokeObjectURL(objUrl);
        }
      })()
    );
  }

  return textureCache.get(key)!;
}

/**
 * 캐시 비우기 (필요할 때만)
 * - 씬/세그먼트 완전 종료 시에만 호출 권장
 */
export function clearTextureCache(disposeTextures = false) {
  if (disposeTextures) {
    // Promise 결과를 기다렸다가 dispose까지 하려면 별도 추적이 필요해서
    // 지금은 "캐시 키 제거"만 제공하는 게 안전함.
    // dispose가 필요해지면 texture 레퍼런스 추적 구조를 추가하자.
  }
  textureCache.clear();
}

// 공개 URL
// import { loadTexture } from "@/shared/netTexture";

// const tex = await loadTexture(imageUrl, { renderer: viewer.renderer });
// material.map = tex;
// material.needsUpdate = true;

// 인증 필요 URL
// import { loadTextureWithFetch } from "@/shared/netTexture";

// const tex = await loadTextureWithFetch(imageUrl, {
//   accessToken,
//   renderer: viewer.renderer,
// });
// material.map = tex;
// material.needsUpdate = true;