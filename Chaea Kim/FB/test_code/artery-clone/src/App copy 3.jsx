import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";

const ROOMS = [
  {
    set: "set4",
    name: ["Kato", "Yatsumoto"],
    title: "“Understanding Life”",
    roomLabel: "Room Tenjin",
    date: "25 Mar – 11 May 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["3", "6"], left: ["7", "1", "2"], right: ["4", "5", "8"] },
  },
  {
    set: "set2",
    name: ["Aiko", "Akiyama"],
    title: "“Faces of Peace”",
    roomLabel: "Room Suijin",
    date: "31 Mar – 25 Apr 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["1", "6"], left: ["3", "4", "5"], right: ["8", "7", "2"] },
  },
  {
    set: "set3",
    name: ["Misako", "Shiraishi"],
    title: "“Instant Gratification”",
    roomLabel: "Room Izanami",
    date: "4 Apr – 30 Apr 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["1", "6"], left: ["3", "4", "5"], right: ["8", "7", "2"] },
  },
  {
    set: "set1",
    name: ["Tadashi", "Takayama"],
    title: "“Facts of Blossoms”",
    roomLabel: "Room Raijin",
    date: "15 Apr – 18 May 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["3", "6"], left: ["7", "1", "2"], right: ["4", "5", "8"] },
  },
  {
    set: "set5",
    name: ["Etsuko", "Hamasaki"],
    title: "“In Loving Memory”",
    roomLabel: "Room Hachiman",
    date: "5 May – 17 Jun 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["7", "5"], left: ["6", "4", "3"], right: ["2", "1", "8"] },
  },
];

function imgUrl(set, n) {
  return `https://tympanus.net/Development/Exhibition/img/${set}/${n}.jpg`;
}

function SvgDefs() {
  return (
    <svg className="hidden" aria-hidden="true">
      <symbol id="icon-arrow" viewBox="0 0 24 24">
        <polygon points="6.3,12.8 20.9,12.8 20.9,11.2 6.3,11.2 10.2,7.2 9,6 3.1,12 9,18 10.2,16.8 " />
      </symbol>
      <symbol id="icon-drop" viewBox="0 0 24 24">
        <path d="M12,21c-3.6,0-6.6-3-6.6-6.6C5.4,11,10.8,4,11.4,3.2C11.6,3.1,11.8,3,12,3s0.4,0.1,0.6,0.3c0.6,0.8,6.1,7.8,6.1,11.2C18.6,18.1,15.6,21,12,21zM12,4.8c-1.8,2.4-5.2,7.4-5.2,9.6c0,2.9,2.3,5.2,5.2,5.2s5.2-2.3,5.2-5.2C17.2,12.2,13.8,7.3,12,4.8z" />
        <path d="M12,18.2c-0.4,0-0.7-0.3-0.7-0.7s0.3-0.7,0.7-0.7c1.3,0,2.4-1.1,2.4-2.4c0-0.4,0.3-0.7,0.7-0.7c0.4,0,0.7,0.3,0.7,0.7C15.8,16.5,14.1,18.2,12,18.2z" />
      </symbol>
      <symbol id="icon-menu" viewBox="0 0 24 24">
        <path d="M24,5.8H0v-2h24V5.8z M19.8,11H4.2v2h15.6V11z M24,18.2H0v2h24V18.2z" />
      </symbol>
      <symbol id="icon-cross" viewBox="0 0 24 24">
        <path d="M13.4,12l7.8,7.8l-1.4,1.4l-7.8-7.8l-7.8,7.8l-1.4-1.4l7.8-7.8L2.7,4.2l1.4-1.4l7.8,7.8l7.8-7.8l1.4,1.4L13.4,12z" />
      </symbol>
      <symbol id="icon-info" viewBox="0 0 20 20">
        <circle style={{ fill: "#fff" }} cx="10" cy="10" r="9.1" />
        <path d="M10,0C4.5,0,0,4.5,0,10s4.5,10,10,10s10-4.5,10-10S15.5,0,10,0z M10,18.6c-4.7,0-8.6-3.9-8.6-8.6S5.3,1.4,10,1.4s8.6,3.9,8.6,8.6S14.7,18.6,10,18.6z M10.7,5C10.9,5.2,11,5.5,11,5.7s-0.1,0.5-0.3,0.7c-0.2,0.2-0.4,0.3-0.7,0.3c-0.3,0-0.5-0.1-0.7-0.3C9.1,6.2,9,6,9,5.7S9.1,5.2,9.3,5C9.5,4.8,9.7,4.7,10,4.7C10.3,4.7,10.5,4.8,10.7,5z M9.3,8.3h1.4v7.2H9.3V8.3z" />
      </symbol>
    </svg>
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function Exhibition() {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);

  const [idx, setIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // 전시실 이동 상태(멈칫 제거: transitionend 체인)
  const [navDir, setNavDir] = useState(null); // "next" | "prev" | null
  const [navPhase, setNavPhase] = useState(null); // "out" | "in" | null

  const current = ROOMS[idx];

  // (A) “공간 안에서만” 커서 시점 이동: scroller 변수만 변경
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.classList.add("is-pointer");

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;

    const tick = () => {
      raf = 0;
      curX += (targetX - curX) * 0.10;
      curY += (targetY - curY) * 0.10;

      // “방 안에서 고개/몸을 살짝 움직이는 느낌”
      const pxX = curX * 22;      // 좌우 이동량(px)
      const pxY = curY * 10;      // 상하 이동량(px)
      const rotY = curX * 2.2;    // 좌우 회전(deg)
      const rotX = -curY * 1.4;   // 상하 회전(deg)

      scroller.style.setProperty("--camX", `${pxX}px`);
      scroller.style.setProperty("--camY", `${pxY}px`);
      scroller.style.setProperty("--camRotY", `${rotY}deg`);
      scroller.style.setProperty("--camRotX", `${rotX}deg`);

      if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e) => {
      // 화면 전체 기준이 아니라 “현재 보이는 공간” 기준으로만 반응
      const r = scroller.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      targetX = clamp(x, -1, 1);
      targetY = clamp(y, -1, 1);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // (B) 전시실 이동: out -> idx 변경 -> in -> neutral (setTimeout 없음)
  const go = (dir) => {
    if (navPhase) return;
    const next = dir === "next" ? idx + 1 : idx - 1;
    if (next < 0 || next >= ROOMS.length) return;

    setMenuOpen(false);
    setInfoOpen(false);

    setNavDir(dir);
    setNavPhase("out");
  };

  const onScrollerTransitionEnd = (e) => {
    // transform transition만 처리
    if (e.propertyName !== "transform") return;
    if (!navPhase || !navDir) return;

    if (navPhase === "out") {
      const next = navDir === "next" ? idx + 1 : idx - 1;
      setIdx(next);
      setNavPhase("in");
      return;
    }

    if (navPhase === "in") {
      setNavPhase(null);
      setNavDir(null);
    }
  };

  const scrollerClass = useMemo(() => {
    if (!navPhase || !navDir) return "scroller";
    if (navPhase === "out" && navDir === "next") return "scroller nav-out-next";
    if (navPhase === "in" && navDir === "next") return "scroller nav-in-next";
    if (navPhase === "out" && navDir === "prev") return "scroller nav-out-prev";
    if (navPhase === "in" && navDir === "prev") return "scroller nav-in-prev";
    return "scroller";
  }, [navPhase, navDir]);

  // in-phase가 시작되면 “자연스럽게 neutral로 돌아오게” 한 번 더 트리거
  useEffect(() => {
    if (navPhase !== "in") return;
    const id = requestAnimationFrame(() => {
      // in 상태로 한 프레임 렌더 후 neutral로 복귀(연속 움직임)
      setNavPhase(null);
      setNavDir(null);
    });
    return () => cancelAnimationFrame(id);
    // 의도적으로 idx는 dependency에 포함하지 않음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navPhase]);

  const onClickImg = (side, i) => {
    navigate(`/detail/${idx}/${side}/${i}`);
  };

  return (
    <div className="app">
      <SvgDefs />

      <div className="container">
        <div
          ref={scrollerRef}
          className={scrollerClass}
          onTransitionEnd={onScrollerTransitionEnd}
        >
          {ROOMS.map((r, rIdx) => (
            <div key={r.set + rIdx} className={`room ${rIdx === idx ? "room--current" : ""}`}>
              <div className="room__side room__side--back">
                {r.images.back.map((n, i) => (
                  <img
                    key={`b-${n}-${i}`}
                    className="room__img"
                    src={imgUrl(r.set, n)}
                    alt="Artwork"
                    onClick={() => onClickImg("back", i)}
                  />
                ))}
              </div>

              <div className="room__side room__side--left">
                {r.images.left.map((n, i) => (
                  <img
                    key={`l-${n}-${i}`}
                    className="room__img"
                    src={imgUrl(r.set, n)}
                    alt="Artwork"
                    onClick={() => onClickImg("left", i)}
                  />
                ))}
              </div>

              <div className="room__side room__side--right">
                {r.images.right.map((n, i) => (
                  <img
                    key={`r-${n}-${i}`}
                    className="room__img"
                    src={imgUrl(r.set, n)}
                    alt="Artwork"
                    onClick={() => onClickImg("right", i)}
                  />
                ))}
              </div>

              <div className="room__side room__side--bottom" />
            </div>
          ))}
        </div>
      </div>

      <div className="content">
        <header className="codrops-header">
          <div className="codrops-links">
            <a className="codrops-icon codrops-icon--prev" href="#" onClick={(e) => e.preventDefault()} title="Prev">
              <svg className="icon icon--arrow">
                <use xlinkHref="#icon-arrow" />
              </svg>
            </a>
            <a className="codrops-icon codrops-icon--drop" href="#" onClick={(e) => e.preventDefault()} title="Drop">
              <svg className="icon icon--drop">
                <use xlinkHref="#icon-drop" />
              </svg>
            </a>
          </div>

          <h1 className="codrops-header__title">3D Room Exhibition</h1>
          <div className="subject">{current.subject}</div>

          <button
            className={`btn btn--info btn--toggle ${infoOpen ? "btn--active" : ""}`}
            type="button"
            onClick={() => {
              setInfoOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            <svg className="icon icon--info"><use xlinkHref="#icon-info" /></svg>
            <svg className="icon icon--cross"><use xlinkHref="#icon-cross" /></svg>
          </button>

          <button
            className={`btn btn--menu btn--toggle ${menuOpen ? "btn--active" : ""}`}
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setInfoOpen(false);
            }}
          >
            <svg className="icon icon--menu"><use xlinkHref="#icon-menu" /></svg>
            <svg className="icon icon--cross"><use xlinkHref="#icon-cross" /></svg>
          </button>

          {/* 첨부처럼 풀스크린 레드 오버레이 */}
          <div className={`overlay overlay--menu ${menuOpen ? "overlay--open" : ""}`}>
            <ul className="menu">
              <li className="menu__item menu__item--current">
                <a className="menu__link" href="#" onClick={(e) => e.preventDefault()}>exhibitions</a>
              </li>
              <li className="menu__item">
                <a className="menu__link" href="#" onClick={(e) => e.preventDefault()}>discover</a>
              </li>
              <li className="menu__item">
                <a className="menu__link" href="#" onClick={(e) => e.preventDefault()}>visit us</a>
              </li>
              <li className="menu__item">
                <a className="menu__link" href="#" onClick={(e) => e.preventDefault()}>shop</a>
              </li>
            </ul>
          </div>

          <div className={`overlay overlay--info ${infoOpen ? "overlay--open" : ""}`}>
            <p className="info">
              &ldquo;Life in Pieces&rdquo; is the subject of all exhibitions taking place in the Mirai Art Gallery in 2017.
              Fragments of lost memories, fleeting moments and the breaking apart of human nature are this year's highlighted topics.
              Come visit us.
            </p>
          </div>
        </header>

        <h4 className="location">{current.location}</h4>

        <div className="slides">
          <div className="slide slide--current">
            <h2 className="slide__name">
              {current.name[0]} <br />
              {current.name[1]}
            </h2>
            <h3 className="slide__title">
              <span>{current.title}</span>
              <div className="slide__number">{current.roomLabel}</div>
            </h3>
            <p className="slide__date">{current.date}</p>
          </div>
        </div>

        <nav className="nav">
          <button className="btn btn--nav btn--nav-left" type="button" onClick={() => go("prev")} disabled={idx === 0}>
            <svg className="nav-icon nav-icon--left" width="42px" height="12px" viewBox="0 0 70 20">
              <path className="nav__triangle" d="M52.5,10L70,0v20L52.5,10z" />
              <path className="nav__line" d="M55.1,11.4H0V8.6h55.1V11.4z" />
            </svg>
          </button>

          <button
            className="btn btn--nav btn--nav-right"
            type="button"
            onClick={() => go("next")}
            disabled={idx === ROOMS.length - 1}
          >
            <svg className="nav-icon nav-icon--right" width="42px" height="12px" viewBox="0 0 70 20">
              <path className="nav__triangle" d="M52.5,10L70,0v20L52.5,10z" />
              <path className="nav__line" d="M55.1,11.4H0V8.6h55.1V11.4z" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}

function DetailPage() {
  const navigate = useNavigate();
  const { room, side, idx } = useParams();

  const rIdx = Number(room);
  const iIdx = Number(idx);

  const r = ROOMS[rIdx];
  const n = r?.images?.[side]?.[iIdx];
  const src = r && n ? imgUrl(r.set, n) : null;

  return (
    <div className="detailOverlay">
      <div className="detailCard">
        <div className="detailImgWrap">{src ? <img className="detailImg" src={src} alt="" /> : "Invalid"}</div>
        <div style={{ padding: 10 }}>
          <h2 style={{ margin: 0 }}>{r ? `${r.name[0]} ${r.name[1]}` : "Not found"}</h2>
          <p style={{ marginTop: 10, opacity: 0.75 }}>{r?.title}</p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="detailBtn" onClick={() => navigate(-1)}>Back</button>
            <button className="detailBtn" onClick={() => navigate("/")}>Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Exhibition />} />
        <Route path="/detail/:room/:side/:idx" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
