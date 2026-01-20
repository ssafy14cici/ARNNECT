import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../../styles/notfound.css";

export default function NotFound() {
  useEffect(() => {
    // 404 페이지 진입 시 스크롤 제거
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      // 다른 페이지로 이동 시 원복
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div className="nf">
      <div className="nfCard">
        <img className="nfImg" src="/NotFound.png" alt="Not Found" />
        <h1 className="nfTitle">페이지를 찾을 수 없습니다</h1>
        <p className="nfDesc">요청하신 페이지가 존재하지 않습니다.</p>
        <Link className="nfBtn" to="/">홈으로 돌아가기</Link>
      </div>
    </div>
  );
}

