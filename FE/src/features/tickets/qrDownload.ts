// FE/src/features/tickets/qrDownload.ts
export async function downloadSvgAsPng(svgEl: SVGSVGElement, filename: string) {
  const blob = await svgToPngBlob(svgEl, 1024, 48);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export async function svgToPngFile(svgEl: SVGSVGElement, filename: string) {
  const blob = await svgToPngBlob(svgEl, 1024, 48);
  const name = filename.endsWith(".png") ? filename : `${filename}.png`;
  return new File([blob], name, { type: "image/png" });
}

export async function svgToPngBlob(svgEl: SVGSVGElement, size = 1024, pad = 48): Promise<Blob> {
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.decoding = "async";
  img.src = url;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("QR 이미지 변환 실패"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context 생성 실패");

  // 배경 흰색
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);

  // QR 그리기
  ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);

  URL.revokeObjectURL(url);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG Blob 생성 실패"))), "image/png");
  });

  return blob;
}
