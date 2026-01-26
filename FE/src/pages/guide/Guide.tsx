import "./guide.css";

function GuideFlow() {
  return (
    <section style={{ margin: "40px 0" }}>
      <h2>이용 흐름</h2>

      {/* 👤 일반 이용자 */}
      <div className="flowGroup">
        <h3 className="flowRole">일반 이용자</h3>

        <div className="flowRow">
          <div className="flowStep">
            <span className="flowTitle">전시 감상</span>
            <span className="flowDesc">작품을 직접 감상</span>
          </div>
          <div className="flowArrow">→</div>
          <div className="flowStep">
            <span className="flowTitle">QR 스캔</span>
            <span className="flowDesc">작품 페이지 이동</span>
          </div>
          <div className="flowArrow">→</div>
          <div className="flowStep">
            <span className="flowTitle">팬레터</span>
            <span className="flowDesc">감상 전달</span>
          </div>
        </div>
      </div>

      {/* 🎨 예술인 */}
      <div className="flowGroup">
        <h3 className="flowRole">예술인</h3>

        <div className="flowRow">
          <div className="flowStep">
            <span className="flowTitle">작품 등록</span>
            <span className="flowDesc">라운지에서 작품 관리</span>
          </div>
          <div className="flowArrow">→</div>
          <div className="flowStep">
            <span className="flowTitle">QR 발급</span>
            <span className="flowDesc">작품별 QR 생성</span>
          </div>
          <div className="flowArrow">→</div>
          <div className="flowStep">
            <span className="flowTitle">팬레터 확인</span>
            <span className="flowDesc">관객 반응 확인</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Guide() {
  return (
    <div style={{ padding: 24 }}>
      <h1>이용 가이드</h1>
      <GuideFlow />
      {/* 이하 텍스트 가이드 */}
    </div>
  );
}
