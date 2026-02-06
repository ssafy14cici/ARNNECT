// FE/src/components/charts/Radar6.tsx
import React from "react";

export type RadarItem = {
  label: string;
  value: number;
};

type Props = {
  items: RadarItem[];
  size?: number;
  rings?: number;
  maxValue?: number;
  className?: string;
};

const ACCENT = "var(--taste-accent, #C8A97E)"; // ✅ 골드(라운지 테마 변수로 통일)

function clamp01(x: number) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function angleForIndex(i: number) {
  return -90 + i * 60; // 12시부터 시작
}

function padTo6(items: RadarItem[]) {
  const sliced = items.slice(0, 6);
  while (sliced.length < 6) sliced.push({ label: "—", value: 0 });
  return sliced;
}

function pointsToString(pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function offsetPoints(points: string, dx: number, dy: number) {
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${(x + dx).toFixed(2)},${(y + dy).toFixed(2)}`;
    })
    .join(" ");
}

export default function Radar6({
  items,
  size = 340,
  rings = 5,
  maxValue,
  className,
}: Props) {
  const id = React.useId(); // gradient/filter id 충돌 방지
  const safe = padTo6(items);

  const raw = safe.map((x) => (typeof x.value === "number" ? x.value : 0));
  const localMax = Math.max(...raw, 0);
  const denom = Math.max(1, maxValue ?? localMax);

  const values01 = raw.map((v) => clamp01(v / denom));

  const cx = size / 2;
  const cy = size / 2;

  const R = size * 0.34;
  const labelR = size * 0.45;

  // 데이터 좌표(점)
  const dataCoords = values01.map((v, i) => polarToCartesian(cx, cy, R * v, angleForIndex(i)));
  const dataPoints = pointsToString(dataCoords);

  // 가짜 입체: 살짝 아래/오른쪽으로 밀린 “바닥 그림자” 폴리곤
  const depthX = Math.max(5, Math.round(size * 0.018));
  const depthY = Math.max(7, Math.round(size * 0.024));
  const shadowPoints = offsetPoints(dataPoints, depthX, depthY);

  // 격자 링
  const gridPolygons = Array.from({ length: rings }, (_, idx) => {
    const t = (idx + 1) / rings;
    const pts = Array.from({ length: 6 }, (_, i) => polarToCartesian(cx, cy, R * t, angleForIndex(i)));
    return pointsToString(pts);
  });

  // 축 + 라벨
  const axes = safe.map((it, i) => {
    const a = angleForIndex(i);
    const outer = polarToCartesian(cx, cy, R, a);
    const labelPos = polarToCartesian(cx, cy, labelR, a);

    const textAnchor: "start" | "middle" | "end" =
      a === -90 ? "middle" : a > -90 && a < 90 ? "start" : "end";

    const dy = a === -90 ? -10 : a === 90 ? 14 : 4;

    return {
      i,
      label: it.label,
      x2: outer.x,
      y2: outer.y,
      lx: labelPos.x,
      ly: labelPos.y + dy,
      textAnchor,
    };
  });

  return (
    <div className={className}>
      <svg className="radarSvg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="선호 장르 레이더 차트">
        <defs>
          {/* ✅ 골드 그라데이션 */}
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.30} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.14} />
          </linearGradient>

          <filter id={`${id}-softShadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(0,0,0,0.25)" />
          </filter>

          {/* ✅ 블루 글로우 → 골드 글로우 */}
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(200,169,126,0.45)" />
          </filter>
        </defs>

        {/* 격자 */}
        <g className="radarGrid">
          {gridPolygons.map((pts, idx) => (
            <polygon
              key={idx}
              points={pts}
              className="radarGridPolygon"
              style={{ fill: "none", stroke: "rgba(255,255,255,0.10)", strokeWidth: 1 }}
            />
          ))}
        </g>

        {/* 축 */}
        <g className="radarAxis">
          {axes.map((ax) => (
            <line
              key={ax.i}
              x1={cx}
              y1={cy}
              x2={ax.x2}
              y2={ax.y2}
              className="radarAxisLine"
              style={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
            />
          ))}
        </g>

        {/* 데이터(입체 그림자 → 본체) */}
        <g className="radarData">
          <polygon
            points={shadowPoints}
            className="radarDataShadow"
            filter={`url(#${id}-softShadow)`}
            style={{ fill: "rgba(0,0,0,0.22)" }}
          />

          {/* ✅ CSS가 fill을 덮어써도 안 죽게 style로 강제 */}
          <polygon
            points={dataPoints}
            className="radarDataFill"
            filter={`url(#${id}-glow)`}
            style={{ fill: `url(#${id}-fill)` }}
          />

          {/* ✅ 외곽선/도트도 골드 강제 */}
          <polygon
            points={dataPoints}
            className="radarDataStroke"
            style={{ fill: "none", stroke: ACCENT, strokeWidth: 2.6 }}
          />

          {dataCoords.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3.8"
              className="radarDot"
              style={{ fill: ACCENT, stroke: "rgba(0,0,0,0.35)", strokeWidth: 1 }}
            />
          ))}
        </g>

        {/* 라벨 */}
        <g className="radarLabels">
          {axes.map((ax) => (
            <text
              key={ax.i}
              x={ax.lx}
              y={ax.ly}
              textAnchor={ax.textAnchor}
              className="radarLabel"
              style={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }}
            >
              {ax.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
