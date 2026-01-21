import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function PostCreateRedirect() {
  const { role } = useAuthStore(); // "general" | "artist"
  const writerRole = role === "artist" ? "artist" : "user";
  return <Navigate to={`/posts/new/${writerRole}`} replace />;
}
