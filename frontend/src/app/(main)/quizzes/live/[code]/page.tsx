"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Flame, Trophy } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

// ─── WS protocol types ────────────────────────────────────────

type WsMsg =
  | { type: "session_state"; data: SessionState }
  | { type: "game_started"; data: { totalQuestions: number; mode: string } }
  | { type: "question"; data: QuestionEvt }
  | { type: "answer_accepted"; data: AnswerResult }
  | { type: "question_ended"; data: QuestionEndedEvt }
  | { type: "game_ended"; data: { finalLeaderboard: LeaderEntry[] } }
  | { type: "error"; data: { message: string } };

type SessionState = {
  status: string;
  mode: string;
  quizTitle: string;
  totalQuestions: number;
  currentQuestion: number;
};

type LiveQuestion = {
  id: string;
  questionText: string;
  questionType: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  timeLimit: number;
  imageUrl?: string;
};

type QuestionEvt = {
  index: number;
  total: number;
  deadlineMs: number;
  question: LiveQuestion;
};

type AnswerResult = {
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  streak: number;
};

type QuestionEndedEvt = {
  questionIndex: number;
  correctOption?: string;
  blankAnswer?: string;
  leaderboard: LeaderEntry[];
};

type LeaderEntry = { id: string; displayName: string; score: number; streak: number; rank: number };

type Phase =
  | "waiting"    // in lobby or waiting for next question
  | "question"   // answering
  | "answered"   // submitted, waiting for reveal
  | "revealed"   // question ended, showing result
  | "finished";  // game over

// ─── Main component ───────────────────────────────────────────

function LiveGameInner() {
  const { t } = useLocale();
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const pid = searchParams.get("pid") ?? "";

  const [phase, setPhase] = useState<Phase>("waiting");
  const [quizTitle, setQuizTitle] = useState("");
  const [totalQ, setTotalQ] = useState(0);
  const [currentQEvt, setCurrentQEvt] = useState<QuestionEvt | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [questionEnded, setQuestionEnded] = useState<QuestionEndedEvt | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderEntry[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [blankInput, setBlankInput] = useState("");
  const [wsError, setWsError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0); // question start time for timeSpent

  // ── Connect ──
  useEffect(() => {
    if (!pid || !code) return;

    const backendWsUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1")
      .replace("/api/v1", "")
      .replace("http://", "ws://")
      .replace("https://", "wss://");

    const url = `${backendWsUrl}/api/v1/live/${code}/ws?role=player&pid=${pid}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMsg;
        handleServerMsg(msg);
      } catch {}
    };

    ws.onerror = () => setWsError("Connection error");
    ws.onclose = () => {
      if (phase !== "finished") setWsError("Disconnected from session");
    };

    return () => {
      ws.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pid, code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleServerMsg = useCallback((msg: WsMsg) => {
    switch (msg.type) {
      case "session_state":
        setQuizTitle(msg.data.quizTitle);
        setTotalQ(msg.data.totalQuestions);
        if (msg.data.status === "lobby" || msg.data.status === "active") {
          setPhase("waiting");
        }
        break;

      case "game_started":
        setTotalQ(msg.data.totalQuestions);
        setPhase("waiting");
        break;

      case "question":
        setCurrentQEvt(msg.data);
        setAnswerResult(null);
        setQuestionEnded(null);
        setSelectedOpt(null);
        setBlankInput("");
        setPhase("question");
        startRef.current = Date.now();
        startTimer(msg.data.deadlineMs);
        break;

      case "answer_accepted":
        setAnswerResult(msg.data);
        setScore(msg.data.totalScore);
        setStreak(msg.data.streak);
        setPhase("answered");
        break;

      case "question_ended":
        stopTimer();
        setQuestionEnded(msg.data);
        setPhase("revealed");
        break;

      case "game_ended":
        stopTimer();
        setFinalLeaderboard(msg.data.finalLeaderboard);
        setPhase("finished");
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startTimer(deadlineMs: number) {
    stopTimer();
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setTimeLeft(left);
    }, 250);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(0);
  }

  const submitAnswer = useCallback((option?: string, text?: string) => {
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    wsRef.current?.send(JSON.stringify({
      type: "submit_answer",
      data: { option: option ?? "", textAnswer: text ?? "", timeSpent },
    }));
  }, []);

  // ── Render ────────────────────────────────────────────────────

  if (!pid) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--text-secondary)]">Invalid session link. Please join via the code page.</p>
        <Link href="/quizzes/join"><Button variant="outline">Join a game</Button></Link>
      </div>
    );
  }

  if (wsError && phase !== "finished") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400">{wsError}</p>
        <Link href="/quizzes/join"><Button variant="outline">{t("quiz.backToLibrary")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">{quizTitle}</p>
          {currentQEvt ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {t("quiz.live.question")} {currentQEvt.index + 1} / {totalQ}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 font-semibold text-amber-400">
            <Star className="h-4 w-4 fill-amber-400" />
            {score}
          </span>
          {streak > 1 ? (
            <span className="flex items-center gap-1 font-semibold text-orange-400">
              <Flame className="h-4 w-4 fill-orange-400" />
              {streak}
            </span>
          ) : null}
        </div>
      </div>

      {/* Phases */}
      {phase === "waiting" && (
        <WaitingScreen title={quizTitle} />
      )}

      {phase === "question" && currentQEvt && (
        <QuestionScreen
          evt={currentQEvt}
          timeLeft={timeLeft}
          selectedOpt={selectedOpt}
          blankInput={blankInput}
          onBlankChange={setBlankInput}
          onSelect={(opt) => {
            setSelectedOpt(opt);
            submitAnswer(opt);
          }}
          onBlankSubmit={() => submitAnswer(undefined, blankInput)}
        />
      )}

      {phase === "answered" && answerResult && (
        <AnsweredScreen result={answerResult} t={t} />
      )}

      {phase === "revealed" && questionEnded && answerResult && (
        <RevealedScreen ended={questionEnded} result={answerResult} t={t} />
      )}

      {phase === "revealed" && questionEnded && !answerResult && (
        <RevealedScreen ended={questionEnded} result={null} t={t} />
      )}

      {phase === "finished" && (
        <FinishedScreen leaderboard={finalLeaderboard} pid={pid} t={t} />
      )}
    </div>
  );
}

// ─── Sub-screens ──────────────────────────────────────────────

function WaitingScreen({ title }: { title: string }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-[var(--primary)]/10">
        <Star className="h-8 w-8 text-[var(--primary)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("quiz.live.waitingStart")}</h2>
      <p className="text-sm text-[var(--text-secondary)]">{t("quiz.live.hostStartsSoon")}</p>
    </div>
  );
}

const OPTION_COLORS = [
  "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300",
  "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300",
  "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300",
  "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300",
];
const OPTION_KEYS = ["a", "b", "c", "d"] as const;

function QuestionScreen({
  evt, timeLeft, selectedOpt, blankInput, onBlankChange, onSelect, onBlankSubmit,
}: {
  evt: QuestionEvt;
  timeLeft: number;
  selectedOpt: string | null;
  blankInput: string;
  onBlankChange: (v: string) => void;
  onSelect: (opt: string) => void;
  onBlankSubmit: () => void;
}) {
  const { t } = useLocale();
  const q = evt.question;
  const pct = q.timeLimit > 0 ? (timeLeft / q.timeLimit) * 100 : 0;

  const optValues: Record<string, string | undefined> = {
    a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD,
  };

  return (
    <div className="space-y-5">
      {/* Timer bar */}
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-base)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${pct > 40 ? "bg-emerald-500" : pct > 20 ? "bg-amber-400" : "bg-rose-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Question */}
      {q.imageUrl ? (
        <img src={q.imageUrl} alt="" className="w-full rounded-[1.2rem] object-cover" style={{ maxHeight: 200 }} />
      ) : null}
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <p className="text-lg font-semibold leading-snug text-[var(--text-primary)]">{q.questionText}</p>
      </div>

      {/* Answer inputs */}
      {q.questionType === "mcq" && (
        <div className="grid grid-cols-2 gap-3">
          {OPTION_KEYS.map((opt, i) => {
            const val = optValues[opt];
            if (!val) return null;
            const chosen = selectedOpt === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={!!selectedOpt}
                onClick={() => onSelect(opt)}
                className={`flex items-center gap-2 rounded-[1.2rem] border-2 p-4 text-left text-sm font-medium transition-all ${
                  chosen
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                    : OPTION_COLORS[i]
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                  {opt.toUpperCase()}
                </span>
                {val}
              </button>
            );
          })}
        </div>
      )}

      {q.questionType === "true_false" && (
        <div className="grid grid-cols-2 gap-3">
          {(["t", "f"] as const).map((opt, i) => {
            const label = opt === "t" ? "True" : "False";
            const chosen = selectedOpt === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={!!selectedOpt}
                onClick={() => onSelect(opt)}
                className={`rounded-[1.2rem] border-2 p-5 text-center text-base font-semibold transition-all ${
                  chosen
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                    : i === 0
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {q.questionType === "fill_blank" && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (blankInput.trim()) onBlankSubmit(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={blankInput}
            onChange={(e) => onBlankChange(e.target.value)}
            placeholder={t("quiz.fillBlankPlaceholder") || "Your answer…"}
            disabled={!!selectedOpt}
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
          />
          <Button type="submit" disabled={!blankInput.trim() || !!selectedOpt}>
            {t("quiz.submit") || "Submit"}
          </Button>
        </form>
      )}
    </div>
  );
}

function AnsweredScreen({ result, t }: { result: AnswerResult; t: (k: string) => string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full ${result.isCorrect ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
        <span className="text-4xl">{result.isCorrect ? "✓" : "✗"}</span>
      </div>
      <h2 className={`text-2xl font-bold ${result.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
        {result.isCorrect ? t("quiz.live.correct") : t("quiz.live.wrong")}
      </h2>
      {result.isCorrect ? (
        <p className="text-lg font-semibold text-amber-400">+{result.pointsEarned} {t("quiz.live.points")}</p>
      ) : null}
      <p className="text-sm text-[var(--text-muted)]">Waiting for next question…</p>
    </div>
  );
}

function RevealedScreen({ ended, result, t }: { ended: QuestionEndedEvt; result: AnswerResult | null; t: (k: string) => string }) {
  const myEntry = ended.leaderboard.find((e) => result?.totalScore === e.score);

  return (
    <div className="space-y-5">
      {result ? (
        <div className={`flex items-center justify-between gap-3 rounded-[1.5rem] border-2 p-4 ${
          result.isCorrect
            ? "border-emerald-500/30 bg-emerald-500/8"
            : "border-rose-500/30 bg-rose-500/8"
        }`}>
          <div>
            <p className={`font-semibold ${result.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
              {result.isCorrect ? t("quiz.live.correct") : t("quiz.live.wrong")}
            </p>
            {ended.correctOption ? (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Answer: {ended.correctOption.toUpperCase()}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{result.totalScore}</p>
            <p className="text-xs text-[var(--text-muted)]">{t("quiz.live.yourScore")}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">{t("quiz.live.tooSlow")}</p>
          {ended.correctOption ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Answer: {ended.correctOption.toUpperCase()}</p>
          ) : null}
        </div>
      )}

      {/* Mini leaderboard top-3 */}
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t("quiz.live.leaderboard")}
        </p>
        <ul className="space-y-2">
          {ended.leaderboard.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-center font-bold text-[var(--text-muted)]">{e.rank}</span>
              <span className="flex-1 text-[var(--text-primary)]">{e.displayName}</span>
              <span className="font-semibold text-[var(--primary)]">{e.score}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-sm text-[var(--text-muted)]">Waiting for next question…</p>
    </div>
  );
}

function FinishedScreen({ leaderboard, pid, t }: { leaderboard: LeaderEntry[]; pid: string; t: (k: string) => string }) {
  const myEntry = leaderboard.find((e) => e.id === pid);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Trophy className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{t("quiz.live.finalResults")}</h1>
        {myEntry ? (
          <p className="mt-1 text-[var(--text-secondary)]">
            {t("quiz.live.rank")} {myEntry.rank} — {myEntry.score} {t("quiz.live.points")}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)]">
        <ul className="divide-y divide-[var(--border)]">
          {leaderboard.map((e, i) => (
            <li
              key={e.id}
              className={`flex items-center gap-3 px-5 py-3 ${e.id === pid ? "bg-[var(--primary)]/5" : ""}`}
            >
              <span className="w-7 text-center text-sm font-bold text-[var(--text-muted)]">
                {i < 3 ? medals[i] : e.rank}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{e.displayName}</span>
              <span className="font-semibold text-[var(--primary)]">{e.score}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/quizzes">
        <Button variant="outline" size="lg" className="w-full">
          {t("quiz.backToLibrary")}
        </Button>
      </Link>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────

export default function LiveGamePage() {
  return (
    <Suspense>
      <LiveGameInner />
    </Suspense>
  );
}
