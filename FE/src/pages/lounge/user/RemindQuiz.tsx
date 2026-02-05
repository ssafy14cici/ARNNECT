// FE/src/pages/lounge/user/RemindQuiz.tsx
import { useEffect, useMemo, useState } from "react";
import "../lounge.css";
import { http } from "../../../shared/api/http";

// --------------------
// Types
// --------------------
type RemindItem = {
  name: string;
  score: number;
};

type ActivitySummary = {
  favorite_cnt: number;
  comment_cnt: number;
  ticket_cnt: number;
};

type RemindResponse = {
  topGenres: RemindItem[];
  topTags: RemindItem[];
  topArtists: RemindItem[];
  activitySummary: ActivitySummary;
};

type QuizState = "idle" | "loading" | "ready" | "playing" | "result" | "error";

type PrefKind = "GENRE" | "TAG" | "ARTIST";

type PreferenceQuestion = {
  kind: PrefKind;
  prompt: string;
  choices: string[];
  answer: string;
};

// --------------------
// Helpers
// --------------------
type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}
function get(obj: JsonRecord, key: string): unknown {
  return obj[key];
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 서버가 envelope({data},{result})로 주든, 그냥 raw로 주든 흡수
 * + 컨트롤러가 List로 내려주는 경우도(현재 시그니처) 흡수
 */
function unwrapEnvelope(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  if ("data" in raw) return (raw as any).data;
  if ("result" in raw) return (raw as any).result;
  if ("content" in raw) return (raw as any).content;
  return raw;
}

function parseRemindResponse(raw: unknown): RemindResponse | null {
  const unwrapped = unwrapEnvelope(raw);

  // 1) List 형태면 첫 번째를 사용 (백엔드 시그니처가 List라서 대비)
  const candidate = isArray(unwrapped) ? unwrapped[0] : unwrapped;
  if (!isRecord(candidate)) return null;

  const topGenresRaw = get(candidate, "topGenres");
  const topTagsRaw = get(candidate, "topTags");
  const topArtistsRaw = get(candidate, "topArtists");
  const activityRaw = get(candidate, "activitySummary");

  const parseList = (v: unknown): RemindItem[] => {
    if (!isArray(v)) return [];
    return v
      .map((x) => {
        if (!isRecord(x)) return null;
        return {
          name: asString(get(x, "name"), ""),
          score: asNumber(get(x, "score"), 0),
        };
      })
      .filter((x): x is RemindItem => !!x && !!x.name);
  };

  const parseActivity = (v: unknown): ActivitySummary => {
    if (!isRecord(v)) return { favorite_cnt: 0, comment_cnt: 0, ticket_cnt: 0 };
    return {
      favorite_cnt: asNumber(get(v, "favorite_cnt"), 0),
      comment_cnt: asNumber(get(v, "comment_cnt"), 0),
      ticket_cnt: asNumber(get(v, "ticket_cnt"), 0),
    };
  };

  const topGenres = parseList(topGenresRaw);
  const topTags = parseList(topTagsRaw);
  const topArtists = parseList(topArtistsRaw);
  const activitySummary = parseActivity(activityRaw);

  return { topGenres, topTags, topArtists, activitySummary };
}

// 오답 보충용 fallback 풀
const FALLBACK_GENRES = ["추상화", "정물화", "풍경화", "초상화", "일러스트", "팝아트", "현대미술"];
const FALLBACK_TAGS = ["밝은", "차분한", "따뜻함", "차가움", "역동적", "몽환적", "미니멀"];
const FALLBACK_ARTISTS = ["예술가1", "예술가2", "예술가3", "작가A", "작가B", "작가C", "작가D"];

function buildPreferenceQuestion(data: RemindResponse): PreferenceQuestion | null {
  const kinds: PrefKind[] = [];

  if (data.topGenres.length >= 1) kinds.push("GENRE");
  if (data.topTags.length >= 1) kinds.push("TAG");
  if (data.topArtists.length >= 1) kinds.push("ARTIST");

  if (kinds.length === 0) return null;

  const kind = kinds[Math.floor(Math.random() * kinds.length)];

  let correct = "";
  let pool: string[] = [];
  let prompt = "";

  if (kind === "GENRE") {
    correct = data.topGenres[0]?.name ?? "";
    prompt = "Q. 내가 가장 많이 반응한 장르는?";
    pool = [
      ...data.topGenres.map((x) => x.name),
      ...data.topTags.map((x) => x.name),
      ...FALLBACK_GENRES,
    ];
  } else if (kind === "TAG") {
    correct = data.topTags[0]?.name ?? "";
    prompt = "Q. 내가 가장 많이 반응한 태그는?";
    pool = [
      ...data.topTags.map((x) => x.name),
      ...data.topGenres.map((x) => x.name),
      ...FALLBACK_TAGS,
    ];
  } else {
    correct = data.topArtists[0]?.name ?? "";
    prompt = "Q. 내가 가장 많이 반응한 작가는?";
    pool = [
      ...data.topArtists.map((x) => x.name),
      ...FALLBACK_ARTISTS,
    ];
  }

  correct = correct.trim();
  if (!correct) return null;

  // 중복 제거 + 정답 제외
  const uniq = Array.from(new Set(pool.map((x) => String(x).trim()).filter(Boolean)));
  const wrongPool = uniq.filter((x) => x !== correct);

  const wrongs = shuffle(wrongPool).slice(0, 3);
  const choices = shuffle([correct, ...wrongs]);

  if (choices.length < 4) return null;

  return { kind, prompt, answer: correct, choices };
}

// --------------------
// API
// --------------------
async function fetchRemind(): Promise<RemindResponse> {
  /**
   * ✅ 주의
   * http의 baseURL이 이미 "/api/v1" 포함이면 "/remind" 사용
   * 포함이 아니면 "/api/v1/remind" 사용
   */
  const REMIND_PATH = "/api/v1/remind";

  const res = await http.get(REMIND_PATH);
  const parsed = parseRemindResponse(res.data);

  if (!parsed) throw new Error("Invalid remind response");
  return parsed;
}

// --------------------
// Component
// --------------------
export default function RemindQuiz() {
  const [state, setState] = useState<QuizState>("idle");
  const [data, setData] = useState<RemindResponse | null>(null);

  const [question, setQuestion] = useState<PreferenceQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setState("loading");
        const d = await fetchRemind();
        setData(d);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, []);

  const totalActivity = useMemo(() => {
    const a = data?.activitySummary;
    if (!a) return 0;
    return (a.favorite_cnt ?? 0) + (a.comment_cnt ?? 0) + (a.ticket_cnt ?? 0);
  }, [data]);

  const description = useMemo(() => {
    if (!data) return "";
    const a = data.activitySummary;
    const low = totalActivity < 5;
    return low
      ? `활동 데이터가 적어서(총 ${totalActivity}) 상위 취향(장르/태그/작가) 기반 퀴즈를 제공합니다.`
      : `내 활동(총 ${totalActivity})을 기반으로 취향 퀴즈를 제공합니다.`;
  }, [data, totalActivity]);

  function startQuiz() {
    if (!data) return;

    setSelected(null);
    setIsCorrect(null);

    const q = buildPreferenceQuestion(data);
    if (!q) {
      setState("error");
      return;
    }
    setQuestion(q);
    setState("playing");
  }

  function chooseAnswer(ans: string) {
    if (!question) return;
    setSelected(ans);
    setIsCorrect(ans === question.answer);
    setState("result");
  }

  return (
    <section className="tasteCard">
      <h2 className="tasteCardTitle">리마인드 퀴즈</h2>
      <p className="loungeSubDesc" style={{ marginTop: 6 }}>
        {state === "loading" ? "불러오는 중..." : description}
      </p>

      {/* Summary */}
      {data && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
            ❤️ 좋아요 {data.activitySummary.favorite_cnt} · 💬 댓글 {data.activitySummary.comment_cnt} · 🎟️ 티켓 {data.activitySummary.ticket_cnt}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
              Top 장르: {data.topGenres.slice(0, 3).map((x) => x.name).join(", ") || "-"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
              Top 태그: {data.topTags.slice(0, 3).map((x) => x.name).join(", ") || "-"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
              Top 작가: {data.topArtists.slice(0, 3).map((x) => x.name).join(", ") || "-"}
            </div>
          </div>
        </div>
      )}

      {/* State UI */}
      {state === "loading" && <div className="loungeEmpty">불러오는 중...</div>}

      {state === "error" && (
        <div className="loungeEmpty">
          리마인드 퀴즈 데이터를 만들 수 없습니다. (응답 형태/권한/로그인 상태 확인 필요)
        </div>
      )}

      {state === "ready" && (
        <div className="loungeSubActions" style={{ marginTop: 12 }}>
          <button className="loungeSubBtn" type="button" onClick={startQuiz}>
            퀴즈 시작
          </button>
        </div>
      )}

      {state === "playing" && question && (
        <div className="tasteDetailGrid" style={{ marginTop: 12 }}>
          <section className="tasteCard">
            <h3 className="tasteCardTitle">{question.prompt}</h3>

            <div className="quizChoices" style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {question.choices.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="loungeTabBtn"
                  onClick={() => chooseAnswer(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
              * 상위 데이터(장르/태그/작가) + fallback 풀로 문제를 구성합니다.
            </div>
          </section>
        </div>
      )}

      {state === "result" && question && (
        <section className="tasteCard" style={{ marginTop: 12 }}>
          <h3 className="tasteCardTitle">{isCorrect ? "정답입니다" : "오답입니다"}</h3>

          <div style={{ color: "rgba(0,0,0,0.60)" }}>
            선택: <b>{selected}</b>
            <br />
            정답: <b>{question.answer}</b>
          </div>

          <div className="loungeSubActions" style={{ marginTop: 12 }}>
            <button className="loungeSubBtn" type="button" onClick={startQuiz}>
              다음 문제
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
