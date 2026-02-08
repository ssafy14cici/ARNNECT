// FE/src/pages/lounge/user/RemindQuiz.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../lounge.css";
import { http } from "../../../shared/api/http";

// --------------------
// Types
// --------------------
type RemindQuizItem = {
  reviewId: number | string;
  quiz: string;
};

type QuizState = "idle" | "loading" | "ready" | "playing" | "error";

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
function asNumberOrString(v: unknown): number | string {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "").trim();
  const n = Number(s);
  if (Number.isFinite(n) && s !== "") return n;
  return s || 0;
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
 * 서버가 envelope({data}/{result}/{content})로 주든, raw로 주든 흡수
 */
function unwrapEnvelope(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  if ("data" in raw) return (raw as any).data;
  if ("result" in raw) return (raw as any).result;
  if ("content" in raw) return (raw as any).content;
  return raw;
}

function parseRemindQuizList(raw: unknown): RemindQuizItem[] {
  const unwrapped = unwrapEnvelope(raw);
  if (!isArray(unwrapped)) return [];

  return unwrapped
    .map((x) => {
      if (!isRecord(x)) return null;
      const reviewId = asNumberOrString(get(x, "reviewId"));
      const quiz = asString(get(x, "quiz"), "").trim();
      if (!quiz) return null;
      return { reviewId, quiz };
    })
    .filter((x): x is RemindQuizItem => !!x);
}

// --------------------
// API
// --------------------
async function fetchRemindQuiz(): Promise<RemindQuizItem[]> {
  /**
   * ✅ 주의
   * http baseURL이 이미 "/api/v1" 포함이면 "/remind"
   * 포함이 아니면 "/api/v1/remind"
   * (프로젝트 세팅에 맞춰 하나만 남겨)
   */
  const REMIND_PATH = "/api/v1/remind";

  const res = await http.get(REMIND_PATH);
  return parseRemindQuizList(res.data);
}

// --------------------
// Component
// --------------------
export default function RemindQuiz() {
  const nav = useNavigate();

  const [state, setState] = useState<QuizState>("idle");
  const [items, setItems] = useState<RemindQuizItem[]>([]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setState("loading");
        const list = await fetchRemindQuiz();
        if (!list.length) {
          setItems([]);
          setState("error");
          return;
        }
        setItems(list);
        setCurrentIdx(0);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, []);

  const count = items.length;
  const current = items[currentIdx];

  const description = useMemo(() => {
    if (state === "loading") return "불러오는 중...";
    if (state === "error") return "퀴즈 데이터를 만들 수 없습니다. (응답/로그인 상태 확인 필요)";
    return `리마인드 퀴즈 ${count}개 중 ${count ? currentIdx + 1 : 0}번째`;
  }, [state, count, currentIdx]);

  function start() {
    if (!items.length) {
      setState("error");
      return;
    }
    setAnswerText("");
    setSubmitted(false);

    // 랜덤 시작하고 싶으면 아래 2줄로 변경
    // const idx = Math.floor(Math.random() * items.length);
    // setCurrentIdx(idx);

    setState("playing");
  }

  function next() {
    if (!items.length) return;
    setAnswerText("");
    setSubmitted(false);

    // 순차 다음
    const nextIdx = (currentIdx + 1) % items.length;
    setCurrentIdx(nextIdx);
    setState("playing");
  }

  function submit() {
    if (!current) return;
    setSubmitted(true);
    // 채점은 불가(정답 데이터 없음)
  }

  function goReview() {
    if (!current) return;
    // 프로젝트 라우트가 /reviews/:reviewId 라는 가정
    nav(`/reviews/${current.reviewId}`);
  }

  return (
    <section className="tasteCard">
      <p className="loungeSubDesc" style={{ marginTop: 6 }}>
        {description}
      </p>

      {state === "loading" && <div className="loungeEmpty">불러오는 중...</div>}

      {state === "error" && (
        <div className="loungeEmpty">
          리뷰를 작성해주세요!
        </div>
      )}

      {state === "ready" && (
        <div className="loungeSubActions" style={{ marginTop: 12 }}>
          <button className="loungeSubBtn" type="button" onClick={start}>
            퀴즈 시작
          </button>
        </div>
      )}

      {state === "playing" && current && (
        <section className="tasteCard" style={{ marginTop: 12 }}>
          <h3 className="tasteCardTitle">Q.</h3>
          <div style={{ marginTop: 8, lineHeight: 1.6 }}>
            {current.quiz}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.55)" }}>
              내 답(주관식)
            </div>
            <input
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="여기에 입력"
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                outline: "none",
              }}
            />
          </div>

          <div className="loungeSubActions" style={{ marginTop: 12, gap: 10 }}>
            <button className="loungeSubBtn" type="button" onClick={submit}>
              제출
            </button>
            <button className="loungeSubBtn" type="button" onClick={goReview}>
              정답/내용 확인 (리뷰로 이동)
            </button>
          </div>
        </section>
      )}

      {state === "playing" && current && submitted && (
        <section className="tasteCard" style={{ marginTop: 12 }}>
          <h3 className="tasteCardTitle">제출 완료</h3>
          <div style={{ color: "rgba(255, 255, 255, 0.6)" }}>
            내 답: <b>{answerText || "(미입력)"}</b>
            <br />
            정답은 리뷰 상세에서 확인하세요.
          </div>

          <div className="loungeSubActions" style={{ marginTop: 12 }}>
            <button className="loungeSubBtn" type="button" onClick={next}>
              다음 문제
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
