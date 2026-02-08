// FE/src/pages/lounge/user/collectbook/TicketCardModern.tsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import "./ticketCardModern.css";

import { http } from "../../../../shared/api/http";
import { resolveMediaUrl } from "../../../../features/tickets/resolveTicketMedia";

type Props = {
  title: string;
  priceText?: string; // 예: "15,00 € T.T.C."
  ticketCode: string; // 예: EXH_xxx
  dateRangeText: string; // 예: "21.10.2024 – 27.01.2025"
  leftLabel?: string; // 예: "FURNITURE"
  leftLabel2?: string; // 예: "EXHIBITION"
  stubColor?: string; // 예: "#8FB2D9"
  heroImageUrl?: string; // 전시 이미지(포스터)
  metaLeft?: string; // 작은 설명 텍스트
  metaRight?: string; // 작은 설명 텍스트
  onClick?: () => void;
  showCode?: boolean;
};

function barcodeStyleFromCode(code: string): CSSProperties {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 33 + code.charCodeAt(i)) >>> 0;

  const thick = 2 + (h % 2); // 2~3px
  const thin = 1 + ((h >> 3) % 2); // 1~2px
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

/** 카드 내 이미지: 경로 정규화 + (필요 시) auth blob fallback */
function HeroImage({ src, alt }: { src?: string; alt: string }) {
  const resolved = useMemo(() => resolveMediaUrl(src), [src]);

  const [displaySrc, setDisplaySrc] = useState<string>("");
  const [triedBlob, setTriedBlob] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // src 바뀌면 초기화
    setDisplaySrc(resolved);
    setTriedBlob(false);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [resolved]);

  if (!resolved || !displaySrc) return null;

  const requestUrl =
    /^https?:\/\//i.test(resolved) ? resolved : `${window.location.origin}${resolved}`;

  return (
    <img
      className="tcmHeroImg"
      src={displaySrc}
      alt={alt}
      onError={async () => {
        // 1) 일반 <img> 로드 실패 → 2) Authorization 포함 blob 시도 → 3) 실패면 숨김
        if (triedBlob) {
          setDisplaySrc("");
          return;
        }

        try {
          setTriedBlob(true);
          const res = await http.get(requestUrl, { responseType: "blob" });
          const objUrl = URL.createObjectURL(res.data);
          blobUrlRef.current = objUrl;
          setDisplaySrc(objUrl);
        } catch {
          setDisplaySrc("");
        }
      }}
    />
  );
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
  showCode = false,
}: Props) {
  const clickable = typeof onClick === "function";

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="tcm"
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {/* LEFT STUB */}
      <aside className="tcmStub" style={{ background: stubColor }}>
        <div className="tcmStubInner">
          <div className="tcmStubBarcode" />
          <div className="tcmStubText">
            <div className="tcmStubTop">{leftLabel}</div>
            {leftLabel2 ? <div className="tcmStubTop">{leftLabel2}</div> : null}
          </div>
          <div className="tcmStubBottom">
            {showCode ? <div className="tcmStubCode">{ticketCode}</div> : null}
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
                <HeroImage src={heroImageUrl} alt="exhibition" />
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
        {showCode ? <div className="tcmRightCode">{ticketCode}</div> : null}
      </aside>
    </article>
  );
}
