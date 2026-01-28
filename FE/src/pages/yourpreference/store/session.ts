export type BlindTasteSession = {
  seed: string;               // 세션 식별(추후 서버 연동 대비)
  startedAt: string;
  round: number;
  totalRounds: number;
  selectedIds: string[];      // 유저가 고른 작품 id 기록
};

const KEY = "arnnect_blindtaste_v1";

export function createSession(totalRounds = 8): BlindTasteSession {
  const seed = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return {
    seed,
    startedAt: new Date().toISOString(),
    round: 0,
    totalRounds,
    selectedIds: [],
  };
}

export function loadSession(): BlindTasteSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BlindTasteSession;
  } catch {
    return null;
  }
}

export function saveSession(session: BlindTasteSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
