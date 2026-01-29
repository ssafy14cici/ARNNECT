// FE/src/shared/storage/imageStore.ts
const KEY_IMAGES = "comet_mock_images_v1";

type ImageMap = Record<string, string>; // id -> dataUrl

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readMap(): ImageMap {
  try {
    const raw = localStorage.getItem(KEY_IMAGES);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as ImageMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: ImageMap) {
  localStorage.setItem(KEY_IMAGES, JSON.stringify(map));
}

function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

// ✅ 캔버스로 리사이즈 + JPEG 압축해서 dataURL 생성
export async function saveImageToLocal(
  file: File,
  opts?: { maxW?: number; maxH?: number; quality?: number }
): Promise<string> {
  const maxW = opts?.maxW ?? 1280;
  const maxH = opts?.maxH ?? 1280;
  const quality = opts?.quality ?? 0.82;

  const bmp = await fileToImageBitmap(file);

  // 비율 유지 리사이즈
  const ratio = Math.min(maxW / bmp.width, maxH / bmp.height, 1);
  const w = Math.round(bmp.width * ratio);
  const h = Math.round(bmp.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context 생성 실패");

  ctx.drawImage(bmp, 0, 0, w, h);

  // JPEG로 압축 (원하면 PNG로 바꿀 수 있음)
  const dataUrl = canvas.toDataURL("image/jpeg", quality);

  const id = `img_${uid()}`;
  const map = readMap();
  map[id] = dataUrl;
  writeMap(map);

  return id;
}

export function getLocalImageUrl(imageId: string): string | null {
  const map = readMap();
  return map[imageId] ?? null;
}

export function removeLocalImage(imageId: string) {
  const map = readMap();
  if (map[imageId]) {
    delete map[imageId];
    writeMap(map);
  }
}

export function clearLocalImages() {
  localStorage.removeItem(KEY_IMAGES);
}
