import ScrollIndicator from "./jsx/ScrollIndicator";
import { artworks } from "../../data/artworks";
import "../../styles/home.css";

type ArtworkLike = { src?: string; imageUrl?: string };

export default function Hero() {
  const left = artworks?.[0] as ArtworkLike | undefined;
  const right = artworks?.[1] as ArtworkLike | undefined;

  // 데이터 형태가 src 또는 imageUrl일 수 있어서 둘 다 대응
  const leftSrc = left?.src ?? left?.imageUrl ?? "";
  const rightSrc = right?.src ?? right?.imageUrl ?? "";

  return (
    <section id="home" className="section">
      <div className="heroGrid">
        <div className="artThumb" style={{ justifySelf: "start", width: "min(320px, 70vw)" }}>
          {leftSrc ? <img src={leftSrc} alt="recommended artwork left" /> : null}
        </div>

        <div>
          <div style={{ display: "grid", placeItems: "center", gap: 14 }}>
            <img
              src="/arnnect_logo_ver1.png"
              alt="Arnnect"
              style={{ width: 120, height: "auto", opacity: 0.92 }}
            />
            <h1 className="bigTitle">Arnnect</h1>
            <div className="subTitle">Curated Art, Your Taste</div>
          </div>
        </div>

        <div className="artThumb" style={{ justifySelf: "end", width: "min(320px, 70vw)" }}>
          {rightSrc ? <img src={rightSrc} alt="recommended artwork right" /> : null}
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
