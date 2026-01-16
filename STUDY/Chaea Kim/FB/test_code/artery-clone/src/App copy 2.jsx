import React, { useEffect, useMemo, useRef, useState } from "react";
// 애니메이션까지 붙일 거면 아래 주석 해제
import imagesLoaded from "imagesloaded";
import anime from "animejs/lib/anime.es.js";

const ROOMS = [
  {
    set: "set4",
    back: ["3", "6"],
    left: ["7", "1", "2"],
    right: ["4", "5", "8"],
  },
  {
    set: "set2",
    back: ["1", "6"],
    left: ["3", "4", "5"],
    right: ["8", "7", "2"],
  },
  {
    set: "set3",
    back: ["1", "6"],
    left: ["3", "4", "5"],
    right: ["8", "7", "2"],
  },
  {
    set: "set1",
    back: ["3", "6"],
    left: ["7", "1", "2"],
    right: ["4", "5", "8"],
  },
  {
    set: "set5",
    back: ["7", "5"],
    left: ["6", "4", "3"],
    right: ["2", "1", "8"],
  },
];

const SLIDES = [
  { name1: "Kato", name2: "Yatsumoto", title: "Understanding Life", room: "Tenjin", date: "25 Mar – 11 May 2017" },
  { name1: "Aiko", name2: "Akiyama", title: "Faces of Peace", room: "Suijin", date: "31 Mar – 25 Apr 2017" },
  { name1: "Misako", name2: "Shiraishi", title: "Instant Gratification", room: "Izanami", date: "4 Apr – 30 Apr 2017" },
  { name1: "Tadashi", name2: "Takayama", title: "Facts of Blossoms", room: "Raijin", date: "15 Apr – 18 May 2017" },
  { name1: "Etsuko", name2: "Hamasaki", title: "In Loving Memory", room: "Hachiman", date: "5 May – 17 Jun 2017" },
];

function imgUrl(set, n) {
  return `https://tympanus.net/Development/Exhibition/img/${set}/${n}.jpg`;
}

function SvgDefs() {
  return (
    <svg className="hidden">
      <symbol id="icon-arrow" viewBox="0 0 24 24">
        <title>arrow</title>
        <polygon points="6.3,12.8 20.9,12.8 20.9,11.2 6.3,11.2 10.2,7.2 9,6 3.1,12 9,18 10.2,16.8 " />
      </symbol>
      <symbol id="icon-drop" viewBox="0 0 24 24">
        <title>drop</title>
        <path d="M12,21c-3.6,0-6.6-3-6.6-6.6C5.4,11,10.8,4,11.4,3.2C11.6,3.1,11.8,3,12,3s0.4,0.1,0.6,0.3c0.6,0.8,6.1,7.8,6.1,11.2C18.6,18.1,15.6,21,12,21zM12,4.8c-1.8,2.4-5.2,7.4-5.2,9.6c0,2.9,2.3,5.2,5.2,5.2s5.2-2.3,5.2-5.2C17.2,12.2,13.8,7.3,12,4.8z" />
        <path d="M12,18.2c-0.4,0-0.7-0.3-0.7-0.7s0.3-0.7,0.7-0.7c1.3,0,2.4-1.1,2.4-2.4c0-0.4,0.3-0.7,0.7-0.7c0.4,0,0.7,0.3,0.7,0.7C15.8,16.5,14.1,18.2,12,18.2z" />
      </symbol>
      <symbol id="icon-menu" viewBox="0 0 24 24">
        <title>menu</title>
        <path d="M24,5.8H0v-2h24V5.8z M19.8,11H4.2v2h15.6V11z M24,18.2H0v2h24V18.2z" />
      </symbol>
      <symbol id="icon-cross" viewBox="0 0 24 24">
        <title>cross</title>
        <path d="M13.4,12l7.8,7.8l-1.4,1.4l-7.8-7.8l-7.8,7.8l-1.4-1.4l7.8-7.8L2.7,4.2l1.4-1.4l7.8,7.8l7.8-7.8l1.4,1.4L13.4,12z" />
      </symbol>
      <symbol id="icon-info" viewBox="0 0 20 20">
        <title>info</title>
        <circle style={{ fill: "#fff" }} cx="10" cy="10" r="9.1" />
        <path d="M10,0C4.5,0,0,4.5,0,10s4.5,10,10,10s10-4.5,10-10S15.5,0,10,0z M10,18.6c-4.7,0-8.6-3.9-8.6-8.6S5.3,1.4,10,1.4s8.6,3.9,8.6,8.6S14.7,18.6,10,18.6z M10.7,5C10.9,5.2,11,5.5,11,5.7s-0.1,0.5-0.3,0.7c-0.2,0.2-0.4,0.3-0.7,0.3c-0.3,0-0.5-0.1-0.7-0.3C9.1,6.2,9,6,9,5.7S9.1,5.2,9.3,5C9.5,4.8,9.7,4.7,10,4.7C10.3,4.7,10.5,4.8,10.7,5z M9.3,8.3h1.4v7.2H9.3V8.3z" />
      </symbol>
    </svg>
  );
}

function Room({ room, isCurrent }) {
  return (
    <div className={`room ${isCurrent ? "room--current" : ""}`}>
      <div className="room__side room__side--back">
        {room.back.map((n) => (
          <img key={`b-${n}`} className="room__img" src={imgUrl(room.set, n)} alt="Some image" />
        ))}
      </div>

      <div className="room__side room__side--left">
        {room.left.map((n) => (
          <img key={`l-${n}`} className="room__img" src={imgUrl(room.set, n)} alt="Some image" />
        ))}
      </div>

      <div className="room__side room__side--right">
        {room.right.map((n) => (
          <img key={`r-${n}`} className="room__img" src={imgUrl(room.set, n)} alt="Some image" />
        ))}
      </div>

      <div className="room__side room__side--bottom"></div>
    </div>
  );
}

function Slide({ slide, isCurrent }) {
  return (
    <div className={`slide ${isCurrent ? "slide--current" : ""}`}>
      <h2 className="slide__name">
        {slide.name1} <br />
        {slide.name2}
      </h2>
      <h3 className="slide__title">
        <span>&ldquo;{slide.title}&rdquo;</span>
        <div className="slide__number">
          Room <strong>{slide.room}</strong>
        </div>
      </h3>
      <p className="slide__date">{slide.date}</p>
    </div>
  );
}

export default function App() {
  const [idx, setIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollerRef = useRef(null);

  const total = useMemo(() => Math.min(ROOMS.length, SLIDES.length), []);

  const go = (dir) => {
    setIdx((prev) => {
      const next = dir === "next" ? (prev + 1) % total : (prev - 1 + total) % total;
      return next;
    });
  };

  // 이미지 로딩 완료 후 로더 숨김 (간단 버전: window load)
  useEffect(() => {
    const onLoad = () => setLoading(false);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // 원본처럼 키보드로 이동
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go("next");
      if (e.key === "ArrowLeft") go("prev");
      if (e.key === "Escape") {
        setMenuOpen(false);
        setInfoOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 여기서 원본 main.js의 “스크롤/카메라 이동”을 붙이려면
  // scrollerRef.current 와 .room DOM을 타겟으로 애니메이션을 걸면 됨.

  return (
    <>
      <SvgDefs />

      <div className="container">
        <div className="scroller" ref={scrollerRef}>
          {ROOMS.slice(0, total).map((r, i) => (
            <Room key={`${r.set}-${i}`} room={r} isCurrent={i === idx} />
          ))}
        </div>
      </div>

      <div className="content">
        <header className="codrops-header">
          <div className="codrops-links">
            <a className="codrops-icon codrops-icon--prev" href="#" title="Previous Demo">
              <svg className="icon icon--arrow">
                <use xlinkHref="#icon-arrow"></use>
              </svg>
            </a>
            <a className="codrops-icon codrops-icon--drop" href="#" title="Back to the article">
              <svg className="icon icon--drop">
                <use xlinkHref="#icon-drop"></use>
              </svg>
            </a>
          </div>

          <h1 className="codrops-header__title">3D Room Exhibition</h1>
          <div className="subject">モダンアート</div>

          <button
            className={`btn btn--info btn--toggle ${infoOpen ? "btn--active" : ""}`}
            onClick={() => setInfoOpen((v) => !v)}
            type="button"
          >
            <svg className="icon icon--info">
              <use xlinkHref="#icon-info"></use>
            </svg>
            <svg className="icon icon--cross">
              <use xlinkHref="#icon-cross"></use>
            </svg>
          </button>

          <button
            className={`btn btn--menu btn--toggle ${menuOpen ? "btn--active" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            type="button"
          >
            <svg className="icon icon--menu">
              <use xlinkHref="#icon-menu"></use>
            </svg>
            <svg className="icon icon--cross">
              <use xlinkHref="#icon-cross"></use>
            </svg>
          </button>

          <div className={`overlay overlay--menu ${menuOpen ? "overlay--open" : ""}`}>
            <ul className="menu">
              <li className="menu__item menu__item--current">
                <a className="menu__link" href="#">
                  Exhibitions
                </a>
              </li>
              <li className="menu__item">
                <a className="menu__link" href="#">
                  Discover
                </a>
              </li>
              <li className="menu__item">
                <a className="menu__link" href="#">
                  Visit us
                </a>
              </li>
              <li className="menu__item">
                <a className="menu__link" href="#">
                  Shop
                </a>
              </li>
            </ul>
          </div>

          <div className={`overlay overlay--info ${infoOpen ? "overlay--open" : ""}`}>
            <p className="info">
              &ldquo;Life in Pieces&rdquo; is the subject of all exhibitions taking place in the Mirai Art Gallery in 2017.
              Fragments of lost memories, fleeting moments and the breaking apart of human nature are this year's highlighted
              topics. We welcome you to a exploration space of a unique kind&mdash;the one that will stay with you and impact
              you on many levels. Come visit us.
            </p>
          </div>
        </header>

        <h4 className="location">Mirai Art Gallery &amp; Exhibition Center, Sapporo, Japan</h4>

        <div className="slides">
          {SLIDES.slice(0, total).map((s, i) => (
            <Slide key={`${s.room}-${i}`} slide={s} isCurrent={i === idx} />
          ))}
        </div>

        <nav className="nav">
          <button className="btn btn--nav btn--nav-left" type="button" onClick={() => go("prev")}>
            <svg className="nav-icon nav-icon--left" width="42px" height="12px" viewBox="0 0 70 20">
              <path className="nav__triangle" d="M52.5,10L70,0v20L52.5,10z" />
              <path className="nav__line" d="M55.1,11.4H0V8.6h55.1V11.4z" />
            </svg>
          </button>

          <button className="btn btn--nav btn--nav-right" type="button" onClick={() => go("next")}>
            <svg className="nav-icon nav-icon--right" width="42px" height="12px" viewBox="0 0 70 20">
              <path className="nav__triangle" d="M52.5,10L70,0v20L52.5,10z" />
              <path className="nav__line" d="M55.1,11.4H0V8.6h55.1V11.4z" />
            </svg>
          </button>
        </nav>
      </div>

      <div className={`overlay overlay--loader ${loading ? "overlay--active" : ""}`}>
        <div className="loader">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </>
  );
}
