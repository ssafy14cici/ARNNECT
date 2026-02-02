// FE/src/pages/home/Home.tsx
import "../../styles/home.css";

export default function Home() {
  return (
    <div className="home-temp-container">
      {/* Navbar는 상위(App.tsx 등)에서 공통으로 처리된다고 가정하거나, 
          필요시 여기에 <Navbar />를 추가하세요. */}
      <div className="temp-content">
        <h1>수정 예정</h1>
        <p>PC 버전 홈 화면 준비 중입니다.</p>
      </div>
    </div>
  );
}