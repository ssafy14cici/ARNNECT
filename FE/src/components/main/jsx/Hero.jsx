import React from "react";
import ScrollIndicator from "./ScrollIndicator";
import { artworks } from "../data/artworks";
import "../styles/home.css";

export default function Hero() {
  // 추천 작품 예시(좌/우)
  const left = artworks[0];
  const right = artworks[1];

  return (
    <section id="home" className="section">
      <div className="heroGrid">
        <div className="artThumb" style={{ justifySelf: "start", width: "min(320px, 70vw)" }}>
          <img src={left.src} alt="recommended artwork left" />
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
          <img src={right.src} alt="recommended artwork right" />
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}
