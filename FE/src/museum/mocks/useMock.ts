// FE/src/mocks/useMock.ts
const LS_KEY = "arnnect_use_mock"; // "1" | "0"

export function isTestHost() {
  const h = window.location.hostname;

  // ✅ 데모/도커/테스트 호스트를 여기서 판정
  return (
    h === "i14e107.p.ssafy.io" ||
    h.endsWith(".ssafy.io") ||
    h.includes("localhost") ||
    h.includes("127.0.0.1")
  );
}

export function useMock() {
  // 1) URL로 강제: ?mock=1 / ?mock=0 (데모 공유할 때 제일 편함)
  const p = new URLSearchParams(window.location.search);
  const qp = p.get("mock");
  if (qp === "1") return true;
  if (qp === "0") return false;

  // 2) localStorage로 강제
  const ls = localStorage.getItem(LS_KEY);
  if (ls === "1") return true;
  if (ls === "0") return false;

  // 3) 기본 정책: DEV거나 테스트 호스트면 mock
  return import.meta.env.DEV || isTestHost();
}

export function setUseMock(v: boolean) {
  localStorage.setItem(LS_KEY, v ? "1" : "0");
}
