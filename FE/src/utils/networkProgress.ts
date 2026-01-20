// src/utils/networkProgress.ts

export type ProgressCallback = (percent: number) => void;

/**
 * clamp: 0~100 범위 보장
 */
const clampPercent = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * 1) 이미지 프리로드: progress(0~100)
 * - onload/onerror 모두 완료로 카운트 (깨진 이미지가 있어도 진행률은 끝까지 감)
 */
export async function preloadImages(
  urls: string[],
  onProgress?: ProgressCallback
): Promise<void> {
  if (!Array.isArray(urls) || urls.length === 0) {
    onProgress?.(100);
    return;
  }

  let loaded = 0;
  const total = urls.length;

  const update = () => {
    const p = (loaded / total) * 100;
    onProgress?.(clampPercent(p));
  };

  update();

  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => {
            loaded += 1;
            update();
            resolve();
          };
          img.src = src;
        })
    )
  );

  onProgress?.(100);
}

/**
 * 2) fetch progress
 * - Content-Length + ReadableStream 지원될 때 바이트 단위로 정확
 * - 없으면 진행률을 100으로 처리하고 전체 응답을 파싱
 *
 * 주의:
 * - CORS 환경이면 Content-Length가 노출돼야 함
 *   (Access-Control-Expose-Headers: Content-Length)
 * - 같은 오리진(백엔드)면 대체로 OK
 */
export async function fetchWithProgress<T = unknown>(
  url: string,
  options: RequestInit = {},
  onProgress?: ProgressCallback
): Promise<{ res: Response; data: T }> {
  const res = await fetch(url, options);

  // HTTP 에러면 여기서 바로 throw (원하면 data 파싱 후 throw도 가능)
  if (!res.ok) {
    onProgress?.(100);
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  const total = Number(res.headers.get("content-length"));

  // Content-Length 없거나, body 스트림 못 쓰면 진행률 정확 불가
  if (!res.body || !total) {
    onProgress?.(100);
    const data = (await safeParse<T>(res)) as T;
    return { res, data };
  }

  const reader = res.body.getReader();
  let received = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(clampPercent((received / total) * 100));
    }
  }

  onProgress?.(100);

  // Uint8Array 합치기
  const all = new Uint8Array(received);
  let pos = 0;
  for (const c of chunks) {
    all.set(c, pos);
    pos += c.length;
  }

  const text = new TextDecoder().decode(all);

  // JSON 우선 파싱
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { res, data: data as T };
}

/**
 * content-type 보고 JSON 우선으로 안전 파싱
 */
async function safeParse<T>(res: Response): Promise<T | string> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  // json 아니어도 json 형태일 수 있어서 한번 더 시도
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text;
  }
}
