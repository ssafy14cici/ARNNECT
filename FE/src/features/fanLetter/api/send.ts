// FE/src/features/fanLetter/api/send.ts
import { http } from "../../../shared/api/http";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";
const KEY = "arnnect_mock_fanletters_v1";

export type FanLetterSendReq = {
  artworkId: string;        // 지금 프론트가 string id 쓰는 케이스 많아서 일단 string
  artworkTitle: string;
  artistId?: string;
  artistName?: string;

  senderId: string;
  senderName: string;

  content: string;
};

type FanLetterSendItem = FanLetterSendReq & {
  id: string;
  createdAt: string;
  status: "SENT";
};

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function sendFanLetter(input: FanLetterSendReq) {
  if (USE_MOCK) {
    const all = safeParse<FanLetterSendItem[]>(localStorage.getItem(KEY), []);
    const item: FanLetterSendItem = {
      ...input,
      id: uid(),
      createdAt: new Date().toISOString(),
      status: "SENT",
    };
    localStorage.setItem(KEY, JSON.stringify([item, ...all]));
    return { ok: true, id: item.id };
  }

  // ✅ 실API: /api/v1/fanletters
  // 백엔드가 nickname을 세션에서 뽑는 구조면 senderName/senderId는 안 보내도 됨.
  const payload = {
    artworkId: Number(String(input.artworkId).replace("a", "")), // 임시 매핑(필요시 제거)
    content: input.content,
  };

  const res = await http.post("/api/v1/fanletters", payload);
  return res.data;
}
