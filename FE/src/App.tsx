// FE/src/App.tsx
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { router } from "./app/router/routes";
import { useAuthStore } from "./features/auth/store";

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ✅ hydrate 전에는 Guard도 null 리턴하므로, App에서도 동일하게 대기
  if (!hydrated) return null;

  return <RouterProvider router={router} />;
}
