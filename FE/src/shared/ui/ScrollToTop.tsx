import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 대부분 케이스: window 스크롤 최상단
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    // iOS/일부 브라우저 보정(혹시 body/html에 남는 경우)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search]); // pathname만으로도 되는데, query 바뀔 때도 올리고 싶으면 search 포함

  return null;
}
