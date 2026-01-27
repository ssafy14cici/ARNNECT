import { useStore } from '../store';

export default function Overlay() {
  const { viewState, activeArt, closePopup, backToWalk } = useStore();

  // 1. 팝업 모드
  if (viewState === 'POPUP' && activeArt) {
    return (
      <div className="overlay-container" style={{ zIndex: 999999 }}>
        <div className="overlay-box">
          <button className="close-btn" onClick={closePopup}>✕ CLOSE</button>
          <div className="content-row">
            <img src={activeArt.image} alt={activeArt.title} />
            <div className="text-col">
              <h2>{activeArt.title}</h2>
              <p>{activeArt.desc}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. 집중 모드 (돌아가기 버튼)
  if (viewState === 'FOCUS') {
    return (
      // ★ 전체 화면을 덮는 투명 레이어 (이벤트 통과)
      <div style={{ 
        position: 'fixed', // absolute 대신 fixed 사용 (스크롤 영향 X)
        top: 0, left: 0, width: '100vw', height: '100vh',
        pointerEvents: 'none', 
        zIndex: 999999
      }}>
        {/* ★ 버튼: 우측 하단 절대 좌표 고정 */}
        <button 
          onClick={(e) => {
             e.stopPropagation();
             backToWalk();
          }}
          style={{ 
            position: 'absolute', // 부모 기준 절대 위치
            bottom: '40px',       // 하단에서 40px 띄움
            right: '40px',        // 우측에서 40px 띄움
            pointerEvents: 'auto', 
            
            padding: '15px 30px', 
            fontSize: '15px', 
            fontWeight: '700',
            color: 'white', 
            background: 'rgba(0, 0, 0, 0.7)', 
            border: '1px solid rgba(255, 255, 255, 0.5)', 
            borderRadius: '50px', 
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = 'black';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ↻ Back to Start
        </button>
      </div>
    );
  }

  return null;
}