import { useAuthStore } from "../../stores/authStore";

export default function Lounge() {
  const { role } = useAuthStore();
  return <div>Lounge (role: {role})</div>;
}
