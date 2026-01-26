import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function LoungeIndex() {
  const role = useAuthStore((s) => s.role); // "general" | "artist"
  return <Navigate to={role === "artist" ? "ticket" : "collectbook"} replace />;
}
