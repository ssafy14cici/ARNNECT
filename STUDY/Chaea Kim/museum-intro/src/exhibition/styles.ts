// src/exhibition/styles.ts

import frontalWallPng from "./img/frontal_side.png";
import leftWallPng from "./img/floor_side.png";
import rightWallPng from "./img/floor_side.png";

// ✅ 바닥/천장 PNG (2560x1440)
import buildingFloorPng from "./img/building_floor.png";
import buildingCeilingPng from "./img/ceiling_floor.png";

/**
 * 전시관 오버라이드 CSS 스타일을 생성합니다.
 */
export function createExhibitionStyles(): string {
  return `
    /* =====================================================
     * ✅ Root 기본
     * ===================================================== */
    .exh-root{
      position: fixed; inset: 0;
      z-index: 2147483647;
      display:none;
      pointer-events:auto;
    }
    .exh-root.is-visible{ display:block; }

    /* content overlay가 클릭 먹지 않게 */
    .exh-root .content{ pointer-events:none !important; }

    /* overlay는 열렸을 때만 클릭 */
    .exh-root .overlay{ pointer-events:none !important; }
    .exh-root .overlay.overlay--open{ pointer-events:auto !important; }

    /* 버튼류만 클릭 */
    .exh-root .codrops-header,
    .exh-root .codrops-links,
    .exh-root .codrops-icon,
    .exh-root .btn,
    .exh-root .nav,
    .exh-root .btn--nav,
    .exh-root .btn--toggle,
    .exh-root .overlay.overlay--open,
    .exh-root .overlay.overlay--open *{
      pointer-events:auto !important;
    }

    /* ✅ room / side / frame / img는 클릭 가능 */
    .exh-root .room,
    .exh-root .room__side,
    .exh-root .room__frame,
    .exh-root img.room__img{
      pointer-events:auto !important;
    }
    .exh-root .room__frame{ cursor:pointer; }
    .exh-root img.room__img{ cursor:pointer; }

    /* =====================================================
     * ✅ 천장 PNG (전체 룸 공통)
     * ===================================================== */
    .exh-root .room__side--top{
      background-image: url(${buildingCeilingPng});
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    /* =====================================================
     * ✅ 바닥 PNG (전체 룸 공통)
     * ===================================================== */
    .exh-root .room__side--bottom{
      background-image: url(${buildingFloorPng});
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    /* =====================================================
     * ✅ Reception prop layer
     * ===================================================== */
    .exh-root .room{ position: relative; }
    .exh-root .reception-prop-layer{
      position:absolute;
      inset:0;
      pointer-events:none;
      z-index: 6;
    }

    /* =====================================================
     * ✅ 리셉션 룸 벽면 PNG 이미지 (가능함)
     * - room subject가 "reception" 또는 "room0"일 때 적용
     * ===================================================== */
    .exh-root .room--reception .room__side--back,
    .exh-root .room--room0 .room__side--back{
      background-image: url(${frontalWallPng});
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .exh-root .room--reception .room__side--left,
    .exh-root .room--room0 .room__side--left{
      background-image: url(${leftWallPng});
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .exh-root .room--reception .room__side--right,
    .exh-root .room--room0 .room__side--right{
      background-image: url(${rightWallPng});
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    /* =====================================================
     * ✅ [중요] 액자 프레임: "사진 크기 = 프레임 크기"
     * - 프레임이 2배로 커지던 원인 제거:
     *   1) frame padding 제거
     *   2) img height:100% 제거 (auto로 복구)
     *   3) side 3D 요소 숨김 (레이아웃/원근 깨짐 방지)
     * ===================================================== */

    /* 프레임 래퍼는 그냥 이미지 감싸는 박스 */
    .exh-root .room__frame{
      flex: none;

      /* ✅ 크기는 레이아웃용 상한만 둠(원하면 숫자만 조절) */
      max-width: 28%;
      max-height: 45%;
      margin: 0 6%;

      /* ✅ 튀어나오는 Z는 최소로 */
      transform: translate3d(0,0,25px);
      backface-visibility: hidden;
      position: relative;
      transform-style: preserve-3d;

      /* ✅ 프레임이 사진보다 커지는 직접 원인 제거 */
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 0 !important;

      /* demo.css에서 무언가 박스를 키우면 여기서 컷 */
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
    }

    /* 3D 두께 요소는 "당장" 안쓴다 했으니 완전 비활성 */
    .exh-root .room__frame-side{
      display:none !important;
    }
    
    // ✅ 전시회 "걷기" (wheel 이동)용: room transform은 CSS 변수로만 제어
    /* =====================================================
    * ✅ Wheel Walk (CSS room camera move)
    * ===================================================== */
    .exh-root .room--current{
      transform: translateZ(var(--walkZ, 0px));
      will-change: transform;
    }


    /* 이미지가 박스(프레임)를 키우는 기준이 되도록 */
    .exh-root img.room__img{
      display:block;

      /* ✅ 핵심: height 100% 금지 -> 사진 비율 유지 */
      width: 100% !important;
      height: auto !important;

      /* ✅ box 안에서 과한 fit 방지(원본 비율 유지) */
      object-fit: contain;
      object-position: center;

      /* ✅ "사진만" 살짝 액자 느낌(원하면 값 조절) */
      border-radius: 6px;
      background: rgba(250,245,240,0.98);
      padding: 10px;                 /* ✅ 여기만이 프레임 역할 */
      box-shadow: 0 10px 18px rgba(0,0,0,0.18);

      /* demo.css reset */
      margin: 0 !important;
      border: none !important;
      transform: translateZ(0);      /* z-fighting/부모 transform 간섭 최소화 */
    }

    /* =====================================================
     * ✅ Reception Desk Cat (1280x728)
     * ===================================================== */
    .exh-root .reception-desk{
      position:absolute;
      left: 50%;
      top: 84%;
      width: 780px;
      max-width: 78vw;

      aspect-ratio: 1280 / 728;
      height: auto;

      pointer-events:auto;
      border: 0;
      padding: 0;
      background: transparent;
      cursor: pointer;

      transform-origin: 50% 92%;
      transform:
        translate(-50%, -100%)
        perspective(1600px)
        rotateX(1.2deg)
        rotateY(-2.2deg)
        translateZ(10px);

      filter: none;
    }

    .exh-root .reception-desk::after{
      content:"";
      position:absolute;
      left: 50%;
      bottom: 6px;

      width: 72%;
      height: 18px;

      transform: translateX(-50%);
      background: rgba(0,0,0,0.20);
      filter: blur(12px);
      border-radius: 999px;

      pointer-events:none;
    }

    .exh-root .reception-desk img{
      width:100%;
      height:auto;
      display:block;
      user-select:none;
      -webkit-user-drag:none;
      filter: saturate(0.98) brightness(1.01);
    }

    /* 리셉션에서는 고양이 모션 무효화 */
    .exh-root .room--reception .reception-desk,
    .exh-root .room--room0 .reception-desk,
    .exh-root .reception-desk[data-no-motion="1"]{
      animation: none !important;
    }

    /* =====================================================
     * ✅ Artwork Detail modal
     * ===================================================== */
    .exh-detailBackdrop{
      position: fixed; inset:0;
      display:none;
      align-items:center; justify-content:center;
      background: rgba(0,0,0,0.55);
      z-index: 2147483647;
      pointer-events:auto;
    }
    .exh-detailBackdrop.is-open{ display:flex; }
    .exh-detailCard{
      width: min(920px, 92vw);
      height: min(680px, 86vh);
      background: #111;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 14px;
      overflow:hidden;
      display:flex;
      flex-direction:column;
    }
    .exh-detailTop{
      padding: 12px 14px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      color:#fff;
      font-size: 14px;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    .exh-detailActions{ display:flex; gap: 8px; align-items:center; }
    .exh-detailBody{
      flex:1;
      display:flex;
      align-items:center;
      justify-content:center;
      padding: 14px;
    }
    .exh-detailImg{
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 10px;
    }
    .exh-miniBtn{
      background: rgba(255,255,255,0.10);
      color:#fff;
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 10px;
      padding: 8px 12px;
      cursor:pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .exh-miniBtn:hover{
      background: rgba(255,255,255,0.16);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .exh-detailGoPage{
      background: linear-gradient(135deg, #5a9a48, #4a8a38);
      border: 1px solid rgba(255,255,255,0.25);
      font-weight: 600;
    }
    .exh-detailGoPage:hover{
      background: linear-gradient(135deg, #6db84d, #5a9a48);
      box-shadow: 0 6px 16px rgba(90, 154, 72, 0.4);
    }

    /* =====================================================
     * ✅ Reception welcome modal
     * ===================================================== */
    .exh-receptionBackdrop{
      position: fixed; inset:0;
      display:none;
      align-items:center; justify-content:center;
      background: rgba(0,0,0,0.28);
      z-index: 2147483647;
      pointer-events:auto;
    }
    .exh-receptionBackdrop.is-open{ display:flex; }
    .exh-receptionCard{
      width: min(560px, 92vw);
      background:#1b1b1b;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 14px;
      overflow:hidden;
    }
    .exh-receptionTop{
      padding: 14px 16px;
      color:#fff;
      font-size: 15px;
      font-weight: 700;
      border-bottom: 1px solid rgba(255,255,255,0.12);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 12px;
    }
    .exh-receptionBody{
      padding: 16px;
      color: rgba(255,255,255,0.88);
      font-size: 14px;
      line-height: 1.5;
    }
  `;
}
