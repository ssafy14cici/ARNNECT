import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";

type Tab = "artist" | "artwork" | "tag" | "user";

export default function Search() {
  const [tab, setTab] = useState<Tab>("artist");
  const { isLoggedIn } = useAuthStore();

  const isLocked = (t: Tab) => (t === "tag" || t === "user") && !isLoggedIn; // :contentReference[oaicite:8]{index=8}

  return (
    <div>
      <h2>Search</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["artist", "artwork", "tag", "user"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={isLocked(t)}
            title={isLocked(t) ? "로그인이 필요합니다" : ""}
          >
            {t} {isLocked(t) ? "🔒" : ""}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {isLocked(tab) ? (
          <div>이 탭은 로그인 후 사용 가능합니다.</div>
        ) : (
          <div>현재 탭: {tab}</div>
        )}
      </div>
    </div>
  );
}
