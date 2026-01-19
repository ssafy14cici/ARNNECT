import { useEffect, useMemo, useRef, useState } from "react";
import { artworks } from "../../data/artworks";
import "../../styles/home.css";

type ArtworkLike = { src?: string; imageUrl?: string };

export default function ShowcaseStage() {
  const stageRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  const items = useMemo(() => {
    // 12칸 채우기(부족하면 반복)
    const list = (artworks ?? []) as ArtworkLike[];
    if (list.length === 0) return Array.from({ length: 12 }, () => ({ imageUrl: "" }));
    return Array.from({ length: 12 }, (_, i) => list[i % list.length]);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = stageRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;

      // rect.top이 0 -> 시작, rect.bottom이 0 -> 끝
      const total = rect.height - viewH;
      if (total <= 0) {
        setProgress(0);
        return;
      }

      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(scrolled / total);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 진행도에 따라 몇 개 타일을 켤지(0~12)
  const onCount = Math.round(progress * 12);

  // 타일별 살짝 다른 초기 오프셋(감각용)
  const offsets = [
    { dx: "-10px", dy: "0px", rot: "-2deg" },
    { dx: "6px", dy: "-6px", rot: "1deg" },
    { dx: "0px", dy: "10px", rot: "2deg" },
    { dx: "10px", dy: "4px", rot: "-1deg" },
  ];

  return (
    <section ref={(n) => (stageRef.current = n)} className="showcaseStage">
      <div className="showcaseSticky">
        <div className="showcaseGrid" aria-hidden="true">
          {items.map((it, idx) => {
            const src = it.src ?? it.imageUrl ?? "";
            const isOn = idx < onCount;
            const o = offsets[idx % offsets.length];

            return (
              <div
                key={idx}
                className={`stageTile ${isOn ? "on" : ""}`}
                style={
                  {
                    ["--dx" as any]: o.dx,
                    ["--dy" as any]: o.dy,
                    ["--rot" as any]: o.rot,
                  } as React.CSSProperties
                }
              >
                {src ? <img src={src} alt={`artwork ${idx + 1}`} loading="lazy" /> : null}
              </div>
            );
          })}
        </div>

        <div className="showcaseType">
          <div>
            <div className="typeSmall">curated selection</div>
            <div className="typeBig">Showcase</div>
            <div className="typeHint">scroll to reveal</div>
          </div>
        </div>
      </div>
    </section>
  );
}
