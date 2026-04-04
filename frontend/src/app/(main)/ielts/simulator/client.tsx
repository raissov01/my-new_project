"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Loader2,
  Mic,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { IELTSMockExam, IELTSMockSection, IELTSQuestion } from "@/features/ielts/api";
import { fetchIELTSMockExam, fetchIELTSQuestions } from "@/features/ielts/api";
import { SpeakingRecorderPanel } from "@/features/ielts/components/speaking-recorder-panel";
import { evaluateSpeaking, type SpeakingResult } from "../speaking/actions";
import { evaluateWriting, type WritingResult } from "../writing/actions";

type MockType = "predictions" | "cambridge_style";
type Section = "full" | "reading" | "listening" | "writing" | "speaking";
type BandTarget = "5.0" | "5.5" | "6.0" | "6.5" | "7.0" | "7.5" | "8.0";
type Stage = "configure" | "loading" | "exam" | "results";

type QuestionGroup = {
  key: string;
  title: string;
  prompt: string;
  content?: string;
  audioScript?: string;
  topic?: string;
  questions: IELTSQuestion[];
};

export function SimulatorClient() {
  const { t } = useLocale();
  const [stage, setStage] = useState<Stage>("configure");
  const [mockType, setMockType] = useState<MockType>("predictions");
  const [section, setSection] = useState<Section>("full");
  const [bandTarget, setBandTarget] = useState<BandTarget>("6.5");
  const [cambridgeExamSet, setCambridgeExamSet] = useState("auto");
  const [predictionExamSet, setPredictionExamSet] = useState("auto");
  const [cambridgeExamSets, setCambridgeExamSets] = useState<string[]>([]);
  const [predictionExamSets, setPredictionExamSets] = useState<string[]>([]);
  const [mock, setMock] = useState<IELTSMockExam | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({});
  const [writingResponses, setWritingResponses] = useState<Record<string, string>>({});
  const [writingResults, setWritingResults] = useState<Record<string, WritingResult>>({});
  const [speakingResponses, setSpeakingResponses] = useState<Record<string, string>>({});
  const [speakingResults, setSpeakingResults] = useState<Record<string, SpeakingResult>>({});
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState<string | null>(null);
  const [showListeningTranscript, setShowListeningTranscript] = useState<Record<string, boolean>>({});
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [playingGroupKey, setPlayingGroupKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSpeechEnabled(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingGroupKey(null);
  }, []);

  useEffect(
    () => () => {
      stopTimer();
      stopSpeaking();
    },
    [stopSpeaking, stopTimer]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadExamSets() {
      try {
        const response = await fetchIELTSQuestions({
          section: "writing",
          limit: 400,
        });

        if (cancelled) {
          return;
        }

        const allExamSets = response.items ?? [];
        const cambridgeSets = Array.from(
          new Set(
            allExamSets
              .map((item) => item.examSet)
              .filter((item) => item && item.startsWith("cambridge-"))
          )
        ).sort();
        const predictionsSets = Array.from(
          new Set(
            allExamSets
              .map((item) => item.examSet)
              .filter((item) => item && item.startsWith("predictions-"))
          )
        ).sort();

        setCambridgeExamSets(cambridgeSets);
        setPredictionExamSets(predictionsSets);
      } catch {
        if (!cancelled) {
          setCambridgeExamSets([]);
          setPredictionExamSets([]);
        }
      }
    }

    void loadExamSets();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentSection = mock?.sections[activeSectionIndex] ?? null;
  const groupedQuestions = useMemo(
    () => (currentSection ? buildQuestionGroups(currentSection.questions) : []),
    [currentSection]
  );
  const isCurrentSectionRevealed = currentSection
    ? Boolean(revealedSections[currentSection.key])
    : false;

  const mockTypes: { key: MockType; title: string; body: string }[] = [
    {
      key: "predictions",
      title: t("ielts.sim.predictions"),
      body: "Question-bank prediction sets built around recent IELTS-style themes. AI is used only to score your writing and speaking answers.",
    },
    {
      key: "cambridge_style",
      title: t("ielts.sim.cambridge"),
      body: "Structured book-style sets covering Cambridge 10 to 20 with a stable full-test flow.",
    },
  ];

  const sections: { key: Section; title: string; icon: typeof BookOpen; time: string }[] = [
    { key: "full", title: t("ielts.sim.fullTest"), icon: ClipboardCheck, time: "2h 45min" },
    { key: "listening", title: t("ielts.simListening"), icon: Headphones, time: "30 min" },
    { key: "reading", title: t("ielts.simReading"), icon: BookOpen, time: "60 min" },
    { key: "writing", title: t("ielts.simWriting"), icon: PenLine, time: "60 min" },
    { key: "speaking", title: t("ielts.simSpeaking"), icon: Mic, time: "11-14 min" },
  ];

  const bands: BandTarget[] = ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0"];

  const startSectionTimer = useCallback(
    (durationMinutes: number) => {
      stopTimer();
      if (durationMinutes <= 0) {
        setTimeLeft(0);
        return;
      }

      setTimeLeft(durationMinutes * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer]
  );

  useEffect(() => {
    if (stage !== "exam" || !currentSection) {
      return;
    }
    startSectionTimer(currentSection.durationMinutes);
  }, [activeSectionIndex, currentSection, stage, startSectionTimer]);

  async function handleStartMock() {
    setStage("loading");
    setError(null);
    stopSpeaking();
    stopTimer();

    try {
      const response = await fetchIELTSMockExam({
        mockType,
        section,
        band: bandTarget,
        examSet: (() => {
          if (mockType === "cambridge_style") {
            return cambridgeExamSet !== "auto" ? cambridgeExamSet : undefined;
          }
          return predictionExamSet !== "auto" ? predictionExamSet : undefined;
        })(),
      });

      setMock(response);
      setActiveSectionIndex(0);
      setObjectiveAnswers({});
      setRevealedSections({});
      setWritingResponses({});
      setWritingResults({});
      setSpeakingResponses({});
      setSpeakingResults({});
      setShowListeningTranscript({});
      setStage("exam");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load mock exam."
      );
      setStage("configure");
    }
  }

  function handleSectionTab(index: number) {
    if (!mock) return;
    stopSpeaking();
    setActiveSectionIndex(index);
  }

  function handleCompleteSection() {
    if (!mock || !currentSection) {
      return;
    }

    stopSpeaking();
    stopTimer();

    if (currentSection.key === "reading" || currentSection.key === "listening") {
      setRevealedSections((prev) => ({ ...prev, [currentSection.key]: true }));
    }

    if (activeSectionIndex < mock.sections.length - 1) {
      setActiveSectionIndex((prev) => prev + 1);
      return;
    }

    setStage("results");
  }

  async function handleEvaluateWriting(question: IELTSQuestion) {
    const essay = (writingResponses[question.id] ?? "").trim();
    if (!essay) {
      setError("Write an answer before requesting AI examiner feedback.");
      return;
    }

    setError(null);
    setEvaluatingQuestionId(question.id);

    const { result, error: evaluationError } = await evaluateWriting(
      question.questionType,
      question.prompt,
      essay
    );

    setEvaluatingQuestionId(null);

    if (evaluationError) {
      setError(evaluationError);
      return;
    }

    if (result) {
      setWritingResults((prev) => ({ ...prev, [question.id]: result }));
    }
  }

  async function handleEvaluateSpeaking(question: IELTSQuestion) {
    const transcript = (speakingResponses[question.id] ?? "").trim();
    if (!transcript) {
      setError("Write or paste your spoken answer first.");
      return;
    }

    setError(null);
    setEvaluatingQuestionId(question.id);

    const { result, error: evaluationError } = await evaluateSpeaking(
      question.questionType,
      question.prompt,
      transcript
    );

    setEvaluatingQuestionId(null);

    if (evaluationError) {
      setError(evaluationError);
      return;
    }

    if (result) {
      setSpeakingResults((prev) => ({ ...prev, [question.id]: result }));
    }
  }

  function handleObjectiveAnswer(questionId: string, value: string) {
    setObjectiveAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handlePlayListening(group: QuestionGroup) {
    if (!speechEnabled || !group.audioScript) {
      return;
    }

    if (playingGroupKey === group.key) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(group.audioScript);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setPlayingGroupKey(null);
    utterance.onerror = () => setPlayingGroupKey(null);

    window.speechSynthesis.speak(utterance);
    setPlayingGroupKey(group.key);
  }

  const resultSummary = useMemo(() => {
    if (!mock) {
      return null;
    }

    const reading = mock.sections.find((item) => item.key === "reading");
    const listening = mock.sections.find((item) => item.key === "listening");
    const writing = mock.sections.find((item) => item.key === "writing");
    const speaking = mock.sections.find((item) => item.key === "speaking");

    return {
      reading: reading ? computeObjectiveStats(reading.questions, objectiveAnswers) : null,
      listening: listening
        ? computeObjectiveStats(listening.questions, objectiveAnswers)
        : null,
      writingAverage: averageBand(
        writing?.questions.map((question) => writingResults[question.id]?.overallBand)
      ),
      speakingAverage: averageBand(
        speaking?.questions.map((question) => speakingResults[question.id]?.overallBand)
      ),
      pendingWriting:
        writing?.questions.filter((question) => !writingResults[question.id]).length ?? 0,
      pendingSpeaking:
        speaking?.questions.filter((question) => !speakingResults[question.id]).length ?? 0,
    };
  }, [mock, objectiveAnswers, speakingResults, writingResults]);

  if (stage === "configure") {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("ielts.sim.chooseMockType")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Build a realistic IELTS run by choosing the test source, section, and target band before you begin.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {mockTypes.map((item) => (
              <SelectionCard
                key={item.key}
                active={mockType === item.key}
                onClick={() => setMockType(item.key)}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("ielts.sim.chooseSection")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    section === item.key
                      ? "border-indigo-500/30 bg-indigo-500/5"
                      : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-indigo-500/20"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      section === item.key
                        ? "bg-indigo-500/15 text-indigo-400"
                        : "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{item.time}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("ielts.sim.targetBand")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Pick the band profile you want the prompts and feedback to aim at.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {bands.map((band) => (
                <button
                  key={band}
                  onClick={() => setBandTarget(band)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    bandTarget === band
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-500/30"
                  }`}
                >
                  Band {band}
                </button>
              ))}
            </div>
          </div>

          {mockType === "cambridge_style" ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Cambridge exam set
              </label>
              <select
                value={cambridgeExamSet}
                onChange={(event) => setCambridgeExamSet(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="auto">Auto-pick best matched set</option>
                {cambridgeExamSets.map((item) => (
                  <option key={item} value={item}>
                    {formatExamSetLabel(item)}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Cambridge mode now pulls from a fixed book-style question bank instead of generated prompts.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Predictions exam set
              </label>
              <select
                value={predictionExamSet}
                onChange={(event) => setPredictionExamSet(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="auto">Auto-pick latest prediction set</option>
                {predictionExamSets.map((item) => (
                  <option key={item} value={item}>
                    {formatExamSetLabel(item)}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Predictions mode uses stored exam sets that follow current IELTS themes. AI is used only after you answer writing or speaking tasks.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {t("ielts.sim.readyTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {mockTypes.find((item) => item.key === mockType)?.title} ·{" "}
                {sections.find((item) => item.key === section)?.title} · Band {bandTarget}
              </p>
            </div>
            <Button size="lg" onClick={handleStartMock}>
              <Target className="h-4 w-4" />
              {t("ielts.sim.startExam")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/25">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
          Preparing your mock exam
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Loading reading, listening, writing, and speaking sections from the IELTS question bank.
        </p>
      </div>
    );
  }

  if (stage === "results" && mock && resultSummary) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400">
              {mock.mockType === "cambridge_style" ? "Cambridge mock" : "Predictions mock"}
            </span>
            {mock.examSet ? (
              <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                {formatExamSetLabel(mock.examSet)}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
            Mock exam summary
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            You have completed the selected IELTS flow. Objective sections are checked instantly, while writing and speaking depend on the AI examiner evaluations you ran during the mock.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {resultSummary.reading ? (
            <ScoreCard
              title="Reading"
              value={`${resultSummary.reading.correct}/${resultSummary.reading.total}`}
              subtitle={`${resultSummary.reading.percent}% correct`}
              tone="text-blue-400"
            />
          ) : null}
          {resultSummary.listening ? (
            <ScoreCard
              title="Listening"
              value={`${resultSummary.listening.correct}/${resultSummary.listening.total}`}
              subtitle={`${resultSummary.listening.percent}% correct`}
              tone="text-cyan-400"
            />
          ) : null}
          <ScoreCard
            title="Writing"
            value={
              resultSummary.writingAverage !== null
                ? `Band ${resultSummary.writingAverage.toFixed(1)}`
                : "Pending"
            }
            subtitle={
              resultSummary.pendingWriting > 0
                ? `${resultSummary.pendingWriting} task(s) still need AI evaluation`
                : "All writing tasks evaluated"
            }
            tone="text-emerald-400"
          />
          <ScoreCard
            title="Speaking"
            value={
              resultSummary.speakingAverage !== null
                ? `Band ${resultSummary.speakingAverage.toFixed(1)}`
                : "Pending"
            }
            subtitle={
              resultSummary.pendingSpeaking > 0
                ? `${resultSummary.pendingSpeaking} task(s) still need AI evaluation`
                : "All speaking tasks evaluated"
            }
            tone="text-violet-400"
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            What this mock already simulates
          </h3>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
            <li>Structured Cambridge-style sets or prediction-based runs.</li>
            <li>Reading passages with multiple IELTS question types.</li>
            <li>Listening scripts with browser audio playback and answer checking.</li>
            <li>Writing and speaking tasks scored with AI feedback on your answers only.</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setStage("configure")}>
            <RotateCcw className="h-4 w-4" />
            Configure another mock
          </Button>
          <Link href="/ielts/writing">
            <Button variant="secondary">
              <PenLine className="h-4 w-4" />
              Deep writing practice
            </Button>
          </Link>
          <Link href="/ielts/speaking">
            <Button variant="secondary">
              <Mic className="h-4 w-4" />
              Deep speaking practice
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!mock || !currentSection) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400">
            {mock.mockType === "cambridge_style" ? "Cambridge mock" : "Predictions mock"}
          </span>
          {mock.examSet ? (
            <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {formatExamSetLabel(mock.examSet)}
            </span>
          ) : null}
          <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            Band {mock.bandTarget || bandTarget}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {currentSection.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {currentSection.instructions}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Section timer
            </p>
            <p className={`mt-1 text-2xl font-semibold ${timeLeft < 60 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {mock.sections.map((item, index) => (
            <button
              key={item.key}
              onClick={() => handleSectionTab(index)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                activeSectionIndex === index
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-500/20"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {(currentSection.key === "reading" || currentSection.key === "listening") && (
        <div className="space-y-5">
          {groupedQuestions.map((group) => (
            <section
              key={group.key}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {group.title}
                  </h3>
                  {group.topic ? (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Topic: {group.topic}
                    </p>
                  ) : null}
                </div>

                {currentSection.key === "listening" && group.audioScript ? (
                  <div className="flex flex-wrap gap-2">
                    {speechEnabled ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePlayListening(group)}
                      >
                        {playingGroupKey === group.key ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {playingGroupKey === group.key ? "Stop audio" : "Play audio"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setShowListeningTranscript((prev) => ({
                          ...prev,
                          [group.key]: !prev[group.key],
                        }))
                      }
                    >
                      <Volume2 className="h-4 w-4" />
                      {showListeningTranscript[group.key] ? "Hide script" : "Show script"}
                    </Button>
                  </div>
                ) : null}
              </div>

              {group.content ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                    {group.content}
                  </p>
                </div>
              ) : null}

              {currentSection.key === "listening" &&
              group.audioScript &&
              showListeningTranscript[group.key] ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-400">
                    Audio script
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                    {group.audioScript}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                {group.questions.map((question, index) => (
                  <ObjectiveQuestionCard
                    key={question.id}
                    index={index + 1}
                    question={question}
                    value={objectiveAnswers[question.id] ?? ""}
                    revealed={isCurrentSectionRevealed}
                    onChange={handleObjectiveAnswer}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {currentSection.key === "writing" && (
        <div className="space-y-5">
          {currentSection.questions.map((question) => {
            const result = writingResults[question.id];
            const essay = writingResponses[question.id] ?? "";
            const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

            return (
              <section
                key={question.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                    {question.questionType === "task1"
                      ? t("ielts.writingTask1")
                      : t("ielts.writingTask2")}
                  </span>
                  {question.topic ? (
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      {question.topic}
                    </span>
                  ) : null}
                  {question.bandTarget ? (
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      Band {question.bandTarget}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  {question.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {question.prompt}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    {wordCount} words
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleEvaluateWriting(question)}
                    disabled={evaluatingQuestionId === question.id}
                  >
                    {evaluatingQuestionId === question.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Get AI evaluation
                  </Button>
                </div>

                <textarea
                  value={essay}
                  onChange={(event) =>
                    setWritingResponses((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }))
                  }
                  rows={14}
                  placeholder={t("ielts.wr.essayPlaceholder")}
                  className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                />

                {result ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-sm font-semibold text-emerald-400">
                      Band {result.overallBand}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {result.feedback.bandExplanation || result.feedback.detailedFeedback}
                    </p>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {currentSection.key === "speaking" && (
        <div className="space-y-5">
          {currentSection.questions.map((question) => {
            const result = speakingResults[question.id];
            const transcript = speakingResponses[question.id] ?? "";
            const cuePoints = question.content
              ? question.content.split("\n").map((item) => item.trim()).filter(Boolean)
              : [];

            return (
              <section
                key={question.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-400">
                    {question.questionType.toUpperCase()}
                  </span>
                  {question.topic ? (
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      {question.topic}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  {question.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {question.prompt}
                </p>

                {cuePoints.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      Cue points
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {cuePoints.map((item, index) => (
                        <li
                          key={`${question.id}-cue-${index}`}
                          className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4">
                  <SpeakingRecorderPanel
                    compact
                    onUseTranscript={(value) =>
                      setSpeakingResponses((prev) => ({
                        ...prev,
                        [question.id]: value,
                      }))
                    }
                  />
                </div>

                <textarea
                  value={transcript}
                  onChange={(event) =>
                    setSpeakingResponses((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }))
                  }
                  rows={8}
                  placeholder={t("ielts.sp.responsePlaceholder")}
                  className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-400 focus:ring-2 focus:ring-violet-500/40"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleEvaluateSpeaking(question)}
                    disabled={evaluatingQuestionId === question.id}
                  >
                    {evaluatingQuestionId === question.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Get AI evaluation
                  </Button>
                </div>

                {result ? (
                  <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <p className="text-sm font-semibold text-violet-400">
                      Band {result.overallBand}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {result.feedback.bandExplanation || result.feedback.detailedFeedback}
                    </p>
                    {extractFollowUps(result.feedback).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {extractFollowUps(result.feedback).map((item, index) => (
                          <span
                            key={`${question.id}-follow-${index}`}
                            className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {error ? <ErrorBanner message={error} /> : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleCompleteSection}>
          {activeSectionIndex === mock.sections.length - 1
            ? "Finish mock exam"
            : currentSection.key === "reading" || currentSection.key === "listening"
              ? "Check answers and continue"
              : "Continue to next section"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="secondary" onClick={() => setStage("configure")}>
          <RotateCcw className="h-4 w-4" />
          Exit and reconfigure
        </Button>
      </div>
    </div>
  );
}

function buildQuestionGroups(questions: IELTSQuestion[]): QuestionGroup[] {
  const groups = new Map<string, QuestionGroup>();

  for (const question of questions) {
    const key = question.questionGroup || question.id;
    const existing = groups.get(key);

    if (existing) {
      existing.questions.push(question);
      continue;
    }

    groups.set(key, {
      key,
      title: question.title,
      prompt: question.prompt,
      content: question.content,
      audioScript: question.audioScript,
      topic: question.topic,
      questions: [question],
    });
  }

  return Array.from(groups.values());
}

function averageBand(values?: Array<number | undefined>) {
  if (!values || values.length === 0) {
    return null;
  }

  const filtered = values.filter((item): item is number => typeof item === "number");
  if (filtered.length === 0) {
    return null;
  }

  const total = filtered.reduce((sum, value) => sum + value, 0);
  return total / filtered.length;
}

function computeObjectiveStats(
  questions: IELTSQuestion[],
  answers: Record<string, string>
) {
  const total = questions.length;
  let correct = 0;

  for (const question of questions) {
    const expected = normalizeAnswer(question.answer ?? "");
    const actual = normalizeAnswer(answers[question.id] ?? "");
    if (expected !== "" && expected === actual) {
      correct += 1;
    }
  }

  return {
    total,
    correct,
    percent: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatExamSetLabel(value: string) {
  if (value.startsWith("cambridge-")) {
    const [, book, marker, testNumber] = value.split("-");
    if (book && marker === "test" && testNumber) {
      return `Cambridge ${book} · Test ${testNumber}`;
    }
  }

  if (value.startsWith("predictions-")) {
    const [, year, marker, setNumber] = value.split("-");
    if (year && marker === "set" && setNumber) {
      return `Predictions ${year} · Set ${setNumber}`;
    }
  }

  return value.replace(/-/g, " ");
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function extractFollowUps(feedback?: SpeakingResult["feedback"]) {
  if (!feedback) {
    return [];
  }

  return Array.from(
    new Set(
      [...(feedback.followUpQuestions ?? []), feedback.followUpQuestion]
        .map((item) => item?.trim())
        .filter(Boolean) as string[]
    )
  );
}

function objectiveOptions(question: IELTSQuestion) {
  if (question.options && question.options.length > 0) {
    return question.options;
  }

  if (question.questionType === "true_false") {
    return ["true", "false", "not given"];
  }

  return [];
}

function SelectionCard({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition-all ${
        active
          ? "border-indigo-500/30 bg-indigo-500/5 shadow-[var(--surface-shadow)]"
          : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-indigo-500/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            active ? "border-indigo-500 bg-indigo-500" : "border-[var(--border)]"
          }`}
        >
          {active ? <CheckCircle2 className="h-3 w-3 text-white" /> : null}
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{body}</p>
        </div>
      </div>
    </button>
  );
}

function ScoreCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
      <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function ObjectiveQuestionCard({
  index,
  question,
  value,
  revealed,
  onChange,
}: {
  index: number;
  question: IELTSQuestion;
  value: string;
  revealed: boolean;
  onChange: (questionId: string, value: string) => void;
}) {
  const options = objectiveOptions(question);
  const isCorrect =
    revealed && normalizeAnswer(value) === normalizeAnswer(question.answer ?? "");

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Q{index}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {question.questionType.replace("_", " ")}
        </span>
        {revealed ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              isCorrect
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {isCorrect ? "Correct" : "Check answer"}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium leading-6 text-[var(--text-primary)]">
        {question.prompt}
      </p>

      {options.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onChange(question.id, option)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                value === option
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-500/20"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(question.id, event.target.value)}
          placeholder="Type your answer"
          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
        />
      )}

      {revealed ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Correct answer
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {question.answer}
          </p>
          {question.explanation ? (
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {question.explanation}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
