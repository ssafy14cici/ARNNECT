import type { CSSProperties } from "react";
import "./ticketCardModern.css";

type ExhibitionLite = {
  title?: string;
  place?: string;
  startDate?: string;
  endDate?: string;
  posterUrl?: string;
};

type Props = {
  title: string;
  priceText?: string;          // 예: "15,00 € T.T.C."
  ticketCode: string;          // 예: EXH_xxx
  dateRangeText: string;       // 예: "21.10.2024 – 27.01.2025"
  leftLabel?: string;          // 예: "FURNITURE"
  leftLabel2?: string;         // 예: "EXHIBITION"
  stubColor?: string;          // 예: "#8FB2D9"
  heroImageUrl?: string;       // 전시 이미지(포스터)
  metaLeft?: string;           // 작은 설명 텍스트
  metaRight?: string;          // 작은 설명 텍스트
  onClick?: () => void;
};

function barcodeStyleFromCode(code: string): CSSProperties {
  // code에 따라 바코드 느낌이 조금씩 달라지게(고정)
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 33 + code.charCodeAt(i)) >>> 0;

  const thick = 2 + (h % 2);      // 2~3px
  const thin = 1 + ((h >> 3) % 2);// 1~2px
  const gap = 1 + ((h >> 5) % 2); // 1~2px

  return {
    backgroundImage: `repeating-linear-gradient(
      90deg,
      #111 0px,
      #111 ${thick}px,
      transparent ${thick}px,
      transparent ${thick + gap}px,
      #111 ${thick + gap}px,
      #111 ${thick + gap + thin}px,
      transparent ${thick + gap + thin}px,
      transparent ${thick + gap + thin + gap}px
    )`,
  };
}

export default function TicketCardModern({
  title,
  priceText = "TARIF : -",
  ticketCode,
  dateRangeText,
  leftLabel = "EXHIBITION",
  leftLabel2 = "",
  stubColor = "#8FB2D9",
  heroImageUrl,
  metaLeft = "This ticket admits one visitor.",
  metaRight = "No returns, no exchange.",
  onClick,
}: Props) {
  return (
    <article className="tcm" role="button" tabIndex={0} onClick={onClick}>
      {/* LEFT STUB */}
      <aside className="tcmStub" style={{ background: stubColor }}>
        <div className="tcmStubInner">
          <div className="tcmStubBarcode" />
          <div className="tcmStubText">
            <div className="tcmStubTop">{leftLabel}</div>
            {leftLabel2 ? <div className="tcmStubTop">{leftLabel2}</div> : null}
          </div>
          <div className="tcmStubBottom">
            <div className="tcmStubCode">{ticketCode}</div>
            <div className="tcmStubDate">{dateRangeText}</div>
          </div>
        </div>
      </aside>

      {/* PERFORATION */}
      <div className="tcmPerf" aria-hidden="true" />

      {/* MAIN */}
      <section className="tcmMain">
        <header className="tcmHeader">
          <div className="tcmTitle">{title}</div>
          <div className="tcmPrice">{priceText}</div>
        </header>

        <div className="tcmMetaRow">
          <div className="tcmMeta">{metaLeft}</div>
          <div className="tcmMeta">{metaRight}</div>
        </div>

        <div className="tcmBottomRow">
          <div className="tcmDates">{dateRangeText}</div>

          <div className="tcmHero">
            <div className="tcmBubble tcmBubbleA" />
            <div className="tcmBubble tcmBubbleB" />
            <div className="tcmHeroMedia">
              {heroImageUrl ? (
                <img className="tcmHeroImg" src={heroImageUrl} alt="exhibition" />
              ) : (
                <div className="tcmHeroPh">IMAGE</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT BARCODE */}
      <aside className="tcmRight">
        <div className="tcmRightBarcode" style={barcodeStyleFromCode(ticketCode)} />
        <div className="tcmRightCode">{ticketCode}</div>
      </aside>
    </article>
  );
}
