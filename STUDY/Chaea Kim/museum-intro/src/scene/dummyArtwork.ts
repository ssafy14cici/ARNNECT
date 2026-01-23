import * as THREE from "three";

/**
 * 외부 이미지 없이도 "임시 작품"을 보이게 하는 CanvasTexture
 * - 512x512 고정 (네가 말한 Texture size 512와 일치)
 */
export function makeDummyArtworkTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // 극단적 케이스: 캔버스 컨텍스트 실패 시 단색 텍스처
    const data = new Uint8Array([220, 220, 220, 255]);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.needsUpdate = true;
    return tex;
  }

  // 배경
  ctx.fillStyle = "#e9e9e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 헤더 바
  ctx.fillStyle = "#d2d2d2";
  ctx.fillRect(0, 0, canvas.width, 88);

  // 라벨
  ctx.fillStyle = "#2b2a28";
  ctx.font = "bold 42px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 32, 44);

  // 도형
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "#c7c7c7";
  ctx.beginPath();
  ctx.arc(350, 300, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
