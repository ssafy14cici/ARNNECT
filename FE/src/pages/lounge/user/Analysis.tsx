// FE/src/pages/lounge/user/Analysis.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../lounge.css";
import Radar6, { type RadarItem } from "../../../shared/ui/charts/Radar6";
import { http } from "../../../shared/api/http";

type RankItem = { name: string; score: number; hint?: string };

// --------------------
// Backend response types
// --------------------
type AnalysisRankRaw = { name?: unknown; score?: unknown };
type ActivitySummaryRaw = {
  favorite_cnt?: unknown;
  comment_cnt?: unknown;
  ticket_cnt?: unknown;
};

type AnalysisResponseRaw = {
  topGenres?: unknown;
  topTags?: unknown;
  topArtists?: unknown;
  activitySummary?: unknown;
};

// envelope 가능성 대응: { success, data }
type ApiEnvelopeLike = { success?: unknown; data?: unknown };

// --------------------
// UI pieces
// --------------------
function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.round((value / max) * 100);
  return (
    <li className="tasteRow">
      <span className="tasteRowLabel">{label}</span>
      <div className="tasteBarTrack" aria-label={`${label} 비율`}>
        <div className="tasteBarFill" style={{ width: `${pct}%` }} />
      </div>
      <span className="tasteRowValue">{value}</span>
    </li>
  );
}

function DetailCard({ title, items }: { title: string; items: RankItem[] }) {
  return (
    <section className="tasteCard">
      <h3 className="tasteCardTitle">{title}</h3>
      <ul className="detailItemList">
        {items.map((it) => (
          <li key={it.name} className="detailItem">
            <div className="detailLeft">
              <span className="detailName">{it.name}</span>
              {it.hint ? <span className="detailHint">{it.hint}</span> : null}
            </div>
            <span className="detailScore">{it.score}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --------------------
// Safe parsing helpers
// --------------------
type JsonRecord = Record<string, unknown>;
function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return String(v);
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
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function unwrapAxiosData(res: unknown): unknown {
  // axios response면 res.data
  return isRecord(res) && "data" in res ? (res as { data: unknown }).data : res;
}

function unwrapEnvelope(raw: unknown): unknown {
  // { success, data } 형태면 data만 꺼냄
  if (isRecord(raw) && "data" in raw && "success" in raw) {
    const env = raw as ApiEnvelopeLike;
    return env.data;
  }
  return raw;
}

function parseRankList(raw: unknown): { name: string; score: number }[] {
  const arr = asArray(raw);
  return arr
    .map((x) => {
      const r = isRecord(x) ? (x as AnalysisRankRaw) : {};
      return {
        name: asString(r.name, "").trim(),
        score: asNumber(r.score, 0),
      };
    })
    .filter((x) => x.name.length > 0);
}

function parseActivitySummary(raw: unknown): { favorite: number; comment: number; ticket: number } {
  const r = isRecord(raw) ? (raw as ActivitySummaryRaw) : {};
  return {
    favorite: asNumber(r.favorite_cnt, 0),
    comment: asNumber(r.comment_cnt, 0),
    ticket: asNumber(r.ticket_cnt, 0),
  };
}

// 중복 장르명 합산 → score desc → top6
function normalizeTopGenres(genres: { name: string; score: number }[], limit = 6): RadarItem[] {
  const merged = new Map<string, number>();
  for (const g of genres) {
    const key = g.name.trim();
    if (!key) continue;
    merged.set(key, (merged.get(key) ?? 0) + (Number.isFinite(g.score) ? g.score : 0));
  }

  return [...merged.entries()]
    .map(([name, score]) => ({ label: name, value: score }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// --------------------
// Component
// --------------------
type LoadState = "idle" | "loading" | "ready" | "error";

export default function Analysis() {
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [topGenres, setTopGenres] = useState<RadarItem[]>([]);
  const [topTags, setTopTags] = useState<RankItem[]>([]);
  const [topArtists, setTopArtists] = useState<RankItem[]>([]);
  const [activitySummary, setActivitySummary] = useState<RankItem[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const res = await http.get("/api/v1/analysis");
      const raw1 = unwrapAxiosData(res);
      const raw2 = unwrapEnvelope(raw1);

      if (!isRecord(raw2)) {
        throw new Error("분석 응답 형식이 올바르지 않습니다.");
      }

      const body = raw2 as AnalysisResponseRaw;

      const genres = parseRankList(body.topGenres);
      const tags = parseRankList(body.topTags);
      const artists = parseRankList(body.topArtists);
      const activity = parseActivitySummary(body.activitySummary);

      const radarItems = normalizeTopGenres(genres, 6);

      setTopGenres(radarItems);

      // 태그는 UI에서 # 붙여서 보여주고 싶으면 여기서 처리
      setTopTags(tags.map((t) => ({ name: t.name.startsWith("#") ? t.name : `#${t.name}`, score: t.score })));

      setTopArtists(artists.map((a) => ({ name: a.name, score: a.score })));

      setActivitySummary([
        { name: "좋아요", score: activity.favorite, hint: "누적/기간 기준은 BE 정의" },
        { name: "댓글", score: activity.comment, hint: "누적/기간 기준은 BE 정의" },
        { name: "발급티켓", score: activity.ticket, hint: "누적/기간 기준은 BE 정의" },
      ]);

      setState("ready");
    } catch (e) {
      setError(getErrorMessage(e));
      setState("error");
      setTopGenres([]);
      setTopTags([]);
      setTopArtists([]);
      setActivitySummary([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxGenre = useMemo(() => Math.max(...topGenres.map((g) => g.value), 0), [topGenres]);
  const hasData = useMemo(() => topGenres.some((x) => x.value > 0), [topGenres]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <div className="tasteSection">
          {/* ===== Top 6 ===== */}
          <section className="tasteCard tasteChartCard">
            <h2 className="tasteCardTitle">선호 장르 Top 6</h2>

            {state === "loading" ? (
              <div className="loungeEmpty">불러오는 중…</div>
            ) : state === "error" ? (
              <div className="loungeEmpty">
                분석 데이터를 불러오지 못했습니다.
                {error ? <div style={{ marginTop: 8, opacity: 0.8 }}>{error}</div> : null}
              </div>
            ) : !hasData ? (
              <div className="loungeEmpty">분석 데이터가 없습니다.</div>
            ) : (
              <div className="tasteChartGrid">
                <Radar6 items={topGenres} />
                <ul className="tasteTopList" aria-label="선호 장르 상위 목록">
                  {topGenres.map((g) => (
                    <BarRow key={g.label} label={g.label} value={g.value} max={maxGenre} />
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ===== 상세 분석 ===== */}
          <h2 className="loungeSubPanelTitle" style={{ margin: "10px 2px 0" }}>
            상세 분석
          </h2>

          <div className="tasteDetailGrid">
            <DetailCard title="선호 태그" items={topTags} />
            <DetailCard title="선호 작가" items={topArtists} />
            <DetailCard title="활동 요약" items={activitySummary} />
          </div>

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button" onClick={load} disabled={state === "loading"}>
              분석 갱신
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
