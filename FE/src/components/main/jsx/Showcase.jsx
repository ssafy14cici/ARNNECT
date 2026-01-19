import React, { useEffect, useMemo, useRef, useState } from "react";
import { artworks } from "../data/artworks";
import "../styles/home.css";

export default function Showcase() {
  const sectionRef = useRef(null);
  const [p, setP] = useState(0); // 0~1

  // 3x4 = 12장
  const picks = useMemo(() => artworks.slice(0, 12), []);

  // 섹션 내부 스크롤 진행도(0~1) 계산
  useEffect(() => {
    let raf = 0;

    const calc = () => {
      const el = sectionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const progress = total <= 0 ? 1 : scrolled / total;

      setP(progress);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(calc);
    };

    calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", calc);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", calc);
    };
  }, []);

  /**
   * ✅ 사용자가 끝까지 안내려도 12장이 다 보이게
   * p가 completeAt 지점일 때 이미 12장 모두 ON
   */
  const completeAt = 0.72; // 0.65~0.80 사이로 취향 조절
  const eased = Math.min(1, p / completeAt);

  /**
   * ✅ "링 단위" + "모서리 먼저"
   * 3x4 index:
   *  0  1  2  3
   *  4  5  6  7
   *  8  9 10 11
   *
   * 순서:
   *  1) corners: 0,3,8,11
   *  2) edges:   1,2,7,10,9,4  (위->오른->아래->왼 느낌)
   *  3) inner:   5,6
   */
  const ringOrder = useMemo(() => {
    const corners = [0, 3, 8, 11];
    const edges = [1, 2, 7, 10, 9, 4];
    const inner = [5, 6];
    return [...corners, ...edges, ...inner]; // 12개
  }, []);

  // index -> 등장 rank(0..11)
  const rankByIndex = useMemo(() => {
    const m = new Map();
    ringOrder.forEach((idx, rank) => m.set(idx, rank));
    return m;
  }, [ringOrder]);

  /**
   * ✅ 스크롤 진행도 -> visibleCount
   * ceil을 써서 마지막 1장이 너무 끝에서만 뜨는 문제를 완화
   */
  const visibleCount = Math.max(
    0,
    Math.min(12, Math.ceil(eased * 12 - 0.0001))
  );

  return (
    <section id="gallery" ref={sectionRef} className="showcaseStage">
      <div className="showcaseSticky">
        {/* 뒤: 이미지 그리드 */}
        <div className="showcaseGrid" aria-hidden="true">
          {picks.map((a, idx) => {
            const rank = rankByIndex.get(idx) ?? idx;
            const isOn = rank < visibleCount;

            // ✅ 겹침 방지: 변위/회전 값을 작게
            const dx = ((idx % 4) - 1.5) * 6; // 10 -> 6
            const dy = (Math.floor(idx / 4) - 1) * 6; // 10 -> 6
            const rot = ((idx % 3) - 1) * 1.6; // 2.2 -> 1.6

            return (
              <div
                key={a.id}
                className={`stageTile ${isOn ? "on" : ""}`}
                style={{
                  "--dx": `${dx}px`,
                  "--dy": `${dy}px`,
                  "--rot": `${rot}deg`,
                  // ✅ corners -> edges -> inner 순서대로 delay
                  transitionDelay: `${rank * 80}ms`,
                }}
              >
                <img
                  src={a.src}
                  alt=""
                  onError={() => console.error("Image failed:", a.src)}
                />
              </div>
            );
          })}
        </div>

        {/* 앞: 타이포 */}
        <div className="showcaseType">
          <div className="typeSmall">Arnnect Arts/space</div>
          <div className="typeBig">ARNNECT</div>
          <div className="typeHint">Scroll ↓</div>
        </div>
      </div>
    </section>
  );
}
