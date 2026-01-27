import "./overlay.css";

export default function Overlay({
  canGoBack,
  onBack,
}: {
  canGoBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="overlayRoot">
      <div className="overlayRight">
        <button
          className="overlayBackBtn"
          onClick={onBack}
          disabled={!canGoBack}
          title="클릭 전 시점으로 돌아가기"
        >
          돌아가기
        </button>
      </div>

      <div className="overlayHint">
        <div className="overlayTitle">EXHIBITION</div>
        <div className="overlaySub">
          작품을 클릭하면 확대 / 돌아가기 버튼으로 원위치
        </div>
      </div>
    </div>
  );
}
