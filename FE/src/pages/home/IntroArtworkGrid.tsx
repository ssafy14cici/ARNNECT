// FE/src/pages/home/IntroArtworkGrid.tsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../shared/api/http";

// ✅ 너가 쓰는 “무조건 되는” 함수로 통일
// 경로는 HomeMobile 위치 기준: FE/src/pages/home -> FE/src/pages/artworks/detail/utils.ts
import { resolveMediaUrl } from "../artworks/detail/utils";

type JsonRecord = Record<string, unknown>;
function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
function asNumber(v: unknown, fallback = NaN): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

// axios response면 res.data
function unwrapAxios(res: unknown): unknown {
  return isRecord(res) && "data" in res ? (res as { data: unknown }).data : res;
}

// { success, data } 형태면 data
function unwrapEnvelope<T>(raw: unknown): T {
  if (isRecord(raw) && "data" in raw) return (raw as { data: T }).data;
  return raw as T;
}

// 서버가 배열 / 페이지(content) / items / results 등으로 줄 수도 있으니 흡수
function toArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw)) {
    const content = raw["content"];
    if (Array.isArray(content)) return content;
    const items = raw["items"];
    if (Array.isArray(items)) return items;
    const results = raw["results"];
    if (Array.isArray(results)) return results;
  }
  return [];
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type GridItem = {
  artworkId: number;
  imageRaw: string; // ✅ 원본 그대로 저장 → 렌더 시 resolveMediaUrl로 변환
};

function pickGridItem(row: unknown): GridItem | null {
  if (!isRecord(row)) return null;

  const artworkId =
    asNumber(row["artworkId"], NaN) ||
    asNumber(row["id"], NaN) ||
    asNumber(row["artwork_id"], NaN);

  if (!Number.isFinite(artworkId)) return null;

  // ✅ feed 응답에서 이미지 후보 키들
  const imageRaw =
    asString(row["imgUrl"], "") ||
    asString(row["imageUrl"], "") ||
    asString(row["thumbnailUrl"], "") ||
    asString(row["savedImageName"], "") ||
    asString(row["saved_image_name"], "");

  if (!imageRaw) return null;

  return { artworkId, imageRaw };
}

async function fetchFeedCandidates(): Promise<GridItem[]> {
  const res = await http.get("/api/v1/artworks/feed");
  const raw = unwrapEnvelope<unknown>(unwrapAxios(res));
  const list = toArray(raw);

  const mapped = list
    .map(pickGridItem)
    .filter((v): v is GridItem => !!v);

  // ✅ 중복 제거(artworkId)
  const seen = new Set<number>();
  const uniq: GridItem[] = [];
  for (const it of mapped) {
    if (seen.has(it.artworkId)) continue;
    seen.add(it.artworkId);
    uniq.push(it);
  }
  return uniq;
}

export default function IntroArtworkGrid({
  count = 16,
  onClickArtwork,
}: {
  count?: number;
  onClickArtwork?: (artworkId: number) => void;
}) {
  const [items, setItems] = useState<GridItem[] | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const candidates = await fetchFeedCandidates();
        const picked = shuffle(candidates).slice(0, count);
        if (mounted) setItems(picked);
      } catch {
        if (mounted) setItems([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [count]);

  const cells = useMemo(() => {
    // 로딩/실패에도 16칸 유지
    if (!items) return Array.from({ length: count }, () => null as GridItem | null);
    if (items.length >= count) return items.slice(0, count);
    return [...items, ...Array.from({ length: count - items.length }, () => null)];
  }, [items, count]);

  return (
    <div className="introGrid" aria-label="intro artwork grid">
      {cells.map((it, idx) => {
        const src = it ? resolveMediaUrl(it.imageRaw) : "";
        return (
          <button
            key={it ? it.artworkId : `sk-${idx}`}
            type="button"
            className={`introCell ${it ? "" : "skeleton"}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!it) return;
              onClickArtwork?.(it.artworkId);
            }}
            aria-label={it ? `artwork ${it.artworkId}` : "loading"}
          >
            {it && src ? (
              <img
                src={src}
                alt=""
                loading={idx < 8 ? "eager" : "lazy"}
                decoding="async"
              />
            ) : null}
          </button>
        );
      })}
      <div className="introGridVignette" aria-hidden="true" />
    </div>
  );
}
