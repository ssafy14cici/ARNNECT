// import { Outlet } from "react-router-dom";
// import { useEffect } from "react";
// import Navbar from "../components/main/Navbar";
// import { useAuthStore } from "../stores/authStore";

// export default function AppLayout() {
//   const hydrate = useAuthStore((s) => s.hydrate);

//   useEffect(() => {
//     hydrate();
//   }, [hydrate]);

//   return (
//     <div className="app-shell">
//       <Navbar />
//       <main className="page">
//         <Outlet />
//       </main>
//     </div>
//   );
// }

// src/layouts/AppLayout.tsx

import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import Navbar from "../components/main/Navbar";

export default function AppLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true); // ✅ hydrate 이후에만 렌더 허용
  }, [hydrate]);

  if (!ready) {
    // ✅ 여기서 아무것도 안 보여주거나 로더
    return null;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
