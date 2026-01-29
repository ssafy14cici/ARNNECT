//FE\src\pages\lounge\user\Taste.tsx
import { Link } from "react-router-dom";
import "../lounge.css";
import Radar6, { type RadarItem } from "../../../components/charts/Radar6";

type RankItem = { name: string; score: number; hint?: string };

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

function DetailCard({
  title,
  items,
}: {
  title: string;
  items: RankItem[];
}) {
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

export default function Taste() {
  // TODO: API 붙이면 여기만 교체
  const topGenres: RadarItem[] = [
    { label: "추상", value: 42 },
    { label: "인물", value: 36 },
    { label: "풍경", value: 28 },
    { label: "일러스트", value: 22 },
    { label: "미니멀", value: 18 },
    { label: "팝아트", value: 12 },
  ];

  const maxGenre = Math.max(...topGenres.map((g) => g.value), 0);

  // 상세 분석 더미(원하는 형태로 바꾸기 쉬움)
  const topTags: RankItem[] = [
    { name: "#따뜻한톤", score: 19, hint: "좋아요/저장 반응 높음" },
    { name: "#선명한색감", score: 14, hint: "조회 대비 체류시간↑" },
    { name: "#드로잉", score: 11, hint: "스캔 행동과 연관" },
  ];

  const topArtists: RankItem[] = [
    { name: "Artist A", score: 12, hint: "최근 7일 조회 Top" },
    { name: "Artist B", score: 9, hint: "좋아요 전환율↑" },
    { name: "Artist C", score: 7, hint: "스캔 기반 유입" },
  ];

  const activitySummary: RankItem[] = [
    { name: "좋아요", score: 27, hint: "최근 30일" },
    { name: "조회", score: 114, hint: "최근 30일" },
    { name: "스캔", score: 6, hint: "최근 30일" },
  ];

  const hasData = topGenres.some((x) => x.value > 0);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">취향분석</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <p className="loungeSubDesc">
          활동(좋아요/조회/스캔 등)을 기반으로 취향을 요약합니다.
        </p>

        <div className="tasteSection">
          {/* ===== Top 6 ===== */}
          <section className="tasteCard tasteChartCard">
            <h2 className="tasteCardTitle">선호 장르 Top 6</h2>

            {!hasData ? (
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
            <button className="loungeSubBtn" type="button" disabled>
              분석 갱신(준비중)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
