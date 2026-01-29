//FE\src\pages\lounge\user\Quiz.tsx
import { useEffect, useMemo, useState } from "react";
import "../lounge.css";

// --------------------
// Types
// --------------------
type Artwork = {
  artworkId: number | string;
  title: string;
  thumbnailUrl?: string;
  artistName?: string;
};

type QuizType = "TITLE_GUESS" | "PREFERENCE";
type QuizState = "idle" | "loading" | "ready" | "playing" | "result" | "error";

type TitleGuessQuestion = {
  artwork: Artwork;      // 출제 작품(이미지/작가명 힌트)
  choices: string[];     // 보기(4지선다)
  answer: string;        // 정답(title)
};

// --------------------
// Helpers
// --------------------
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchMyFeed(): Promise<Artwork[]> {
  // TODO: 실제 API로 교체
  // 예: const res = await fetch("/api/users/me/feed", { credentials: "include" });
  // const data = await res.json();
  // return data.items.map(...)
  return [
    { artworkId: 1, title: "푸른 밤", thumbnailUrl: "", artistName: "Artist A" },
    { artworkId: 2, title: "비 오는 거리", thumbnailUrl: "", artistName: "Artist B" },
    { artworkId: 3, title: "정적", thumbnailUrl: "", artistName: "Artist C" },
  ];
}

// 오답 보충용 더미 풀(나중에 “추천 작품” API로 대체 가능)
const FALLBACK_TITLES = [
  "기억의 조각",
  "붉은 정원",
  "모노톤",
  "빛의 파편",
  "초여름",
  "새벽의 온도",
  "한 장면",
];

function buildTitleGuessQuestion(feed: Artwork[]): TitleGuessQuestion | null {
  if (!feed.length) return null;

  const pick = feed[Math.floor(Math.random() * feed.length)];
  const correct = pick.title;

  const fromFeed = feed
    .map((x) => x.title)
    .filter((t) => t && t !== correct);

  const pool = shuffle([...new Set([...fromFeed, ...FALLBACK_TITLES])])
    .filter((t) => t !== correct);

  const wrongs = pool.slice(0, 3);
  const choices = shuffle([correct, ...wrongs]);

  // 보기 4개가 안되면 실패 처리(데이터 너무 없음)
  if (choices.length < 4) return null;

  return { artwork: pick, choices, answer: correct };
}

export default function Quiz() {
  const [state, setState] = useState<QuizState>("idle");
  const [quizType, setQuizType] = useState<QuizType>("TITLE_GUESS");
  const [feed, setFeed] = useState<Artwork[]>([]);
  const [question, setQuestion] = useState<TitleGuessQuestion | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const feedCount = feed.length;

  // 초기 로드: 내 피드 가져오기 → 퀴즈 타입 결정
  useEffect(() => {
    (async () => {
      try {
        setState("loading");
        const data = await fetchMyFeed();
        setFeed(data);

        const type: QuizType = data.length <= 5 ? "TITLE_GUESS" : "PREFERENCE";
        setQuizType(type);

        setState("ready");
      } catch (e) {
        setState("error");
      }
    })();
  }, []);

  const description = useMemo(() => {
    if (quizType === "TITLE_GUESS") {
      return "내 활동 데이터가 적어, 작품을 보고 제목을 맞추는 퀴즈를 제공합니다.";
    }
    return "내 활동/취향을 기반으로 퀴즈를 제공합니다.";
  }, [quizType]);

  function startQuiz() {
    setSelected(null);
    setIsCorrect(null);

    if (quizType === "TITLE_GUESS") {
      const q = buildTitleGuessQuestion(feed);
      if (!q) {
        setState("error");
        return;
      }
      setQuestion(q);
      setState("playing");
      return;
    }

    // TODO: PREFERENCE 퀴즈 구현
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
      <h2 className="tasteCardTitle">퀴즈</h2>
      <p className="loungeSubDesc" style={{ marginTop: 6 }}>
        {description} (내 피드 {feedCount}개)
      </p>

      {state === "loading" && <div className="loungeEmpty">불러오는 중...</div>}
      {state === "error" && (
        <div className="loungeEmpty">
          퀴즈 데이터를 만들 수 없습니다. (피드/작품 데이터 확인 필요)
        </div>
      )}

      {state === "ready" && (
        <div className="loungeSubActions">
          <button className="loungeSubBtn" type="button" onClick={startQuiz}>
            퀴즈 시작
          </button>
        </div>
      )}

      {state === "playing" && quizType === "TITLE_GUESS" && question && (
        <div className="tasteDetailGrid" style={{ marginTop: 12 }}>
          <section className="tasteCard">
            <h3 className="tasteCardTitle">Q. 이 작품의 제목은?</h3>

            {/* 썸네일 있으면 이미지 표시 */}
            {question.artwork.thumbnailUrl ? (
              <img
                src={question.artwork.thumbnailUrl}
                alt="quiz"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.06)",
                  marginTop: 10,
                }}
              />
            ) : (
              <div className="loungeEmpty" style={{ marginTop: 10 }}>
                (이미지 없음) — 대신 보기로 맞춰보세요
              </div>
            )}

            <div style={{ marginTop: 10, color: "rgba(0,0,0,0.55)", fontSize: 12 }}>
              힌트: 작가 {question.artwork.artistName ?? "알 수 없음"}
            </div>

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
          </section>
        </div>
      )}

      {state === "result" && quizType === "TITLE_GUESS" && question && (
        <section className="tasteCard" style={{ marginTop: 12 }}>
          <h3 className="tasteCardTitle">
            {isCorrect ? "정답입니다" : "오답입니다"}
          </h3>

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
