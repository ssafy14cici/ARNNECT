// // src/exhibition/ExhibitionOverlay.tsx
// import React, { useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";

// type Side = "back" | "left" | "right";

// type Room = {
//   set: string;
//   subject: string;
//   location: string;
//   images: Record<Side, string[]>;
// };

// const ROOMS: Room[] = [
//   {
//     set: "set4",
//     subject: "モダンアート",
//     location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
//     images: { back: ["3", "6"], left: ["7", "1", "2"], right: ["4", "5", "8"] },
//   },
//   {
//     set: "set2",
//     subject: "モダンアート",
//     location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
//     images: { back: ["1", "6"], left: ["3", "4", "5"], right: ["8", "7", "2"] },
//   },
//   {
//     set: "set3",
//     subject: "モダンアート",
//     location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
//     images: { back: ["1", "6"], left: ["3", "4", "5"], right: ["8", "7", "2"] },
//   },
//   {
//     set: "set1",
//     subject: "モダンアート",
//     location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
//     images: { back: ["3", "6"], left: ["7", "1", "2"], right: ["4", "5", "8"] },
//   },
//   {
//     set: "set5",
//     subject: "モダンアート",
//     location: "Mirai Art Gallery & Exhibition Center, Sapporo, Japan",
//     images: { back: ["7", "5"], left: ["6", "4", "3"], right: ["2", "1", "8"] },
//   },
// ];

// function imgUrl(set: string, n: string) {
//   return `https://tympanus.net/Development/Exhibition/img/${set}/${n}.jpg`;
// }

// /**
//  * ✅ 여기만 바꾸면 됨 (네가 만들어 둔 임시 디테일 페이지 라우트)
//  * 예: "/artwork/:id" 같은 구조면 아래 navigate 부분을 그에 맞게 수정
//  */
// const DETAIL_PATH = "/artwork-temp";

// function RoomView(props: {
//   room: Room;
//   getSrc: (side: Side, i: number) => string;
//   onClickImg: (side: Side, i: number, src: string) => void;
// }) {
//   const { room, getSrc, onClickImg } = props;

//   const renderSide = (side: Side) => (
//     <div className={`exh-room__side exh-room__side--${side}`}>
//       {room.images[side].map((_, i) => {
//         const src = getSrc(side, i);
//         return (
//           <img
//             key={`${side}-${i}`}
//             className="exh-room__img"
//             src={src}
//             alt=""
//             draggable={false}
//             onClick={(e) => {
//               // ✅ 이미지 클릭이 상위로 새는거 차단
//               e.preventDefault();
//               e.stopPropagation();
//               onClickImg(side, i, src);
//             }}
//           />
//         );
//       })}
//     </div>
//   );

//   return (
//     <div className="exh-room exh-room--current">
//       {renderSide("back")}
//       {renderSide("left")}
//       {renderSide("right")}
//       <div className="exh-room__side exh-room__side--bottom" />
//     </div>
//   );
// }

// export function ExhibitionOverlay(props: { open: boolean; onRequestClose: () => void }) {
//   const { open, onRequestClose } = props;
//   const navigate = useNavigate();

//   const [idx, setIdx] = useState<number>(0);

//   const current = ROOMS[idx];

//   const visible = useMemo(() => {
//     // 메모리/DOM 줄이기: 현재 방만 렌더
//     return [idx];
//   }, [idx]);

//   const getSrc = (roomIdx: number, side: Side, imgIdx: number) => {
//     const room = ROOMS[roomIdx];
//     const n = room.images[side][imgIdx];
//     return imgUrl(room.set, n);
//   };

//   const onClickImg = (roomIdx: number, side: Side, imgIdx: number, src: string) => {
//     // ✅ 임시 디테일 페이지로 이동
//     const q = new URLSearchParams({
//       roomIdx: String(roomIdx),
//       side,
//       imgIdx: String(imgIdx),
//       src, // 그대로 넘김(필요하면 디테일에서 decode)
//     });
//     navigate(`${DETAIL_PATH}?${q.toString()}`);
//   };

//   const go = (delta: number) => {
//     const next = idx + delta;
//     if (next < 0 || next >= ROOMS.length) return;
//     setIdx(next);
//   };

//   if (!open) return null;

//   return (
//     // ✅ 빈 공간 클릭해도 닫히지 않게: backdrop에 onClick/onMouseDown 없음
//     <div className="exh-root" role="dialog" aria-modal="true">
//       {/* 3D */}
//       <div className="exh-container">
//         <div className="exh-scroller">
//           <div className="exh-world">
//             {visible.map((i) => {
//               const room = ROOMS[i];
//               return (
//                 <div key={i} className="exh-roomWrap">
//                   <RoomView
//                     room={room}
//                     getSrc={(side, imgIdx) => getSrc(i, side, imgIdx)}
//                     onClickImg={(side, imgIdx, src) => onClickImg(i, side, imgIdx, src)}
//                   />
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>

//       {/* UI */}
//       <div className="exh-content">
//         <header className="exh-header">
//           <div className="exh-titleRow">
//             <h1 className="exh-title">ARNNECT</h1>
//             <div className="exh-subject">{current.subject}</div>
//           </div>

//           <div className="exh-btnRow">
//             <button
//               className="exh-btn exh-btn--exit"
//               type="button"
//               onClick={(e) => {
//                 e.preventDefault();
//                 e.stopPropagation();
//                 onRequestClose();
//               }}
//             >
//               Exit
//             </button>
//           </div>
//         </header>

//         <h4 className="exh-location">{current.location}</h4>

//         <nav className="exh-nav">
//           <button className="exh-navBtn" type="button" onClick={() => go(-1)} disabled={idx === 0}>
//             ◀
//           </button>
//           <button className="exh-navBtn" type="button" onClick={() => go(1)} disabled={idx === ROOMS.length - 1}>
//             ▶
//           </button>
//         </nav>
//       </div>
//     </div>
//   );
// }
