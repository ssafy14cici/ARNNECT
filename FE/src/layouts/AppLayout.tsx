import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "../layouts/Navbar";
import { useAuthStore } from "../stores/authStore";

export default function AppLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
