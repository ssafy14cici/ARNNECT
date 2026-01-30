import { useEffect } from "react";
import { Link} from "react-router-dom"; // 라우터 에러 핸들링 시 필요
import "./notfound.css";

type Props = {
  code?: number;
  title?: string;
  desc?: string;
};

// 에러 코드별 메시지 딕셔너리
const ERROR_MESSAGES: Record<number, { title: string; desc: string }> = {
  404: {
    title: "The Void",
    desc: "찾으시는 작품(페이지)이 arnnect에 존재하지 않습니다.\n이미 철거되었거나 잘못된 경로로 진입하셨습니다.",
  },
  500: {
    title: "Internal Chaos",
    desc: "서버 내부에서 예상치 못한 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
  },
  403: {
    title: "Restricted Area",
    desc: "이 구역에 접근할 권한이 없습니다.\n관계자 외 출입 금지 구역입니다.",
  },
};

export default function NotFound({ code = 404, title, desc }: Props) {
  // 스크롤 잠금 효과
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const info = ERROR_MESSAGES[code] ?? ERROR_MESSAGES[404];
  const displayTitle = title ?? info.title;
  const displayDesc = desc ?? info.desc;

  return (
    <div className="error-page">
      {/* 배경 노이즈 텍스처 */}
      <div className="noise-overlay" />

      <div className="error-content">
        {/* 거대 타이포그래피 (글리치 효과) */}
        <div className="error-code-wrapper">
          <h1 className="error-code" data-text={code}>
            {code}
          </h1>
        </div>

        <div className="error-text-box">
          <h2 className="error-title">{displayTitle}</h2>
          <p className="error-desc">{displayDesc}</p>
          
          <Link className="error-home-btn" to="/">
            <span className="btn-text">RETURN TO GALLERY</span>
            <span className="btn-line" />
          </Link>
        </div>
      </div>
    </div>
  );
}