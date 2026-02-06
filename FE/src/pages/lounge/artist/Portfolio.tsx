// FE/src/pages/lounge/artist/Portfolio.tsx

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../lounge.css";

import { useAuthStore } from "../../../features/auth/store";
import { http } from "../../../shared/api/http";

// ✅ 이미지 URL 정규화(프로젝트에 이미 있는 유틸 재사용)
import { resolveMediaUrl } from "../../artworks/detail/utils";

// ------------------- safe parsers -------------------
type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function unwrapAxiosData(res: unknown): unknown {
  return isObject(res) && "data" in res ? (res as any).data : res;
}
function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

// ------------------- Types -------------------
type ArtworkItem = {
  artworkId: number;
  title: string;
  productionDate?: string;
  thumbnailUrl?: string;
};

function parseArtworkList(raw: unknown): ArtworkItem[] {
  const body = pickEnvelopeData(raw);

  const arr = Array.isArray(body)
    ? body
    : isObject(body) && Array.isArray(get(body, "content"))
    ? (get(body, "content") as unknown[])
    : isObject(body) && Array.isArray(get(body, "items"))
    ? (get(body, "items") as unknown[])
    : [];

  const out: ArtworkItem[] = [];

  for (const r of arr) {
    if (!isObject(r)) continue;

    const artworkId = asNumber(get(r, "artworkId"), asNumber(get(r, "id"), NaN));
    if (!Number.isFinite(artworkId)) continue;

    const title = asString(get(r, "title"), "Untitled");
    const productionDate =
      asString(get(r, "productionDate"), "") ||
      asString(get(r, "production_date"), "") ||
      asString(get(r, "date"), "");

    const thumbRaw =
      asString(get(r, "thumbnailUrl"), "") ||
      asString(get(r, "imageUrl"), "") ||
      asString(get(r, "savedImageName"), "") || // new artists 응답에서 보던 필드
      asString(get(r, "thumbnail"), "") ||
      asString(get(r, "src"), "");

    const thumbnailUrl = thumbRaw ? resolveMediaUrl(thumbRaw) : "";

    out.push({ artworkId, title, productionDate: productionDate || undefined, thumbnailUrl });
  }

  return out;
}

export default function Portfolio() {
  const nav = useNavigate();

  // ✅ user 구조가 프로젝트마다 다를 수 있으니 후보 넓게
  const authUser = useAuthStore((s) => s.user);
  const myUuid = useMemo(() => {
    const u: any = authUser;
    return (
      u?.memberUuid ||
      u?.member_uuid ||
      u?.uuid ||
      u?.id ||
      ""
    );
  }, [authUser]);

  const myNickname = useAuthStore((s) => s.user?.nickname ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ArtworkItem[]>([]);

  const goExhibit = () => {
    if (!myUuid) {
      console.warn("[Portfolio] myUuid is missing. Check auth store user shape.");
      return;
    }

    nav(`/exhibit/${myUuid}`, {
      state: {
        from: "lounge-portfolio",
        artist: myNickname,
        artworkTitle: "PORTFOLIO",
        fromWaypointId: 0,
      },
    });
  };

  // ✅ 내 작품 목록 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!myUuid) {
        setItems([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // ✅ 명세 기반: artist query로 내 작품 목록
        const res = await http.get(`/api/v1/artworks`, {
          params: { artist: myUuid },
        });

        const payload = unwrapAxiosData(res);
        const list = parseArtworkList(payload);

        if (cancelled) return;
        setItems(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "작품 목록을 불러오지 못했습니다.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [myUuid]);

  const isEmpty = !loading && !error && items.length === 0;

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">포트폴리오</h1>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              className="loungeSubBtn"
              onClick={goExhibit}
              style={{ textDecoration: "none" }}
            >
              3D 전시장 보기
            </button>

            <Link className="loungeBackLink" to="/lounge">
              ← 라운지로
            </Link>
          </div>
        </div>

        <p className="loungeSubDesc">
          등록된 작품은 <strong>내 프로필</strong>의 포트폴리오 탭에 공개됩니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">작품 관리</h2>

          {/* 상태 표시 */}
          {loading && (
            <div className="loungeEmpty">불러오는 중...</div>
          )}

          {!loading && error && (
            <div className="loungeEmpty">
              작품 목록을 불러오지 못했습니다.
              <br />
              <span style={{ opacity: 0.7, fontSize: 12 }}>{error}</span>
            </div>
          )}

          {/* 리스트 */}
          {!loading && !error && items.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
              {items.map((it) => (
                <li
                  key={it.artworkId}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ width: 72, height: 72, overflow: "hidden", borderRadius: 10, background: "#111" }}>
                    {it.thumbnailUrl ? (
                      <img
                        src={it.thumbnailUrl}
                        alt={it.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                      />
                    ) : null}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {it.title}
                    </div>
                    <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
                      {it.productionDate ? `제작일: ${it.productionDate}` : "제작일: -"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Link className="loungeSubBtn" to={`/artworks/${it.artworkId}`} style={{ textDecoration: "none" }}>
                      상세
                    </Link>
                    <Link className="loungeSubBtn" to={`/artworks/${it.artworkId}/edit`} style={{ textDecoration: "none" }}>
                      수정
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Empty */}
          {isEmpty && (
            <div className="loungeEmpty">
              아직 등록된 작품이 없습니다.
              <br />
              당신의 첫 번째 작품을 등록해보세요.
            </div>
          )}

          <div className="loungeSubActions" style={{ justifyContent: "center", marginTop: 16 }}>
            <Link to="/artworks/create" className="loungeSubBtn" style={{ textDecoration: "none" }}>
              + 새 작품 등록
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
