"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Loader2, Star, Flame, Trophy, WifiOff } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

// ─── WS protocol types ────────────────────────────────────────

type WsMsg =
  | { type: "session_state"; data: SessionState }
  | { type: "game_started"; data: { totalQuestions: number; mode: string } }
  | { type: "question"; data: QuestionEvt }
  | { type: "answer_accepted"; data: AnswerResult }
  | { type: "question_ended"; data: QuestionEndedEvt }
  | { type: "game_ended"; data: { finalLeaderboard: LeaderEntry[]; teamLeaderboard?: TeamScore[] } }
  | { type: "error"; data: { message: string } };

type SessionState = {
  status: string;
  mode: string;
  quizTitle: string;
  totalQuestions: number;
  currentQuestion: number;
};

type MatchPair = { left: string; right: string };

type HotspotZone = { id: number; x: number; y: number; r: number; label?: string };

type LiveCompSubQ = {
  id: string;
  type: string; // "mcq" | "true_false" | "fill_blank"
  prompt: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
};

type LiveQuestion = {
  id: string;
  questionText: string;
  questionType: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  reorderItems?: string[]; // shuffled display order for reorder questions
  matchLeft?: string[];    // left column items for matching questions
  matchRight?: string[];   // shuffled right column items for matching questions
  hotspotZones?: HotspotZone[];
  comprehensionPassage?: string;
  comprehensionSubQuestions?: LiveCompSubQ[];
  timeLimit: number;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
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

type TeamScore = { teamId: number; score: number };

type QuestionEndedEvt = {
  questionIndex: number;
  correctOption?: string;
  blankAnswer?: string;
  correctOrder?: string[]; // for reorder reveal
  matchPairs?: MatchPair[]; // for matching reveal
  leaderboard: LeaderEntry[];
  teamLeaderboard?: TeamScore[];
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
  const tidParam = searchParams.get("tid");

  const [phase, setPhase] = useState<Phase>("waiting");
  const [myTeamId, setMyTeamId] = useState<number>(tidParam !== null ? Number(tidParam) : -1);
  const [teamMode, setTeamMode] = useState(tidParam !== null && tidParam !== "-1");
  const [quizTitle, setQuizTitle] = useState("");
  const [totalQ, setTotalQ] = useState(0);
  const [currentQEvt, setCurrentQEvt] = useState<QuestionEvt | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [questionEnded, setQuestionEnded] = useState<QuestionEndedEvt | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderEntry[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamScore[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [blankInput, setBlankInput] = useState("");
  const [reorderDraft, setReorderDraft] = useState<string[]>([]);
  const [reorderSubmitted, setReorderSubmitted] = useState(false);
  const [matchDraft, setMatchDraft] = useState<Record<string, string>>({});
  const [compDraft, setCompDraft] = useState<Record<string, string>>({});
  const [labelingDraft, setLabelingDraft] = useState<Record<string, string>>({});
  const [wsError, setWsError] = useState("");
  // "connected" | "reconnecting" | "disconnected"
  const [wsStatus, setWsStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0); // question start time for timeSpent
  // prevLbRanks is state (not a ref) so it can be safely read in render.
  const [prevLbRanks, setPrevLbRanks] = useState<Map<string, number>>(new Map());
  // questionEndedRef lets handleServerMsg read the latest questionEnded value
  // without a stale closure (handleServerMsg has an empty deps array).
  const questionEndedRef = useRef<typeof questionEnded>(null);
  // phaseRef always holds the latest phase so ws.onclose never reads a
  // stale closure value captured when the WebSocket was first opened.
  const phaseRef = useRef<Phase>("waiting");
  const retryCountRef = useRef(0);
  // retryCount mirrors retryCountRef so it can be read safely during render.
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref indirection: connectWs calls itself for retries and handleServerMsg
  // for messages. Both are defined below; refs let the closures call the
  // latest version without circular const references.
  const connectWsRef = useRef<() => void>(() => {});
  const handleServerMsgRef = useRef<(msg: WsMsg) => void>(() => {});

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { questionEndedRef.current = questionEnded; }, [questionEnded]);

  // ── Connect ──
  // NOTE: connectWs must NOT call setState synchronously — the React Compiler
  // flags any setState reachable from a useEffect body. State resets for manual
  // retries are handled at the call site (onClick handler) instead.
  const connectWs = useCallback(() => {
    if (!pid || !code) return;

    const backendWsUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1")
      .replace("/api/v1", "")
      .replace("http://", "ws://")
      .replace("https://", "wss://");

    const url = `${backendWsUrl}/api/v1/live/${code}/ws?role=player&pid=${pid}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
      setRetryCount(0);
      setWsStatus("connected");
      setWsError("");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMsg;
        handleServerMsgRef.current(msg);
      } catch {}
    };

    ws.onerror = () => {
      // onerror always precedes onclose — just mark it; onclose handles retry.
      setWsError("error");
    };

    ws.onclose = () => {
      if (phaseRef.current === "finished") return; // game over — no reconnect
      const attempt = retryCountRef.current;
      if (attempt >= 3) {
        setWsStatus("disconnected");
        setWsError("disconnected");
        return;
      }
      retryCountRef.current += 1;
      setRetryCount(retryCountRef.current);
      setWsStatus("reconnecting");
      const delay = Math.pow(2, attempt) * 1000; // 1s → 2s → 4s
      // Use ref so the retry closure always calls the latest connectWs
      // without capturing a const before it is fully initialised.
      retryTimerRef.current = setTimeout(() => connectWsRef.current(), delay);
    };
  }, [pid, code]);

  // Keep connectWsRef in sync so the retry closure above is always current.
  useEffect(() => { connectWsRef.current = connectWs; }, [connectWs]);

  useEffect(() => {
    if (!pid || !code) return;
    connectWs();
    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [pid, code, connectWs]);

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

  const handleServerMsg = useCallback((msg: WsMsg) => {
    switch (msg.type) {
      case "session_state":
        setQuizTitle(msg.data.quizTitle);
        setTotalQ(msg.data.totalQuestions);
        if ((msg.data as { teamMode?: boolean }).teamMode) setTeamMode(true);
        if ((msg.data as { myTeamId?: number }).myTeamId != null && (msg.data as { myTeamId?: number }).myTeamId! >= 0) {
          setMyTeamId((msg.data as { myTeamId?: number }).myTeamId!);
        }
        if (msg.data.status === "lobby" || msg.data.status === "active") {
          setPhase("waiting");
        }
        break;

      case "game_started":
        setTotalQ(msg.data.totalQuestions);
        setPhase("waiting");
        break;

      case "question": {
        const q = msg.data.question;
        setCurrentQEvt(msg.data);
        setAnswerResult(null);
        setQuestionEnded(null);
        setSelectedOpt(null);
        setBlankInput("");
        setReorderDraft(q.reorderItems ?? []);
        setReorderSubmitted(false);
        // Init matching/categorization draft: one key per left item, value = "" (unselected).
        if ((q.questionType === "matching" || q.questionType === "categorization") && q.matchLeft) {
          const draft: Record<string, string> = {};
          for (const left of q.matchLeft) draft[left] = "";
          setMatchDraft(draft);
        } else {
          setMatchDraft({});
        }
        // Init comprehension draft: one key per sub-question, value = "" (unselected).
        if (q.questionType === "comprehension" && q.comprehensionSubQuestions) {
          const draft: Record<string, string> = {};
          for (const sq of q.comprehensionSubQuestions) draft[sq.id] = "";
          setCompDraft(draft);
        } else {
          setCompDraft({});
        }
        // Init labeling draft: one entry per zone keyed by stringified zone ID.
        if (q.questionType === "labeling" && q.hotspotZones) {
          const draft: Record<string, string> = {};
          for (const z of q.hotspotZones) draft[String(z.id)] = "";
          setLabelingDraft(draft);
        } else {
          setLabelingDraft({});
        }
        setPhase("question");
        startRef.current = Date.now();
        startTimer(msg.data.deadlineMs);
        break;
      }

      case "answer_accepted":
        setAnswerResult(msg.data);
        setScore(msg.data.totalScore);
        setStreak(msg.data.streak);
        setPhase("answered");
        break;

      case "question_ended":
        stopTimer();
        setPrevLbRanks(new Map(
          (questionEndedRef.current?.leaderboard ?? []).map((e) => [e.id, e.rank])
        ));
        setQuestionEnded(msg.data);
        if (msg.data.teamLeaderboard) setTeamLeaderboard(msg.data.teamLeaderboard);
        setPhase("revealed");
        break;

      case "game_ended":
        stopTimer();
        setPrevLbRanks(new Map(
          (questionEndedRef.current?.leaderboard ?? []).map((e) => [e.id, e.rank])
        ));
        setFinalLeaderboard(msg.data.finalLeaderboard);
        if (msg.data.teamLeaderboard) setTeamLeaderboard(msg.data.teamLeaderboard);
        setPhase("finished");
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the ref up to date so connectWs always calls the latest version.
  useEffect(() => { handleServerMsgRef.current = handleServerMsg; }, [handleServerMsg]);

  const submitAnswer = useCallback((
    option?: string,
    text?: string,
    orderAnswer?: string[],
    matchAnswer?: Record<string, string>,
  ) => {
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    wsRef.current?.send(JSON.stringify({
      type: "submit_answer",
      data: {
        option: option ?? "",
        textAnswer: text ?? "",
        orderAnswer: orderAnswer ?? [],
        matchAnswer: matchAnswer ?? {},
        timeSpent,
      },
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

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Disconnected full-screen overlay */}
      {wsStatus === "disconnected" && phase !== "finished" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-base)]/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center shadow-[var(--surface-shadow-strong)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-500/30 bg-rose-500/10">
              <WifiOff className="h-8 w-8 text-rose-400" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
              {t("quiz.live.disconnected")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t("quiz.live.disconnectedBody")}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                onClick={() => {
                  retryCountRef.current = 0;
                  setRetryCount(0);
                  setWsError("");
                  setWsStatus("reconnecting");
                  connectWs();
                }}
                className="w-full"
              >
                {t("quiz.live.retry")}
              </Button>
              <Link href="/quizzes/join" className="w-full">
                <Button type="button" variant="outline" className="w-full">
                  {t("quiz.live.leaveGame")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reconnecting banner */}
      {wsStatus === "reconnecting" && phase !== "finished" ? (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-lg)] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            {t("quiz.live.reconnecting")}{" "}
            <span className="font-medium">
              {t("quiz.live.reconnectAttempt").replace("{n}", String(retryCount))}
            </span>
          </span>
        </div>
      ) : null}

      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 20 }}>
        <div className="nd-mock-bar">
          <Link href="/quizzes/join" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← Back
          </Link>
          <h3 style={{ flex: 1 }}>{quizTitle}</h3>
          <div className="flex items-center gap-3 text-sm">
            {teamMode && myTeamId >= 0 && (
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: PLAYER_TEAM_COLORS[myTeamId] ?? "#888" }}
                title={`Team ${myTeamId + 1}`}
              >
                {myTeamId + 1}
              </span>
            )}
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
            {currentQEvt ? (
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
                {t("quiz.live.question")} {currentQEvt.index + 1}/{totalQ}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Phases */}
      {phase === "waiting" && (
        <WaitingScreen title={quizTitle} teamMode={teamMode} myTeamId={myTeamId} />
      )}

      {phase === "question" && currentQEvt && (
        <QuestionScreen
          evt={currentQEvt}
          timeLeft={timeLeft}
          selectedOpt={selectedOpt}
          blankInput={blankInput}
          reorderDraft={reorderDraft}
          reorderSubmitted={reorderSubmitted}
          matchDraft={matchDraft}
          compDraft={compDraft}
          labelingDraft={labelingDraft}
          onBlankChange={setBlankInput}
          onReorderChange={setReorderDraft}
          onMatchChange={setMatchDraft}
          onCompChange={setCompDraft}
          onLabelingChange={setLabelingDraft}
          onSelect={(opt) => {
            setSelectedOpt(opt);
            submitAnswer(opt);
          }}
          onBlankSubmit={() => submitAnswer(undefined, blankInput)}
          onReorderSubmit={() => {
            setReorderSubmitted(true);
            submitAnswer(undefined, undefined, reorderDraft);
          }}
          onMatchSubmit={() => {
            submitAnswer(undefined, undefined, undefined, matchDraft);
            setSelectedOpt("submitted");
          }}
          onCompSubmit={() => {
            // Comprehension reuses textAnswer with a JSON-encoded {sqID: answer} map,
            // matching the backend's liveComprehensionCorrect contract.
            submitAnswer(undefined, JSON.stringify(compDraft));
            setSelectedOpt("submitted");
          }}
          onLabelingSubmit={() => {
            // Labeling submits the same {zoneID: label} JSON shape as solo play —
            // backend's liveLabelingCorrect parses it identically.
            submitAnswer(undefined, JSON.stringify(labelingDraft));
            setSelectedOpt("submitted");
          }}
        />
      )}

      {phase === "answered" && answerResult && (
        <AnsweredScreen result={answerResult} t={t} />
      )}

      {phase === "revealed" && questionEnded && (
        <RevealedScreen
          ended={questionEnded}
          result={answerResult}
          pid={pid}
          t={t}
          prevRanks={prevLbRanks}
          currentQuestion={currentQEvt?.question ?? null}
          teamLeaderboard={teamMode ? teamLeaderboard : []}
          myTeamId={myTeamId}
        />
      )}

      {phase === "finished" && (
        <FinishedScreen
          leaderboard={finalLeaderboard}
          pid={pid}
          t={t}
          prevRanks={prevLbRanks}
          teamLeaderboard={teamMode ? teamLeaderboard : []}
          myTeamId={myTeamId}
        />
      )}
    </div>
  );
}

// ─── Sub-screens ──────────────────────────────────────────────

const PLAYER_TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const PLAYER_TEAM_BG = ["bg-red-500/10", "bg-blue-500/10", "bg-green-500/10", "bg-yellow-500/10"];

function WaitingScreen({ title, teamMode, myTeamId }: { title: string; teamMode: boolean; myTeamId: number }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-[var(--primary)]/10">
        <Star className="h-8 w-8 text-[var(--primary)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("quiz.live.waitingStart")}</h2>
      <p className="text-sm text-[var(--text-secondary)]">{t("quiz.live.hostStartsSoon")}</p>
      {teamMode && myTeamId >= 0 && (
        <div className={`mt-2 flex items-center gap-2 rounded-full px-4 py-2 ${PLAYER_TEAM_BG[myTeamId] ?? "bg-[var(--bg-surface)]"}`}>
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: PLAYER_TEAM_COLORS[myTeamId] ?? "#888" }}
          >
            {myTeamId + 1}
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {t(`quiz.live.team${["Red","Blue","Green","Yellow"][myTeamId] ?? "Red"}`)}
          </span>
        </div>
      )}
      {title ? <p className="text-xs text-[var(--text-muted)]">{title}</p> : null}
    </div>
  );
}

const OPTION_COLORS = [
  "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300",
  "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300",
  "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300",
  "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300",
];
const OPTION_KEYS = ["a", "b", "c", "d", "e"] as const;

function QuestionScreen({
  evt, timeLeft, selectedOpt, blankInput, reorderDraft, reorderSubmitted,
  matchDraft, compDraft, labelingDraft,
  onBlankChange, onReorderChange, onMatchChange, onCompChange, onLabelingChange,
  onSelect, onBlankSubmit, onReorderSubmit, onMatchSubmit, onCompSubmit, onLabelingSubmit,
}: {
  evt: QuestionEvt;
  timeLeft: number;
  selectedOpt: string | null;
  blankInput: string;
  reorderDraft: string[];
  reorderSubmitted: boolean;
  matchDraft: Record<string, string>;
  compDraft: Record<string, string>;
  labelingDraft: Record<string, string>;
  onBlankChange: (v: string) => void;
  onReorderChange: (items: string[]) => void;
  onMatchChange: (draft: Record<string, string>) => void;
  onCompChange: (draft: Record<string, string>) => void;
  onLabelingChange: (draft: Record<string, string>) => void;
  onSelect: (opt: string) => void;
  onBlankSubmit: () => void;
  onReorderSubmit: () => void;
  onMatchSubmit: () => void;
  onCompSubmit: () => void;
  onLabelingSubmit: () => void;
}) {
  const { t } = useLocale();
  const q = evt.question;
  const pct = q.timeLimit > 0 ? (timeLeft / q.timeLimit) * 100 : 0;
  const [multiSelected, setMultiSelected] = useState<Set<string>>(() => new Set());

  const optValues: Record<string, string | undefined> = {
    a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD, e: q.optionE,
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q.imageUrl && q.questionType !== "hotspot" && q.questionType !== "labeling" ? (
        <img
          src={q.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full rounded-[1.2rem] object-cover"
          style={{ maxHeight: 200 }}
        />
      ) : null}
      {q.audioUrl ? (
        <audio
          controls
          preload="metadata"
          src={q.audioUrl}
          className="w-full"
        />
      ) : null}
      {q.videoUrl ? (
        <video
          controls
          preload="metadata"
          src={q.videoUrl}
          className="w-full rounded-[1.2rem]"
          style={{ maxHeight: 320 }}
        />
      ) : null}
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <p className="text-lg font-semibold leading-snug text-[var(--text-primary)]">{q.questionText}</p>
      </div>

      {/* Answer inputs. audio/video render the same MCQ grid as plain MCQ — the
          media player above provides the question context. */}
      {(q.questionType === "mcq" || q.questionType === "audio" || q.questionType === "video") && (
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

      {q.questionType === "mcq_multi" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            {t("quiz.play.selectMultiple")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {OPTION_KEYS.map((opt, i) => {
              const val = optValues[opt];
              if (!val) return null;
              const chosen = multiSelected.has(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={!!selectedOpt}
                  onClick={() => {
                    if (selectedOpt) return;
                    setMultiSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(opt)) {
                        next.delete(opt);
                      } else {
                        next.add(opt);
                      }
                      return next;
                    });
                  }}
                  className={`flex items-center gap-2 rounded-[1.2rem] border-2 p-4 text-left text-sm font-medium transition-all ${
                    chosen
                      ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                      : OPTION_COLORS[i]
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-current text-xs font-bold">
                    {opt.toUpperCase()}
                  </span>
                  {val}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            disabled={!!selectedOpt || multiSelected.size === 0}
            onClick={() => {
              const sorted = ["a", "b", "c", "d"].filter((k) => multiSelected.has(k));
              onSelect(sorted.join(","));
            }}
            className="w-full"
          >
            {selectedOpt ? (t("quiz.live.submitted") || "Submitted") : (t("quiz.play.submitSelection") || "Confirm")}
          </Button>
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

      {q.questionType === "reorder" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{t("quiz.play.reorderHint") || "Arrange in the correct order"}</p>
          <div className="space-y-2">
            {reorderDraft.map((item, idx) => (
              <div
                key={`${idx}-${item}`}
                className="flex items-center gap-2 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)]">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{item}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (reorderSubmitted || idx === 0) return;
                    const next = [...reorderDraft];
                    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                    onReorderChange(next);
                  }}
                  disabled={reorderSubmitted || idx === 0}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (reorderSubmitted || idx === reorderDraft.length - 1) return;
                    const next = [...reorderDraft];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    onReorderChange(next);
                  }}
                  disabled={reorderSubmitted || idx === reorderDraft.length - 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={onReorderSubmit}
            disabled={reorderSubmitted || reorderDraft.length === 0}
            className="w-full"
          >
            {reorderSubmitted ? (t("quiz.live.submitted") || "Submitted") : (t("quiz.play.submitAnswer") || "Submit")}
          </Button>
        </div>
      )}

      {q.questionType === "matching" && q.matchLeft && q.matchRight && (
        <LiveMatchingInput
          t={t}
          leftItems={q.matchLeft}
          rightItems={q.matchRight}
          draft={matchDraft}
          submitted={!!selectedOpt}
          onDraftChange={onMatchChange}
          onSubmit={onMatchSubmit}
        />
      )}

      {q.questionType === "hotspot" && q.imageUrl && q.hotspotZones && (
        <LiveHotspotInput
          t={t}
          imageUrl={q.imageUrl}
          zones={q.hotspotZones}
          selected={selectedOpt}
          onSelect={onSelect}
        />
      )}

      {q.questionType === "poll" && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "a", text: q.optionA },
            { key: "b", text: q.optionB },
            { key: "c", text: q.optionC },
            { key: "d", text: q.optionD },
            { key: "e", text: q.optionE },
          ].filter((o) => o.text).map((opt, i) => (
            <button
              key={opt.key}
              type="button"
              disabled={!!selectedOpt}
              onClick={() => !selectedOpt && onSelect(opt.key)}
              className={`flex min-h-[64px] items-center gap-3 rounded-[var(--radius-lg)] border p-4 text-left text-sm font-medium transition-colors ${
                selectedOpt === opt.key
                  ? "border-indigo-400/50 bg-indigo-500/20 text-white"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--primary)]"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold uppercase">
                {["A","B","C","D","E"][i]}
              </span>
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {q.questionType === "dropdown" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            {t("quiz.dropdown.selectLabel")}
          </p>
          <select
            value={selectedOpt ?? ""}
            disabled={!!selectedOpt}
            onChange={(e) => e.target.value && onSelect(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
          >
            <option value="">{t("quiz.dropdown.selectPlaceholder")}</option>
            {[
              { key: "a", text: q.optionA },
              { key: "b", text: q.optionB },
              { key: "c", text: q.optionC },
              { key: "d", text: q.optionD },
              { key: "e", text: q.optionE },
            ].filter((o) => o.text).map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.text}</option>
            ))}
          </select>
        </div>
      )}

      {q.questionType === "categorization" && q.matchLeft && q.matchRight && (
        <LiveMatchingInput
          t={t}
          leftItems={q.matchLeft}
          rightItems={q.matchRight}
          draft={matchDraft}
          submitted={!!selectedOpt}
          onDraftChange={onMatchChange}
          onSubmit={onMatchSubmit}
        />
      )}

      {q.questionType === "comprehension" && q.comprehensionSubQuestions && (
        <LiveComprehensionInput
          t={t}
          passage={q.comprehensionPassage ?? ""}
          subQuestions={q.comprehensionSubQuestions}
          draft={compDraft}
          submitted={!!selectedOpt}
          onDraftChange={onCompChange}
          onSubmit={onCompSubmit}
        />
      )}

      {q.questionType === "labeling" && q.imageUrl && q.hotspotZones && (
        <LiveLabelingInput
          t={t}
          imageUrl={q.imageUrl}
          zones={q.hotspotZones}
          draft={labelingDraft}
          submitted={!!selectedOpt}
          onDraftChange={onLabelingChange}
          onSubmit={onLabelingSubmit}
        />
      )}
    </div>
  );
}

function LiveLabelingInput({
  t,
  imageUrl,
  zones,
  draft,
  submitted,
  onDraftChange,
  onSubmit,
}: {
  t: (k: string) => string;
  imageUrl: string;
  zones: HotspotZone[];
  draft: Record<string, string>;
  submitted: boolean;
  onDraftChange: (d: Record<string, string>) => void;
  onSubmit: () => void;
}) {
  // Submit is gated on every zone having a non-empty trimmed answer; the
  // backend grades all-or-nothing so a partial submission is always wrong.
  const allFilled = zones.every((z) => (draft[String(z.id)] ?? "").trim() !== "");

  return (
    <div className="space-y-4">
      <div className="relative select-none overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="pointer-events-none w-full" draggable={false} />
        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            className="pointer-events-none absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[var(--primary)] text-xs font-bold text-white shadow"
          >
            {zone.id}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {zones.map((zone) => (
          <div key={zone.id} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
              {zone.id}
            </span>
            <input
              type="text"
              value={draft[String(zone.id)] ?? ""}
              disabled={submitted}
              onChange={(e) => onDraftChange({ ...draft, [String(zone.id)]: e.target.value })}
              placeholder={t("quiz.labeling.typeLabel") || "Type label…"}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
            />
          </div>
        ))}
      </div>

      <Button type="button" onClick={onSubmit} disabled={submitted || !allFilled} className="w-full">
        {submitted
          ? (t("quiz.live.submitted") || "Submitted")
          : (t("quiz.matching.submitAll") || "Submit all")}
      </Button>
    </div>
  );
}

function LiveComprehensionInput({
  t,
  passage,
  subQuestions,
  draft,
  submitted,
  onDraftChange,
  onSubmit,
}: {
  t: (k: string) => string;
  passage: string;
  subQuestions: LiveCompSubQ[];
  draft: Record<string, string>;
  submitted: boolean;
  onDraftChange: (draft: Record<string, string>) => void;
  onSubmit: () => void;
}) {
  // All sub-questions must have a non-empty answer before submit. Whitespace
  // is treated as empty so a stray Tab on a fill_blank doesn't enable submit.
  const allAnswered = subQuestions.every((sq) => (draft[sq.id] ?? "").trim() !== "");

  return (
    <div className="space-y-4">
      {passage && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] whitespace-pre-wrap">
          {passage}
        </div>
      )}
      <div className="space-y-3">
        {subQuestions.map((sq, idx) => (
          <div key={sq.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
              {idx + 1}. {sq.prompt}
            </div>
            {sq.type === "true_false" ? (
              <div className="flex gap-2">
                {(["true", "false"] as const).map((v) => {
                  const active = draft[sq.id] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={submitted}
                      onClick={() => onDraftChange({ ...draft, [sq.id]: v })}
                      className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                      } disabled:opacity-60`}
                    >
                      {v === "true" ? t("quiz.true") || "True" : t("quiz.false") || "False"}
                    </button>
                  );
                })}
              </div>
            ) : sq.type === "fill_blank" ? (
              <input
                type="text"
                value={draft[sq.id] ?? ""}
                disabled={submitted}
                onChange={(e) => onDraftChange({ ...draft, [sq.id]: e.target.value })}
                placeholder={t("quiz.fillBlank.placeholder") || "Type your answer…"}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(["a", "b", "c", "d"] as const).map((letter) => {
                  const value = letter === "a" ? sq.optionA
                    : letter === "b" ? sq.optionB
                    : letter === "c" ? sq.optionC
                    : sq.optionD;
                  if (!value) return null;
                  const active = draft[sq.id] === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={submitted}
                      onClick={() => onDraftChange({ ...draft, [sq.id]: letter })}
                      className={`rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                      } disabled:opacity-60`}
                    >
                      <span className="mr-2 font-bold uppercase">{letter}.</span>
                      {value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <Button type="button" onClick={onSubmit} disabled={submitted || !allAnswered} className="w-full">
        {submitted
          ? (t("quiz.live.submitted") || "Submitted")
          : (t("quiz.matching.submitAll") || "Submit all")}
      </Button>
    </div>
  );
}

function LiveMatchingInput({
  t,
  leftItems,
  rightItems,
  draft,
  submitted,
  onDraftChange,
  onSubmit,
}: {
  t: (k: string) => string;
  leftItems: string[];
  rightItems: string[];
  draft: Record<string, string>;
  submitted: boolean;
  onDraftChange: (draft: Record<string, string>) => void;
  onSubmit: () => void;
}) {
  const allSelected = leftItems.every((l) => draft[l] && draft[l] !== "");
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-muted)]">
        {t("quiz.matching.pairHint") || "Match each item on the left with one on the right"}
      </p>
      <div className="space-y-2">
        {leftItems.map((left) => (
          <div key={left} className="flex items-center gap-2">
            <span className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
              {left}
            </span>
            <span className="shrink-0 text-[var(--text-muted)]">→</span>
            <select
              value={draft[left] ?? ""}
              disabled={submitted}
              onChange={(e) => onDraftChange({ ...draft, [left]: e.target.value })}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
            >
              <option value="">{t("quiz.matching.selectMatch") || "Select…"}</option>
              {rightItems.map((right) => (
                <option key={right} value={right}>{right}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={submitted || !allSelected}
        className="w-full"
      >
        {submitted
          ? (t("quiz.live.submitted") || "Submitted")
          : (t("quiz.matching.submitAll") || "Submit all")}
      </Button>
    </div>
  );
}

function LiveHotspotInput({
  t,
  imageUrl,
  zones,
  selected,
  onSelect,
}: {
  t: (k: string) => string;
  imageUrl: string;
  zones: HotspotZone[];
  selected: string | null;
  onSelect: (opt: string) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selected) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    let hitZone: HotspotZone | null = null;
    let minDist = Infinity;
    for (const z of zones) {
      const dx = x - z.x;
      const dy = y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= z.r && dist < minDist) {
        minDist = dist;
        hitZone = z;
      }
    }
    if (hitZone) {
      onSelect(String(hitZone.id));
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--text-muted)]">
        {t("quiz.hotspot.clickToAnswer") || "Click a zone to answer"}
      </p>
      <div
        className={`relative select-none overflow-hidden rounded-[1.2rem] border border-[var(--border)] ${
          selected ? "cursor-default" : "cursor-crosshair"
        }`}
        onClick={handleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" loading="lazy" decoding="async" className="pointer-events-none w-full" />
        {zones.map((zone) => {
          const zoneIdStr = String(zone.id);
          const isChosen = selected === zoneIdStr;
          return (
            <div
              key={zone.id}
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-transform ${
                isChosen
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white scale-110"
                  : "border-white/70 bg-[var(--primary)]/70 text-white"
              }`}
            >
              {zone.label || zoneIdStr}
            </div>
          );
        })}
      </div>
      {selected ? (
        <p className="text-center text-xs text-[var(--text-muted)]">
          {t("quiz.live.submitted") || "Submitted"} — {t("quiz.live.waitingReveal") || "Waiting for reveal…"}
        </p>
      ) : null}
    </div>
  );
}

const CORRECT_REACTIONS: Array<{ emoji: string; line: string }> = [
  { emoji: "🎉", line: "Nailed it!" },
  { emoji: "🔥", line: "On fire!" },
  { emoji: "💯", line: "Perfect!" },
  { emoji: "⚡", line: "Lightning fast!" },
  { emoji: "🎯", line: "Bullseye!" },
  { emoji: "🏆", line: "Champion move!" },
  { emoji: "✨", line: "Brilliant!" },
  { emoji: "🚀", line: "To the moon!" },
];
const WRONG_REACTIONS: Array<{ emoji: string; line: string }> = [
  { emoji: "😬", line: "Yikes…" },
  { emoji: "💀", line: "Rip." },
  { emoji: "🫠", line: "Melting…" },
  { emoji: "😭", line: "So close!" },
  { emoji: "😤", line: "Next time!" },
  { emoji: "🙈", line: "Didn't see that." },
  { emoji: "💔", line: "Oof." },
  { emoji: "🤦", line: "Bruh." },
];

function AnsweredScreen({ result, t }: { result: AnswerResult; t: (k: string) => string }) {
  const [reaction] = useState(() => {
    const pool = result.isCorrect ? CORRECT_REACTIONS : WRONG_REACTIONS;
    return pool[Math.floor(Math.random() * pool.length)];
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
    >
      <span
        className="animate-reaction-pop select-none text-[5.5rem] leading-none"
        aria-hidden="true"
      >
        {reaction.emoji}
      </span>
      <div>
        <h2 className={`text-2xl font-bold ${result.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
          {result.isCorrect ? t("quiz.live.correct") : t("quiz.live.wrong")}
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{reaction.line}</p>
      </div>
      {result.isCorrect ? (
        <p className="text-lg font-semibold text-amber-400">+{result.pointsEarned} {t("quiz.live.points")}</p>
      ) : null}
      {result.streak > 1 ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-orange-400">
          <Flame className="h-4 w-4 fill-orange-400" aria-hidden="true" />
          {result.streak}x streak
        </p>
      ) : null}
      <p className="text-sm text-[var(--text-muted)]">Waiting for next question…</p>
    </div>
  );
}

function PlayerTeamLeaderboard({ teams, myTeamId }: { teams: TeamScore[]; myTeamId: number }) {
  if (teams.length === 0) return null;
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Team scores
      </p>
      <ul className="space-y-1.5">
        {sorted.map((team, i) => {
          const isMyTeam = team.teamId === myTeamId;
          return (
            <li
              key={team.teamId}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm ${isMyTeam ? "bg-[var(--primary)]/8" : ""}`}
            >
              <span className="w-4 shrink-0 text-center text-xs font-bold text-[var(--text-muted)]">{i + 1}</span>
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: PLAYER_TEAM_COLORS[team.teamId] ?? "#888" }}
              >
                {team.teamId + 1}
              </span>
              <span className={`flex-1 font-medium ${isMyTeam ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                Team {team.teamId + 1}
              </span>
              <span className="font-semibold text-[var(--primary)] tabular-nums">{team.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RevealedScreen({
  ended,
  result,
  pid,
  t,
  prevRanks,
  currentQuestion,
  teamLeaderboard,
  myTeamId,
}: {
  ended: QuestionEndedEvt;
  result: AnswerResult | null;
  pid: string;
  t: (k: string) => string;
  prevRanks: Map<string, number>;
  currentQuestion: LiveQuestion | null;
  teamLeaderboard: TeamScore[];
  myTeamId: number;
}) {
  const isHotspot = currentQuestion?.questionType === "hotspot";
  // For hotspot, find zone label from current question
  const hotspotCorrectLabel = isHotspot && ended.correctOption
    ? (currentQuestion?.hotspotZones?.find(
        (z) => String(z.id) === ended.correctOption
      )?.label ?? ended.correctOption)
    : null;

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
            {isHotspot && hotspotCorrectLabel ? (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Answer: <span className="font-semibold">{hotspotCorrectLabel}</span>
              </p>
            ) : ended.correctOption ? (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Answer: {ended.correctOption.toUpperCase()}
              </p>
            ) : null}
            {ended.blankAnswer ? (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Answer: <span className="font-semibold">{ended.blankAnswer}</span>
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
          {isHotspot && hotspotCorrectLabel ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Answer: <span className="font-semibold">{hotspotCorrectLabel}</span></p>
          ) : ended.correctOption ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Answer: {ended.correctOption.toUpperCase()}</p>
          ) : null}
          {ended.blankAnswer ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Answer: <span className="font-semibold">{ended.blankAnswer}</span></p>
          ) : null}
        </div>
      )}

      {teamLeaderboard.length > 0 && <PlayerTeamLeaderboard teams={teamLeaderboard} myTeamId={myTeamId} />}

      {/* Mini leaderboard top-5 with rank change badges */}
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t("quiz.live.leaderboard")}
        </p>
        <ul className="space-y-1.5">
          {ended.leaderboard.slice(0, 5).map((e, i) => {
            const prevRank = prevRanks.get(e.id);
            const delta = prevRank != null ? prevRank - e.rank : null;
            const isMe = e.id === pid;
            return (
              <li
                key={e.id}
                className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm ${isMe ? "bg-[var(--primary)]/8" : ""}`}
                style={{ animation: `leader-enter 0.38s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms both` }}
              >
                <span className="w-5 shrink-0 text-center text-xs font-bold text-[var(--text-muted)]">{e.rank}</span>
                <span className={`flex-1 font-medium ${isMe ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                  {e.displayName}
                </span>
                {delta !== null && delta !== 0 ? (
                  <span
                    className={`animate-rank-badge-pop text-xs font-bold tabular-nums ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`}
                    style={{ animationDelay: `${i * 55 + 160}ms` }}
                  >
                    {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                  </span>
                ) : null}
                <span className="font-semibold text-[var(--primary)] tabular-nums">{e.score}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {ended.correctOrder && ended.correctOrder.length > 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Correct order
          </p>
          <ol className="space-y-1.5">
            {ended.correctOrder.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                  {i + 1}
                </span>
                <span className="text-[var(--text-primary)]">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {ended.matchPairs && ended.matchPairs.length > 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t("quiz.matching.correctPairs") || "Correct pairs"}
          </p>
          <ul className="space-y-1.5">
            {ended.matchPairs.map((pair) => (
              <li key={pair.left} className="flex items-center gap-2 text-sm">
                <span className="flex-1 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-primary)]">
                  {pair.left}
                </span>
                <span className="shrink-0 text-[var(--text-muted)]">→</span>
                <span className="flex-1 rounded-[var(--radius-sm)] bg-emerald-500/10 px-2 py-1 text-emerald-400">
                  {pair.right}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-center text-sm text-[var(--text-muted)]">Waiting for next question…</p>
    </div>
  );
}

function FinishedScreen({
  leaderboard,
  pid,
  t,
  prevRanks,
  teamLeaderboard,
  myTeamId,
}: {
  leaderboard: LeaderEntry[];
  pid: string;
  t: (k: string) => string;
  prevRanks: Map<string, number>;
  teamLeaderboard: TeamScore[];
  myTeamId: number;
}) {
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

      {teamLeaderboard.length > 0 && <PlayerTeamLeaderboard teams={teamLeaderboard} myTeamId={myTeamId} />}

      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)]">
        <ul className="divide-y divide-[var(--border)]">
          {leaderboard.map((e, i) => {
            const prevRank = prevRanks.get(e.id);
            const delta = prevRank != null ? prevRank - e.rank : null;
            const isMe = e.id === pid;
            return (
              <li
                key={e.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${isMe ? "bg-[var(--primary)]/6" : ""}`}
                style={{ animation: `leader-enter 0.38s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms both` }}
              >
                <span className="w-7 shrink-0 text-center text-sm font-bold text-[var(--text-muted)]">
                  {i < 3 ? medals[i] : e.rank}
                </span>
                <span className={`flex-1 text-sm font-medium ${isMe ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                  {e.displayName}
                </span>
                {delta !== null && delta !== 0 ? (
                  <span
                    className={`animate-rank-badge-pop text-xs font-bold tabular-nums ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`}
                    style={{ animationDelay: `${i * 55 + 160}ms` }}
                  >
                    {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                  </span>
                ) : null}
                <span className={`font-semibold tabular-nums ${isMe ? "text-[var(--primary)]" : "text-[var(--primary)]"}`}>
                  {e.score}
                </span>
              </li>
            );
          })}
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
