import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function PostCreateRedirect() {
  const navigate = useNavigate();
  const { role } = useAuthStore(); // "general" | "artist"

  useEffect(() => {
    // 예술가면 작품 등록, 일반이면 감상평 등록 (현재 명세 기준)
    if (role === "artist") navigate("/posts/create/artist", { replace: true });
    else navigate("/posts/create/user", { replace: true });
  }, [role, navigate]);

  return <div style={{ padding: 16 }}>이동중...</div>;
}
