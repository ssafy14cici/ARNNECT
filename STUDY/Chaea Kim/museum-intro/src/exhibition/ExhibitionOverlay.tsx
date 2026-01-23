// src/exhibition/ExhibitionOverlay.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type Side = "back" | "left" | "right";

type Room = {
  set: string;
  name: [string, string];
  title: string;
  roomLabel: string;
  date: string;
  subject: string;
  location: string;
  images: Record<Side, string[]>;
};

const ROOM_SPACING = 1400;

const ROOMS: Room[] = [
  {
    set: "set4",
    name: ["test", "exhibition"],
    title: "“Understanding Life”",
    roomLabel: "부울경 캠퍼스",
    date: "25 Mar – 11 May 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["3", "6"], left: ["7", "1", "2"], right: ["4", "5", "8"] },
  },
  {
    set: "set2",
    name: ["test", "exhibition"],
    title: "“나도 디자인 잘하고싶다!”",
    roomLabel: "부울경 캠퍼스",
    date: "31 Mar – 25 Apr 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["1", "6"], left: ["3", "4", "5"], right: ["8", "7", "2"] },
  },
  {
    set: "set3",
    name: ["Misako", "Shiraishi"],
    title: "“Instant Gratification”",
    roomLabel: "부울경 캠퍼스",
    date: "4 Apr – measuring 30 Apr 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["1", "6"], left: ["3", "4", "5"], right: ["8", "7", "2"] },
  },
  {
    set: "set1",
    name: ["Tadashi", "Takayama"],
    title: "“Facts of Blossoms”",
    roomLabel: "부울경 캠퍼스",
    date: "15 Apr – 18 May 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["3", "6"], left: ["7", "1", "2"], right: ["4", "5", "8"] },
  },
  {
    set: "set5",
    name: ["Etsuko", "Hamasaki"],
    title: "“In Loving Memory”",
    roomLabel: "부울경 캠퍼스",
    date: "5 May – 17 Jun 2017",
    subject: "モダンアート",
    location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
    images: { back: ["7", "5"], left: ["6", "4", "3"], right: ["2", "1", "8"] },
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function imgUrl(set: string, n: string) {
  return `https://tympanus.net/Development/Exhibition/img/${set}/${n}.jpg`;
}

function preloadRoom(room?: Room) {
  if (!room) return;
  const all = [...room.images.back, ...room.images.left, ...room.images.right];
  all.forEach((n) => {
    const im = new Image();
    im.decoding = "async";
    im.src = imgUrl(room.set, n);
  });
}

function SvgDefs() {
  return (
    <svg className="exh-hidden" aria-hidden="true">
      <symbol id="exh-icon-menu" viewBox="0 0 24 24">
        <path d="M24,5.8H0v-2h24V5.8z M19.8,11H4.2v2h15.6V11z M24,18.2H0v2h24V18.2z" />
      </symbol>
      <symbol id="exh-icon-cross" viewBox="0 0 24 24">
        <path d="M13.4,12l7.8,7.8l-1.4,1.4l-7.8-7.8l-7.8,7.8l-1.4-1.4l7.8-7.8L2.7,4.2l1.4-1.4l7.8,7.8l7.8-7.8l1.4,1.4L13.4,12z" />
      </symbol>
      <symbol id="exh-icon-info" viewBox="0 0 20 20">
        <circle style={{ fill: "#fff" }} cx="10" cy="10" r="9.1" />
        <path d="M10,0C4.5,0,0,4.5,0,10s4.5,10,10,10s10-4.5,10-10S15.5,0,10,0z M10,18.6c-4.7,0-8.6-3.9-8.6-8.6S5.3,1.4,10,1.4s8.6,3.9,8.6,8.6S14.7,18.6,10,18.6z M10.7,5C10.9,5.2,11,5.5,11,5.7s-0.1,0.5-0.3,0.7c-0.2,0.2-0.4,0.3-0.7,0.3c-0.3,0-0.5-0.1-0.7-0.3C9.1,6.2,9,6,9,5.7S9.1,5.2,9.3,5C9.5,4.8,9.7,4.7,10,4.7C10.3,4.7,10.5,4.8,10.7,5z M9.3,8.3h1.4v7.2H9.3V8.3z" />
      </symbol>
    </svg>
  );
}

function RoomView(props: {
  room: Room;
  getSrc: (side: Side, i: number) => string;
  onClickImg: (side: Side, i: number) => void;
}) {
  const { room, getSrc, onClickImg } = props;

  return (
    <div className="exh-room exh-room--current">
      <div className="exh-room__side exh-room__side--back">
        {room.images.back.map((_, i) => (
          <img
            key={`b-${i}`}
            className="exh-room__img"
            src={getSrc("back", i)}
            alt=""
            onClick={() => onClickImg("back", i)}
            draggable={false}
          />
        ))}
      </div>

      <div className="exh-room__side exh-room__side--left">
        {room.images.left.map((_, i) => (
          <img
            key={`l-${i}`}
            className="exh-room__img"
            src={getSrc("left", i)}
            alt=""
            onClick={() => onClickImg("left", i)}
            draggable={false}
          />
        ))}
      </div>

      <div className="exh-room__side exh-room__side--right">
        {room.images.right.map((_, i) => (
          <img
            key={`r-${i}`}
            className="exh-room__img"
            src={getSrc("right", i)}
            alt=""
            onClick={() => onClickImg("right", i)}
            draggable={false}
          />
        ))}
      </div>

      <div className="exh-room__side exh-room__side--bottom" />
    </div>
  );
}

type DetailKey = { roomIdx: number; side: Side; imgIdx: number } | null;

export function ExhibitionOverlay(props: { open: boolean; onRequestClose: () => void }) {
  const { open, onRequestClose } = props;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [idx, setIdx] = useState<number>(1);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);
  const [isTraveling, setIsTraveling] = useState<boolean>(false);

  // 업로드 이미지(오브젝트 URL) 저장
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<DetailKey>(null);

  const current = ROOMS[idx];

  // open 될 때만 프리로드/포인터 효과 동작
  useEffect(() => {
    if (!open) return;
    preloadRoom(ROOMS[idx]);
    preloadRoom(ROOMS[idx + 1]);
    preloadRoom(ROOMS[idx - 1]);
  }, [open, idx]);

  useEffect(() => {
    if (!open) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let targetX = 0,
      targetY = 0;
    let curX = 0,
      curY = 0;
    let raf = 0;

    const tick = () => {
      raf = 0;
      curX += (targetX - curX) * 0.1;
      curY += (targetY - curY) * 0.1;

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

    const onMove = (e: PointerEvent) => {
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

    scroller.classList.add("is-pointer");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      scroller.classList.remove("is-pointer");
    };
  }, [open]);

  // ESC로 닫기(내부에서만)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detail) setDetail(null);
        else if (menuOpen) setMenuOpen(false);
        else if (infoOpen) setInfoOpen(false);
        else onRequestClose();
      }
      if (e.key === "ArrowLeft") travel("prev");
      if (e.key === "ArrowRight") travel("next");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail, menuOpen, infoOpen, idx, isTraveling]);

  const visible = useMemo(() => {
    const arr: number[] = [];
    for (let i = idx - 1; i <= idx + 1; i++) {
      if (i >= 0 && i < ROOMS.length) arr.push(i);
    }
    return arr;
  }, [idx]);

  const keyOf = (roomIdx: number, side: Side, imgIdx: number) => `${roomIdx}:${side}:${imgIdx}`;

  const getSrc = (side: Side, imgIdx: number) => {
    const k = keyOf(idx, side, imgIdx);
    const customUrl = custom[k];
    if (customUrl) return customUrl;
    const n = current.images[side][imgIdx];
    return imgUrl(current.set, n);
  };

  const onClickImg = (side: Side, imgIdx: number) => {
    setDetail({ roomIdx: idx, side, imgIdx });
  };

  const travel = (dir: "next" | "prev") => {
    if (!open) return;
    if (isTraveling) return;

    const next = dir === "next" ? idx + 1 : idx - 1;
    if (next < 0 || next >= ROOMS.length) return;

    setIsTraveling(true);
    setMenuOpen(false);
    setInfoOpen(false);
    setDetail(null);

    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.classList.remove("no-anim");
    scroller.style.setProperty("--worldX", "0px");
    scroller.style.setProperty("--travelZ", "0px");
    scroller.style.setProperty("--travelYaw", "0deg");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sign = dir === "next" ? -1 : 1;

        scroller.style.setProperty("--travelZ", "140px");
        scroller.style.setProperty("--travelYaw", `${sign * 10}deg`);
        scroller.style.setProperty("--worldX", `${sign * ROOM_SPACING}px`);

        const onEnd = (e: TransitionEvent) => {
          if (e.propertyName !== "transform") return;
          scroller.removeEventListener("transitionend", onEnd);

          setIdx(next);

          scroller.classList.add("no-anim");
          scroller.style.setProperty("--worldX", "0px");
          scroller.style.setProperty("--travelZ", "0px");
          scroller.style.setProperty("--travelYaw", "0deg");

          requestAnimationFrame(() => {
            scroller.classList.remove("no-anim");
            setIsTraveling(false);
          });
        };

        scroller.addEventListener("transitionend", onEnd);
      });
    });
  };

  const requestUploadForCurrentDetail = () => {
    if (!detail) return;
    fileRef.current?.click();
  };

  const onFile = (f?: File | null) => {
    if (!detail || !f) return;
    const url = URL.createObjectURL(f);
    const k = keyOf(detail.roomIdx, detail.side, detail.imgIdx);
    setCustom((prev) => ({ ...prev, [k]: url }));
  };

  if (!open) return null;

  return (
    <div className="exh-root" role="dialog" aria-modal="true">
      <SvgDefs />

      <input
        ref={fileRef}
        className="exh-hidden"
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="exh-container">
        <div className="exh-scroller" ref={scrollerRef}>
          <div className="exh-world">
            {visible.map((i) => {
              const style = { ["--roomX" as any]: `${(i - idx) * ROOM_SPACING}px` } as React.CSSProperties;
              const room = ROOMS[i];
              const getSrcFor = (side: Side, imgIdx: number) => {
                const k = `${i}:${side}:${imgIdx}`;
                const customUrl = custom[k];
                if (customUrl) return customUrl;
                const n = room.images[side][imgIdx];
                return imgUrl(room.set, n);
              };

              return (
                <div key={i} className="exh-roomWrap" style={style}>
                  <RoomView
                    room={room}
                    getSrc={getSrcFor}
                    onClickImg={(side, imgIdx) => setDetail({ roomIdx: i, side, imgIdx })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 상단/내용 */}
      <div className="exh-content">
        <header className="exh-header">
          <div className="exh-titleRow">
            <h1 className="exh-title">ARNNECT</h1>
            <div className="exh-subject">{current.subject}</div>
          </div>

          <div className="exh-btnRow">
            <button
              className={`exh-btn exh-btn--info ${infoOpen ? "is-active" : ""}`}
              type="button"
              onClick={() => {
                setInfoOpen((v) => !v);
                setMenuOpen(false);
              }}
            >
              <svg className="exh-icon">
                <use xlinkHref="#exh-icon-info" />
              </svg>
              <svg className="exh-icon">
                <use xlinkHref="#exh-icon-cross" />
              </svg>
            </button>

            <button
              className={`exh-btn exh-btn--menu ${menuOpen ? "is-active" : ""}`}
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v);
                setInfoOpen(false);
              }}
            >
              <svg className="exh-icon">
                <use xlinkHref="#exh-icon-menu" />
              </svg>
              <svg className="exh-icon">
                <use xlinkHref="#exh-icon-cross" />
              </svg>
            </button>

            <button className="exh-btn exh-btn--exit" type="button" onClick={onRequestClose}>
              Exit
            </button>
          </div>

          <div className={`exh-overlay exh-overlay--menu ${menuOpen ? "is-open" : ""}`}>
            {menuOpen && (
              <button className="exh-menuClose" type="button" aria-label="Close" onClick={() => setMenuOpen(false)}>
                <svg viewBox="0 0 24 24">
                  <use xlinkHref="#exh-icon-cross" />
                </svg>
              </button>
            )}
            <ul className="exh-menu">
              <li className="exh-menu__item">exhibitions</li>
              <li className="exh-menu__item">discover</li>
              <li className="exh-menu__item">visit us</li>
              <li className="exh-menu__item">shop</li>
            </ul>
          </div>

          <div className={`exh-overlay exh-overlay--info ${infoOpen ? "is-open" : ""}`}>
            <p className="exh-info">
              “ARNNECT” 내부 전시는 DOM/CSS 3D 룸으로 대체된 버전입니다. (WebGL 외관은 그대로 유지)
            </p>
          </div>
        </header>

        <h4 className="exh-location">{current.location}</h4>

        <div className="exh-slide">
          <h2 className="exh-slide__name">
            {current.name[0]} <br /> {current.name[1]}
          </h2>
          <h3 className="exh-slide__title">
            <span>{current.title}</span>
            <div className="exh-slide__number">{current.roomLabel}</div>
          </h3>
          <p className="exh-slide__date">{current.date}</p>
        </div>

        <nav className="exh-nav">
          <button
            className="exh-navBtn"
            type="button"
            onClick={() => travel("prev")}
            disabled={idx === 0 || isTraveling}
          >
            ◀
          </button>

          <button
            className="exh-navBtn"
            type="button"
            onClick={() => travel("next")}
            disabled={idx === ROOMS.length - 1 || isTraveling}
          >
            ▶
          </button>
        </nav>
      </div>

      {/* 디테일 모달 */}
      {detail && (
        <div className="exh-detailBackdrop" onMouseDown={() => setDetail(null)}>
          <div className="exh-detailCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="exh-detailTop">
              <div className="exh-detailTitle">
                Room {detail.roomIdx + 1} / {detail.side.toUpperCase()} / #{detail.imgIdx + 1}
              </div>
              <div className="exh-detailActions">
                <button className="exh-miniBtn" type="button" onClick={requestUploadForCurrentDetail}>
                  Upload
                </button>
                <button className="exh-miniBtn" type="button" onClick={() => setDetail(null)}>
                  Close
                </button>
              </div>
            </div>

            <div className="exh-detailBody">
              <img
                className="exh-detailImg"
                src={
                  custom[keyOf(detail.roomIdx, detail.side, detail.imgIdx)] ??
                  imgUrl(ROOMS[detail.roomIdx].set, ROOMS[detail.roomIdx].images[detail.side][detail.imgIdx])
                }
                alt=""
              />
              <div className="exh-detailHint">
                Upload를 누르면 해당 프레임 이미지가 교체됩니다. (현 단계: DOM/CSS 전시용)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
