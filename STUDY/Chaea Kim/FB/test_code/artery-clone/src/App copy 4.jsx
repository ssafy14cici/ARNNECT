import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";

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

function preloadRoom(room) {
  if (!room) return;
  const all = [...room.images.back, ...room.images.left, ...room.images.right];
  all.forEach((n) => {
    const im = new Image();
    im.decoding = "async";
    im.src = imgUrl(room.set, n);
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function SvgDefs() {
  return (
    <svg className="hidden" aria-hidden="true">
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

function Exhibition() {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);

  const [idx, setIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const current = ROOMS[idx];

  // preload: 현재/다음/이전
  useEffect(() => {
    preloadRoom(current);
    preloadRoom(ROOMS[idx + 1]);
    preloadRoom(ROOMS[idx - 1]);
  }, [idx]); // eslint-disable-line

  // 커서 시점 이동: scroller에만 반영
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.classList.add("is-pointer");

    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let raf = 0;

    const tick = () => {
      raf = 0;
      curX += (targetX - curX) * 0.10;
      curY += (targetY - curY) * 0.10;

      const pxX = curX * 22;
      const pxY = curY * 10;
      const rotY = curX * 2.2;
      const rotX = -curY * 1.4;

      scroller.style.setProperty("--camX", `${pxX}px`);
      scroller.style.setProperty("--camY", `${pxY}px`);
      scroller.style.setProperty("--camRotY", `${rotY}deg`);
      scroller.style.setProperty("--camRotX", `${rotX}deg`);

      if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e) => {
      const r = scroller.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      targetX = clamp(x, -1, 1);
      targetY = clamp(y, -1, 1);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      targetX = 0; targetY = 0;
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

  // 전환: “멈칫 없이” idx를 즉시 바꾸고, scroller에 nav 클래스만 잠깐 주기
  const nudgeCamera = (dir) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.classList.remove("nav-next", "nav-prev");
    // rAF 2번으로 class 토글 → transition이 확실히 발동(타이머 X)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scroller.classList.add(dir === "next" ? "nav-next" : "nav-prev");
        // transition 끝나면 원복
        const onEnd = (e) => {
          if (e.propertyName !== "transform") return;
          scroller.classList.remove("nav-next", "nav-prev");
          scroller.removeEventListener("transitionend", onEnd);
        };
        scroller.addEventListener("transitionend", onEnd);
      });
    });
  };

  const go = (dir) => {
    const next = dir === "next" ? idx + 1 : idx - 1;
    if (next < 0 || next >= ROOMS.length) return;

    setMenuOpen(false);
    setInfoOpen(false);

    // 1) 시점 이동 효과 즉시
    nudgeCamera(dir);
    // 2) 전시실도 즉시 교체(멈칫 제거)
    setIdx(next);
  };

  const onClickImg = (side, i) => {
    navigate(`/detail/${idx}/${side}/${i}`);
  };

  const onMenuNav = (path) => {
    setMenuOpen(false);
    setInfoOpen(false);
    navigate(path);
  };

  return (
    <>
      <SvgDefs />

      <div className="container">
        <div className="scroller is-pointer" ref={scrollerRef}>
          {/* room은 “하나만” 렌더링 */}
          <div className="room room--current">
            <div className="room__side room__side--back">
              {current.images.back.map((n, i) => (
                <img key={`b-${n}-${i}`} className="room__img" src={imgUrl(current.set, n)} alt="" onClick={() => onClickImg("back", i)} />
              ))}
            </div>
            <div className="room__side room__side--left">
              {current.images.left.map((n, i) => (
                <img key={`l-${n}-${i}`} className="room__img" src={imgUrl(current.set, n)} alt="" onClick={() => onClickImg("left", i)} />
              ))}
            </div>
            <div className="room__side room__side--right">
              {current.images.right.map((n, i) => (
                <img key={`r-${n}-${i}`} className="room__img" src={imgUrl(current.set, n)} alt="" onClick={() => onClickImg("right", i)} />
              ))}
            </div>
            <div className="room__side room__side--bottom" />
          </div>
        </div>
      </div>

      <div className="content">
        <header className="codrops-header">
          <h1 className="codrops-header__title">3D Room Exhibition</h1>
          <div className="subject">{current.subject}</div>

          <button
            className={`btn btn--info btn--toggle ${infoOpen ? "btn--active" : ""}`}
            type="button"
            onClick={() => { setInfoOpen(v => !v); setMenuOpen(false); }}
          >
            <svg className="icon icon--info"><use xlinkHref="#icon-info" /></svg>
            <svg className="icon icon--cross"><use xlinkHref="#icon-cross" /></svg>
          </button>

          <button
            className={`btn btn--menu btn--toggle ${menuOpen ? "btn--active" : ""}`}
            type="button"
            onClick={() => { setMenuOpen(v => !v); setInfoOpen(false); }}
          >
            <svg className="icon icon--menu"><use xlinkHref="#icon-menu" /></svg>
            <svg className="icon icon--cross"><use xlinkHref="#icon-cross" /></svg>
          </button>

          {/* 풀스크린 메뉴 */}
          <div className={`overlay overlay--menu ${menuOpen ? "overlay--open" : ""}`}>
            {menuOpen && (
              <button className="menuClose" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <svg viewBox="0 0 24 24"><use xlinkHref="#icon-cross" /></svg>
              </button>
            )}
            <ul className="menu">
              <li className="menu__item menu__item--current">
                <span className="menu__link" role="button" tabIndex={0} onClick={() => onMenuNav("/")}>exhibitions</span>
              </li>
              <li className="menu__item">
                <span className="menu__link" role="button" tabIndex={0} onClick={() => onMenuNav("/discover")}>discover</span>
              </li>
              <li className="menu__item">
                <span className="menu__link" role="button" tabIndex={0} onClick={() => onMenuNav("/visit")}>visit us</span>
              </li>
              <li className="menu__item">
                <span className="menu__link" role="button" tabIndex={0} onClick={() => onMenuNav("/shop")}>shop</span>
              </li>
            </ul>
          </div>

          <div className={`overlay overlay--info ${infoOpen ? "overlay--open" : ""}`}>
            <p className="info">
              &ldquo;Life in Pieces&rdquo; is the subject of all exhibitions taking place in the Mirai Art Gallery in 2017.
              Fragments of lost memories, fleeting moments and the breaking apart of human nature are this year's highlighted topics.
            </p>
          </div>
        </header>

        <h4 className="location">{current.location}</h4>

        <div className="slides">
          <div className="slide slide--current">
            <h2 className="slide__name">{current.name[0]} <br /> {current.name[1]}</h2>
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

          <button className="btn btn--nav btn--nav-right" type="button" onClick={() => go("next")} disabled={idx === ROOMS.length - 1}>
            <svg className="nav-icon nav-icon--right" width="42px" height="12px" viewBox="0 0 70 20">
              <path className="nav__triangle" d="M52.5,10L70,0v20L52.5,10z" />
              <path className="nav__line" d="M55.1,11.4H0V8.6h55.1V11.4z" />
            </svg>
          </button>
        </nav>
      </div>
    </>
  );
}

function DetailPage() {
  const navigate = useNavigate();
  const { room, side, idx } = useParams();
  const r = ROOMS[Number(room)];
  const i = Number(idx);
  const n = r?.images?.[side]?.[i];
  const src = r && n ? imgUrl(r.set, n) : null;

  return (
    <div className="detailOverlay">
      <div className="simpleCard" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div style={{ border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.75)" }}>
          {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "Invalid"}
        </div>
        <div>
          <div className="simpleTop">
            <h2 style={{ margin: 0 }}>{r ? `${r.name[0]} ${r.name[1]}` : "Not found"}</h2>
            <button className="simpleBtn" onClick={() => navigate(-1)}>Back</button>
          </div>
          <p style={{ marginTop: 10, opacity: 0.75 }}>{r?.title}</p>
          <button className="simpleBtn" onClick={() => navigate("/")}>Go Exhibitions</button>
        </div>
      </div>
    </div>
  );
}

function SimplePage({ title }) {
  return (
    <div className="simplePage">
      <div className="simpleCard">
        <div className="simpleTop">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <Link className="simpleBtn" to="/">Back to Exhibitions</Link>
        </div>
        <p style={{ marginTop: 12, opacity: 0.75 }}>
          이 페이지는 메뉴 라우팅 동작 확인용입니다. 실제 컨텐츠로 교체하시면 됩니다.
        </p>
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
        <Route path="/discover" element={<SimplePage title="Discover" />} />
        <Route path="/visit" element={<SimplePage title="Visit us" />} />
        <Route path="/shop" element={<SimplePage title="Shop" />} />
      </Routes>
    </BrowserRouter>
  );
}
