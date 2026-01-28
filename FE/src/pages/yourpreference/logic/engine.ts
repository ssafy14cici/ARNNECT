// FE/src/pages/yourpreference/logic/engine.ts
import { mockArtworks, type BlindArtwork } from "../data/mockArtworks";
import type { BlindTasteSession } from "../store/session";

export type BlindTasteResult = {
  topTags: { tag: string; score: number }[];
  // 16-type (예술 MBTI) 결과를 같이 들고가고 싶으면 아래 사용
  mbti?: {
    type: string; // 4-letter
    axes: { key: string; left: string; right: string; leftScore: number; rightScore: number }[];
    summary: string;
  };
};

type Pair = { left: BlindArtwork; right: BlindArtwork };

function byId(id: string) {
  const a = mockArtworks.find((x) => x.id === id);
  if (!a) throw new Error(`mockArtworks에 id=${id}가 없습니다.`);
  return a;
}

function pickTwo(ids: string[]) {
  if (ids.length < 2) return null;
  const aIdx = Math.floor(Math.random() * ids.length);
  let bIdx = Math.floor(Math.random() * (ids.length - 1));
  if (bIdx >= aIdx) bIdx += 1;
  return [ids[aIdx], ids[bIdx]] as const;
}

/** ✅ 세션이 없거나 깨졌을 때도 Battle이 바로 뜨게: 초기 세션 생성 */
export function createInitialSession(opts?: { totalRounds?: number }): BlindTasteSession {
  const totalRounds = opts?.totalRounds ?? 8;
  const allIds = mockArtworks.map((a) => a.id);
  const picked = pickTwo(allIds);

  const currentPair: Pair | undefined = picked
    ? { left: byId(picked[0]), right: byId(picked[1]) }
    : undefined;

  // ⚠️ BlindTasteSession 타입에 없는 필드여도 런타임은 OK
  return {
    round: 1,
    totalRounds,
    selectedIds: [],
    remainingIds: allIds,
    currentPair,
    done: false,
  } as any;
}

/** ✅ currentPair가 없으면 강제로 만들어서 반환 */
export function ensureCurrentPair(session: BlindTasteSession): BlindTasteSession {
  const s = session as any;

  const hasPair =
    s?.currentPair?.left?.id &&
    s?.currentPair?.right?.id &&
    s.currentPair.left.id !== s.currentPair.right.id;

  if (hasPair) return session;

  const selected = new Set<string>(Array.isArray(s?.selectedIds) ? s.selectedIds : []);
  const remaining: string[] = Array.isArray(s?.remainingIds)
    ? s.remainingIds
    : mockArtworks.map((a) => a.id).filter((id) => !selected.has(id));

  if (remaining.length < 2) {
    return { ...s, done: true, remainingIds: remaining, currentPair: undefined } as any;
  }

  const picked = pickTwo(remaining);
  if (!picked) {
    return { ...s, done: true, remainingIds: remaining, currentPair: undefined } as any;
  }

  return {
    ...s,
    remainingIds: remaining,
    currentPair: { left: byId(picked[0]), right: byId(picked[1]) },
    done: false,
  } as any;
}

/** ✅ 선택 처리 + 다음 pair로 진행 (Battle에서 쓰는 핵심) */
export function pickInSession(session: BlindTasteSession, pickedId: string): BlindTasteSession {
  const s = ensureCurrentPair(session) as any;

  const totalRounds: number = s.totalRounds ?? 8;
  const round: number = s.round ?? 1;

  const leftId: string | undefined = s.currentPair?.left?.id;
  const rightId: string | undefined = s.currentPair?.right?.id;

  // pair가 없으면 더 진행 불가
  if (!leftId || !rightId) return { ...s, done: true } as any;

  // selectedIds 누적
  const selected = new Set<string>(Array.isArray(s.selectedIds) ? s.selectedIds : []);
  selected.add(pickedId);

  // 이번 라운드에 노출된 2개는 remaining에서 제거 (한 회차 내 중복 방지)
  const remainingRaw: string[] = Array.isArray(s.remainingIds) ? s.remainingIds : mockArtworks.map((a) => a.id);
  const remaining = remainingRaw.filter((id) => id !== leftId && id !== rightId);

  const nextRound = round + 1;
  const done = nextRound > totalRounds || remaining.length < 2;

  if (done) {
    return {
      ...s,
      selectedIds: Array.from(selected),
      remainingIds: remaining,
      round: Math.min(nextRound, totalRounds),
      done: true,
      currentPair: undefined,
    } as any;
  }

  const picked2 = pickTwo(remaining);
  const nextPair: Pair | undefined = picked2
    ? { left: byId(picked2[0]), right: byId(picked2[1]) }
    : undefined;

  return {
    ...s,
    selectedIds: Array.from(selected),
    remainingIds: remaining,
    round: nextRound,
    done: false,
    currentPair: nextPair,
  } as any;
}

/** ✅ Battle.tsx가 요구한 이름으로 export */
export const nextPairAfterPick = pickInSession;

/* ---------------------------
   결과 계산(태그 기반) + 16타입(선택)
---------------------------- */

export function computeScores(artworks: BlindArtwork[], session: BlindTasteSession) {
  const s = session as any;
  const picked = new Set<string>(Array.isArray(s.selectedIds) ? s.selectedIds : []);
  const score: Record<string, number> = {};

  for (const a of artworks) {
    if (!picked.has(a.id)) continue;
    for (const t of a.tags) score[t] = (score[t] ?? 0) + 1;
  }
  return score;
}

export function computeResult(artworks: BlindArtwork[], session: BlindTasteSession): BlindTasteResult {
  const scoreMap = computeScores(artworks, session);

  const topTags = Object.entries(scoreMap)
    .map(([tag, score]) => ({ tag, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  // ✅ 16-type(예술 MBTI)까지 같이 만들고 싶으면 아래 on
  const mbti = computeArtMbti(scoreMap);

  return { topTags, mbti };
}

/** 4축 → 16타입 (태그 없으면 “mockArtworks” 태그 체계를 이 축으로 맞추면 됨) */
function computeArtMbti(scoreMap: Record<string, number>) {
  const AXES = [
    {
      key: "M/O",
      left: "M",
      right: "O",
      leftTags: ["minimal", "clean", "space", "quiet"],
      rightTags: ["ornate", "detail", "pattern", "dense"],
      leftName: "미니멀",
      rightName: "맥시멀",
    },
    {
      key: "W/C",
      left: "W",
      right: "C",
      leftTags: ["warm", "sun", "earth", "softwarm"],
      rightTags: ["cool", "blue", "icy", "neon"],
      leftName: "웜",
      rightName: "쿨",
    },
    {
      key: "O/G",
      left: "O",
      right: "G",
      leftTags: ["organic", "flow", "nature", "brush"],
      rightTags: ["geometric", "grid", "sharp", "lines"],
      leftName: "유기",
      rightName: "기하",
    },
    {
      key: "S/D",
      left: "S",
      right: "D",
      leftTags: ["calm", "soft", "mist", "minimal"],
      rightTags: ["dynamic", "energy", "bold", "contrast"],
      leftName: "차분",
      rightName: "역동",
    },
  ] as const;

  const axes = AXES.map((a) => {
    const leftScore = a.leftTags.reduce((sum, t) => sum + (scoreMap[t] ?? 0), 0);
    const rightScore = a.rightTags.reduce((sum, t) => sum + (scoreMap[t] ?? 0), 0);
    return { key: a.key, left: a.left, right: a.right, leftScore, rightScore, leftName: a.leftName, rightName: a.rightName };
  });

  const type = axes
    .map((a) => (a.leftScore >= a.rightScore ? a.left : a.right))
    .join("");

  const summary = axes
    .map((a) => (a.leftScore >= a.rightScore ? a.leftName : a.rightName))
    .join(" · ");

  return { type, axes: axes.map(({ key, left, right, leftScore, rightScore }) => ({ key, left, right, leftScore, rightScore })), summary };
}
