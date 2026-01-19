/**
 * 1) 이미지 프리로드: 매우 정확한 progress(0~100)
 */
export async function preloadImages(urls, onProgress) {
  if (!Array.isArray(urls) || urls.length === 0) {
    onProgress?.(100);
    return;
  }

  let loaded = 0;
  const total = urls.length;

  const update = () => {
    const p = Math.round((loaded / total) * 100);
    onProgress?.(p);
  };

  update();

  await Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
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
 * 2) fetch progress: 서버가 Content-Length 제공 + 스트리밍 가능할 때 정확
 *    - CORS로 Content-Length가 노출돼야 함(Access-Control-Expose-Headers)
 */
export async function fetchWithProgress(url, options, onProgress) {
  const res = await fetch(url, options);

  // Content-Length 없으면 정확한 바이트 진행률이 불가능 → 100으로 바로
  const total = Number(res.headers.get("content-length"));
  if (!res.body || !total) {
    onProgress?.(100);
    const data = await res.json().catch(async () => res.text());
    return { res, data };
  }

  const reader = res.body.getReader();
  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;

    const p = Math.round((received / total) * 100);
    onProgress?.(p);
  }

  onProgress?.(100);

  // Uint8Array 합치기
  const all = new Uint8Array(received);
  let pos = 0;
  for (const c of chunks) {
    all.set(c, pos);
    pos += c.length;
  }

  // JSON 우선 파싱
  const text = new TextDecoder().decode(all);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { res, data };
}
