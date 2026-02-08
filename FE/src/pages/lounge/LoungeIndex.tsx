//FE\src\pages\lounge\LoungeIndex.tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";

export default function LoungeIndex() {
  const role = useAuthStore((s) => s.role); // "general" | "artist"
  return <Navigate to={role === "artist" ? "portfolio" : "Analysis"} replace />;
}
